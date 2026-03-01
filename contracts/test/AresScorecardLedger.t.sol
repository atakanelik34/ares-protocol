// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../token/AresToken.sol";
import "../core/AresRegistry.sol";
import "../core/AresARIEngine.sol";
import "../core/AresScorecardLedger.sol";

contract AresScorecardLedgerTest is Test {
    AresToken token;
    AresRegistry registry;
    AresARIEngine engine;
    AresScorecardLedger ledger;

    uint256 scorerPk = 0xA11CE;
    address scorer;
    address operator = address(0x1234);

    function setUp() public {
        scorer = vm.addr(scorerPk);

        token = new AresToken(address(this), address(this));
        registry = new AresRegistry(address(this), address(this), token, 100 ether, 1 days);

        uint256[] memory decay = new uint256[](3);
        decay[0] = 1e18;
        decay[1] = 990000000000000000;
        decay[2] = 980100000000000000;
        engine = new AresARIEngine(address(this), address(this), registry, 0, decay);

        ledger = new AresScorecardLedger(address(this), address(this), registry, engine);

        engine.grantRole(engine.LEDGER_ROLE(), address(ledger));
        ledger.setAuthorizedScorer(scorer, true);

        token.mint(operator, 1_000 ether);
        vm.startPrank(operator);
        token.approve(address(registry), type(uint256).max);
        registry.registerAgent(operator, "ipfs://agent", bytes32("meta"));
        vm.stopPrank();
    }

    function testRecordActionScore() public {
        address agent = operator;
        bytes32 actionId = keccak256("action-1");
        uint16[5] memory scores = [uint16(150), 140, 130, 120, 110];
        uint64 timestamp = uint64(block.timestamp);
        bytes memory sig = _sign(agent, actionId, scores, timestamp);

        ledger.recordActionScore(agent, actionId, scores, timestamp, sig);

        uint256 agentId = registry.resolveAgentId(agent);
        (, uint64 ts, address scorerAddr, IAresScorecardLedger.ActionStatus status) = ledger.getAction(agentId, actionId);
        assertEq(ts, timestamp);
        assertEq(scorerAddr, scorer);
        assertEq(uint8(status), uint8(IAresScorecardLedger.ActionStatus.VALID));
    }

    function testRevertOnScoreOutOfRange() public {
        address agent = operator;
        bytes32 actionId = keccak256("action-invalid");
        uint16[5] memory scores = [uint16(201), 100, 100, 100, 100];
        uint64 timestamp = uint64(block.timestamp);
        bytes memory sig = _sign(agent, actionId, scores, timestamp);

        vm.expectRevert(AresScorecardLedger.InvalidScoreRange.selector);
        ledger.recordActionScore(agent, actionId, scores, timestamp, sig);
    }

    function testRejectsUnauthorizedAndDuplicateScores() public {
        address agent = operator;
        bytes32 actionId = keccak256("action-dup");
        uint16[5] memory scores = [uint16(120), 119, 118, 117, 116];
        uint64 timestamp = uint64(block.timestamp);
        bytes memory sig = _sign(agent, actionId, scores, timestamp);

        ledger.recordActionScore(agent, actionId, scores, timestamp, sig);

        vm.expectRevert(AresScorecardLedger.ActionAlreadyRecorded.selector);
        ledger.recordActionScore(agent, actionId, scores, timestamp, sig);

        bytes32 actionId2 = keccak256("action-unauthorized");
        bytes memory badSig = _sign(agent, actionId2, scores, timestamp + 1);
        ledger.setAuthorizedScorer(scorer, false);

        vm.expectRevert(AresScorecardLedger.InvalidSignature.selector);
        ledger.recordActionScore(agent, actionId2, scores, timestamp + 1, badSig);
    }

    function testRejectsTamperedTypedDataPayloads() public {
        address agent = operator;
        bytes32 actionId = keccak256("action-tamper");
        uint16[5] memory scores = [uint16(101), 102, 103, 104, 105];
        uint64 timestamp = uint64(block.timestamp);

        bytes memory sig = _sign(agent, actionId, scores, timestamp);

        vm.expectRevert(AresScorecardLedger.InvalidSignature.selector);
        ledger.recordActionScore(agent, actionId, scores, timestamp + 1, sig);

        bytes memory sig2 = _sign(agent, actionId, scores, timestamp);
        vm.expectRevert(AresScorecardLedger.InvalidSignature.selector);
        ledger.recordActionScore(agent, keccak256("action-tamper-2"), scores, timestamp, sig2);

        uint16[5] memory alteredScores = [uint16(111), 112, 113, 114, 115];
        bytes memory sig3 = _sign(agent, actionId, scores, timestamp);
        vm.expectRevert(AresScorecardLedger.InvalidSignature.selector);
        ledger.recordActionScore(agent, actionId, alteredScores, timestamp, sig3);
    }

    function testRejectsUnregisteredAgentAndMissingAction() public {
        address unknown = address(0x9999);
        bytes32 actionId = keccak256("action-missing-agent");
        uint16[5] memory scores = [uint16(110), 110, 110, 110, 110];
        uint64 timestamp = uint64(block.timestamp);
        bytes memory sig = _sign(unknown, actionId, scores, timestamp);

        vm.expectRevert(AresScorecardLedger.AgentNotRegistered.selector);
        ledger.recordActionScore(unknown, actionId, scores, timestamp, sig);
    }

    function testInvalidateGuardrailsAndDisputeRole() public {
        uint256 agentId = registry.resolveAgentId(operator);
        bytes32 actionId = keccak256("action-invalidate");
        uint16[5] memory scores = [uint16(115), 116, 117, 118, 119];
        uint64 timestamp = uint64(block.timestamp);
        bytes memory sig = _sign(operator, actionId, scores, timestamp);

        ledger.recordActionScore(operator, actionId, scores, timestamp, sig);

        vm.expectRevert();
        ledger.invalidateAction(agentId, actionId);

        ledger.grantRole(ledger.DISPUTE_ROLE(), address(this));
        ledger.invalidateAction(agentId, actionId);

        vm.expectRevert(AresScorecardLedger.ActionAlreadyInvalid.selector);
        ledger.invalidateAction(agentId, actionId);

        vm.expectRevert(AresScorecardLedger.ActionNotFound.selector);
        ledger.invalidateAction(agentId, keccak256("missing-action"));
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
