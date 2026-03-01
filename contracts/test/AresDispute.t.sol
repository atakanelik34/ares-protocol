// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../token/AresToken.sol";
import "../core/AresRegistry.sol";
import "../core/AresARIEngine.sol";
import "../core/AresScorecardLedger.sol";
import "../core/AresDispute.sol";

contract AresDisputeTest is Test {
    AresToken token;
    AresRegistry registry;
    AresARIEngine engine;
    AresScorecardLedger ledger;
    AresDispute dispute;

    uint256 scorerPk = 0x777;
    address scorer;
    address operator = address(0x1111);
    address challenger = address(0x2222);
    address validator = address(0x3333);
    address outsider = address(0x4444);

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
            1 days,
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

        bytes32 actionId = keccak256("action-1");
        uint16[5] memory scores = [uint16(150), 150, 150, 150, 150];
        uint64 timestamp = uint64(block.timestamp);
        bytes memory sig = _sign(operator, actionId, scores, timestamp);
        ledger.recordActionScore(operator, actionId, scores, timestamp, sig);
    }

    function testFinalizeInvalidatesAction() public {
        uint256 agentId = registry.resolveAgentId(operator);
        bytes32 actionId = keccak256("action-1");

        vm.prank(challenger);
        uint256 disputeId = dispute.disputeAction(agentId, actionId, 10 ether, "ipfs://reason");

        vm.prank(validator);
        dispute.validatorJoin(disputeId, 10 ether);

        vm.prank(validator);
        dispute.vote(disputeId, true);

        vm.warp(block.timestamp + 1 days + 1);
        dispute.finalize(disputeId);

        (,,, IAresScorecardLedger.ActionStatus status) = ledger.getAction(agentId, actionId);
        assertEq(uint8(status), uint8(IAresScorecardLedger.ActionStatus.INVALID));
    }

    function testRejectedChallengeSlashesChallengerAndAllowsClaims() public {
        uint256 agentId = registry.resolveAgentId(operator);
        bytes32 actionId = keccak256("action-1");

        vm.prank(challenger);
        uint256 disputeId = dispute.disputeAction(agentId, actionId, 10 ether, "ipfs://reason");

        vm.prank(validator);
        dispute.validatorJoin(disputeId, 10 ether);

        vm.prank(validator);
        dispute.vote(disputeId, false);

        vm.warp(block.timestamp + 1 days + 1);
        dispute.finalize(disputeId);

        (,,, IAresScorecardLedger.ActionStatus status) = ledger.getAction(agentId, actionId);
        assertEq(uint8(status), uint8(IAresScorecardLedger.ActionStatus.VALID));
        assertEq(dispute.pendingWithdrawals(challenger), 9 ether);
        assertEq(dispute.pendingWithdrawals(validator), 11 ether);

        uint256 validatorBalanceBefore = token.balanceOf(validator);
        vm.prank(validator);
        dispute.claim();
        assertEq(token.balanceOf(validator), validatorBalanceBefore + 11 ether);
        assertEq(dispute.pendingWithdrawals(validator), 0);
    }

    function testVoteAndFinalizeGuardrails() public {
        uint256 agentId = registry.resolveAgentId(operator);
        bytes32 actionId = keccak256("action-1");

        vm.prank(challenger);
        uint256 disputeId = dispute.disputeAction(agentId, actionId, 10 ether, "ipfs://reason");

        vm.prank(validator);
        vm.expectRevert(AresDispute.NotValidator.selector);
        dispute.vote(disputeId, true);

        vm.prank(validator);
        dispute.validatorJoin(disputeId, 10 ether);

        vm.prank(validator);
        dispute.vote(disputeId, true);

        vm.prank(validator);
        vm.expectRevert(AresDispute.AlreadyVoted.selector);
        dispute.vote(disputeId, true);

        vm.expectRevert(AresDispute.VotingNotClosed.selector);
        dispute.finalize(disputeId);

        vm.warp(block.timestamp + 1 days + 1);
        dispute.finalize(disputeId);

        vm.expectRevert(AresDispute.AlreadyFinalized.selector);
        dispute.finalize(disputeId);

        vm.prank(outsider);
        vm.expectRevert(bytes("nothing to claim"));
        dispute.claim();
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
