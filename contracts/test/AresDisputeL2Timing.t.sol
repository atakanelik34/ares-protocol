// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../token/AresToken.sol";
import "../core/AresRegistry.sol";
import "../core/AresARIEngine.sol";
import "../core/AresScorecardLedger.sol";
import "../core/AresDispute.sol";
import "../interfaces/IAresScorecardLedger.sol";

contract AresDisputeL2TimingTest is Test {
    uint64 internal constant MAINNET_TARGET_VOTING_PERIOD = 14 days;

    AresToken internal token;
    AresRegistry internal registry;
    AresARIEngine internal engine;
    AresScorecardLedger internal ledger;
    AresDispute internal dispute;

    uint256 internal scorerPk = 0x888;
    address internal scorer;
    address internal operator = address(0x1111);
    address internal challenger = address(0x2222);
    address internal validator = address(0x3333);
    address internal finalizer = address(0x4444);

    function setUp() public {
        scorer = vm.addr(scorerPk);

        token = new AresToken(address(this), address(this));
        registry = new AresRegistry(address(this), address(this), token, 100 ether, 1 days);

        uint256[] memory decay = new uint256[](5);
        decay[0] = 1e18;
        decay[1] = 990000000000000000;
        decay[2] = 980100000000000000;
        decay[3] = 970299000000000000;
        decay[4] = 960596010000000000;
        engine = new AresARIEngine(address(this), address(this), registry, 0, decay);
        ledger = new AresScorecardLedger(address(this), address(this), registry, engine);
        dispute = new AresDispute(
            address(this),
            address(this),
            token,
            ledger,
            engine,
            address(this),
            10 ether,
            5 ether,
            MAINNET_TARGET_VOTING_PERIOD,
            1,
            1000
        );

        engine.grantRole(engine.LEDGER_ROLE(), address(ledger));
        engine.grantRole(engine.DISPUTE_ROLE(), address(dispute));
        ledger.grantRole(ledger.DISPUTE_ROLE(), address(dispute));
        ledger.setAuthorizedScorer(scorer, true);

        token.mint(operator, 1_000 ether);
        token.mint(challenger, 1_000 ether);
        token.mint(validator, 1_000 ether);

        vm.startPrank(operator);
        token.approve(address(registry), type(uint256).max);
        registry.registerAgent(operator, "ipfs://agent", bytes32("meta"));
        vm.stopPrank();

        vm.prank(challenger);
        token.approve(address(dispute), type(uint256).max);
        vm.prank(validator);
        token.approve(address(dispute), type(uint256).max);

        bytes32 actionId = keccak256("timing-action-1");
        uint16[5] memory scores = [uint16(150), 150, 150, 150, 150];
        uint64 timestamp = uint64(block.timestamp);
        bytes memory sig = _sign(operator, actionId, scores, timestamp);
        ledger.recordActionScore(operator, actionId, scores, timestamp, sig);
    }

    function testVoteAtDeadlineMinusOneSucceedsAndFinalizeAfterDeadlineAccepts() public {
        (uint256 disputeId,) = _openAndJoin();

        vm.warp(block.timestamp + MAINNET_TARGET_VOTING_PERIOD - 1);
        vm.prank(validator);
        dispute.vote(disputeId, true);

        vm.warp(block.timestamp + 1);
        vm.prank(finalizer);
        dispute.finalize(disputeId);

        AresDispute.Dispute memory d = dispute.getDispute(disputeId);
        assertTrue(d.finalized);
        assertTrue(d.accepted);
    }

    function testVoteAtExactDeadlineRevertsAndFinalizeCanProceed() public {
        (uint256 disputeId, bytes32 actionId) = _openAndJoin();

        vm.warp(block.timestamp + MAINNET_TARGET_VOTING_PERIOD);
        vm.prank(validator);
        vm.expectRevert(AresDispute.VotingClosed.selector);
        dispute.vote(disputeId, true);

        vm.prank(finalizer);
        dispute.finalize(disputeId);

        (,,, IAresScorecardLedger.ActionStatus status) = ledger.getAction(registry.resolveAgentId(operator), actionId);
        assertEq(uint8(status), uint8(IAresScorecardLedger.ActionStatus.VALID));
    }

    function testNoInclusionFinalHourLeavesLateVoteOutOfWindow() public {
        _assertMissedWindow(1 hours);
    }

    function testNoInclusionFinalSixHoursLeavesLateVoteOutOfWindow() public {
        _assertMissedWindow(6 hours);
    }

    function testNoInclusionFinalTwentyFourHoursLeavesLateVoteOutOfWindow() public {
        _assertMissedWindow(24 hours);
    }

    function testFinalizationBeforeDelayedVoteInclusionLocksOutcome() public {
        (uint256 disputeId, bytes32 actionId) = _openAndJoin();

        vm.warp(block.timestamp + MAINNET_TARGET_VOTING_PERIOD + 1);
        vm.prank(finalizer);
        dispute.finalize(disputeId);

        vm.prank(validator);
        vm.expectRevert(AresDispute.VotingClosed.selector);
        dispute.vote(disputeId, true);

        AresDispute.Dispute memory d = dispute.getDispute(disputeId);
        assertTrue(d.finalized);
        assertFalse(d.accepted);

        (,,, IAresScorecardLedger.ActionStatus status) = ledger.getAction(registry.resolveAgentId(operator), actionId);
        assertEq(uint8(status), uint8(IAresScorecardLedger.ActionStatus.VALID));
    }

    function testFourteenDayWindowStillAllowsVoteAfterOneDaySequencerGap() public {
        (uint256 disputeId,) = _openAndJoin();

        vm.warp(block.timestamp + 13 days);
        vm.prank(validator);
        dispute.vote(disputeId, true);

        vm.warp(block.timestamp + 1 days + 1);
        vm.prank(finalizer);
        dispute.finalize(disputeId);

        AresDispute.Dispute memory d = dispute.getDispute(disputeId);
        assertTrue(d.accepted);
    }

    function _assertMissedWindow(uint256 noInclusionWindow) internal {
        (uint256 disputeId, bytes32 actionId) = _openAndJoin();

        vm.warp(block.timestamp + MAINNET_TARGET_VOTING_PERIOD - noInclusionWindow);
        vm.warp(block.timestamp + noInclusionWindow + 1);

        vm.prank(validator);
        vm.expectRevert(AresDispute.VotingClosed.selector);
        dispute.vote(disputeId, true);

        vm.prank(finalizer);
        dispute.finalize(disputeId);

        AresDispute.Dispute memory d = dispute.getDispute(disputeId);
        assertTrue(d.finalized);
        assertFalse(d.accepted);

        (,,, IAresScorecardLedger.ActionStatus status) = ledger.getAction(registry.resolveAgentId(operator), actionId);
        assertEq(uint8(status), uint8(IAresScorecardLedger.ActionStatus.VALID));
    }

    function _openAndJoin() internal returns (uint256 disputeId, bytes32 actionId) {
        uint256 agentId = registry.resolveAgentId(operator);
        actionId = keccak256("timing-action-1");

        vm.prank(challenger);
        disputeId = dispute.disputeAction(agentId, actionId, 10 ether, "ipfs://timing-reason");

        vm.prank(validator);
        dispute.validatorJoin(disputeId, 10 ether);
    }

    function _sign(address agent, bytes32 actionId, uint16[5] memory scores, uint64 timestamp)
        internal
        view
        returns (bytes memory)
    {
        bytes32 scoresHash = keccak256(abi.encode(scores[0], scores[1], scores[2], scores[3], scores[4]));
        bytes32 structHash = keccak256(
            abi.encode(ledger.ACTION_SCORE_TYPEHASH(), agent, actionId, scoresHash, timestamp)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", ledger.domainSeparator(), structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(scorerPk, digest);
        return abi.encodePacked(r, s, v);
    }
}
