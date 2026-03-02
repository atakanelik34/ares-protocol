// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../token/AresToken.sol";
import "../core/AresRegistry.sol";
import "../core/AresARIEngine.sol";
import "../core/AresScorecardLedger.sol";
import "../core/AresDispute.sol";

contract AresDisputeSettlementRandomizedTest is Test {
    struct Env {
        AresToken token;
        AresRegistry registry;
        AresARIEngine engine;
        AresScorecardLedger ledger;
        AresDispute dispute;
    }

    uint256 internal scorerPk = 0x9191;
    address internal scorer;
    address internal operator = address(0x1111);
    address internal challenger = address(0x2222);
    address internal validatorA = address(0x3333);
    address internal validatorB = address(0x4444);
    address internal treasury = address(0x5555);

    function testFuzzFinalizeConservesEscrow(bool accepted, uint96 rawChallenge, uint96 rawStakeA, uint96 rawStakeB, uint16 rawSlashBps) public {
        scorer = vm.addr(scorerPk);
        uint16 slashBps = uint16(bound(uint256(rawSlashBps), 0, 4_000));
        Env memory env = _deployEnv(slashBps);
        _seedParticipants(env.token);
        _registerAndScore(env);

        uint256 challengeStake = bound(uint256(rawChallenge), 10 ether, 100 ether);
        uint256 stakeA = bound(uint256(rawStakeA), 5 ether, 100 ether);
        uint256 stakeB = bound(uint256(rawStakeB), 5 ether, 100 ether);

        uint256 agentId = env.registry.resolveAgentId(operator);
        bytes32 actionId = keccak256("rand-action");
        vm.prank(challenger);
        uint256 disputeId = env.dispute.disputeAction(agentId, actionId, challengeStake, "ipfs://reason");

        vm.prank(validatorA);
        env.dispute.validatorJoin(disputeId, stakeA);
        vm.prank(validatorB);
        env.dispute.validatorJoin(disputeId, stakeB);

        vm.prank(validatorA);
        env.dispute.vote(disputeId, accepted);
        vm.prank(validatorB);
        env.dispute.vote(disputeId, !accepted);

        vm.warp(block.timestamp + env.dispute.votingPeriod() + 1);
        env.dispute.finalize(disputeId);

        uint256 contractBalance = env.token.balanceOf(address(env.dispute));
        uint256 pendingTotal = env.dispute.pendingWithdrawals(challenger)
            + env.dispute.pendingWithdrawals(validatorA)
            + env.dispute.pendingWithdrawals(validatorB)
            + env.dispute.pendingWithdrawals(treasury);

        assertEq(contractBalance, pendingTotal);

        uint256 before = _trackedBalances(env.token);
        vm.prank(challenger); env.dispute.claim();
        vm.prank(validatorA); env.dispute.claim();
        vm.prank(validatorB); env.dispute.claim();
        uint256 treasuryPending = env.dispute.pendingWithdrawals(treasury);
        if (treasuryPending > 0) {
            vm.prank(treasury); env.dispute.claim();
        }
        uint256 afterBalances = _trackedBalances(env.token);
        assertEq(afterBalances - before, challengeStake + stakeA + stakeB);
        assertEq(env.token.balanceOf(address(env.dispute)), 0);
    }

    function _deployEnv(uint16 slashBps) internal returns (Env memory env) {
        env.token = new AresToken(address(this), address(this));
        env.registry = new AresRegistry(address(this), address(this), env.token, 100 ether, 1 days);

        uint256[] memory decay = new uint256[](3);
        decay[0] = 1e18;
        decay[1] = 99e16;
        decay[2] = 9801e14;

        env.engine = new AresARIEngine(address(this), address(this), env.registry, 0, decay);
        env.ledger = new AresScorecardLedger(address(this), address(this), env.registry, env.engine);
        env.dispute = new AresDispute(
            address(this), address(this), env.token, env.ledger, env.engine, treasury, 10 ether, 5 ether, 3 days, 1, slashBps
        );

        env.engine.grantRole(env.engine.LEDGER_ROLE(), address(env.ledger));
        env.engine.grantRole(env.engine.DISPUTE_ROLE(), address(env.dispute));
        env.ledger.grantRole(env.ledger.DISPUTE_ROLE(), address(env.dispute));
        env.ledger.setAuthorizedScorer(scorer, true);
    }

    function _seedParticipants(AresToken token) internal {
        token.mint(operator, 1_000 ether);
        token.mint(challenger, 1_000 ether);
        token.mint(validatorA, 1_000 ether);
        token.mint(validatorB, 1_000 ether);
    }

    function _registerAndScore(Env memory env) internal {
        vm.startPrank(operator);
        env.token.approve(address(env.registry), type(uint256).max);
        env.registry.registerAgent(operator, "ipfs://agent", bytes32("meta"));
        vm.stopPrank();

        vm.prank(challenger);
        env.token.approve(address(env.dispute), type(uint256).max);
        vm.prank(validatorA);
        env.token.approve(address(env.dispute), type(uint256).max);
        vm.prank(validatorB);
        env.token.approve(address(env.dispute), type(uint256).max);

        bytes32 actionId = keccak256("rand-action");
        uint16[5] memory scores = [uint16(150), 140, 130, 120, 110];
        uint64 timestamp = uint64(block.timestamp);
        bytes memory sig = _sign(env.ledger, operator, actionId, scores, timestamp);
        env.ledger.recordActionScore(operator, actionId, scores, timestamp, sig);
    }

    function _trackedBalances(AresToken token) internal view returns (uint256) {
        return token.balanceOf(challenger) + token.balanceOf(validatorA) + token.balanceOf(validatorB) + token.balanceOf(treasury);
    }

    function _sign(AresScorecardLedger ledger, address agent, bytes32 actionId, uint16[5] memory scores, uint64 timestamp) internal view returns (bytes memory) {
        bytes32 scoresHash = keccak256(abi.encode(scores[0], scores[1], scores[2], scores[3], scores[4]));
        bytes32 structHash = keccak256(abi.encode(ledger.ACTION_SCORE_TYPEHASH(), agent, actionId, scoresHash, timestamp));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", ledger.domainSeparator(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(scorerPk, digest);
        return abi.encodePacked(r, s, v);
    }
}
