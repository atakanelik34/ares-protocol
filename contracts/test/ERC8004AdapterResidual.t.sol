// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../token/AresToken.sol";
import "../core/AresRegistry.sol";
import "../core/AresARIEngine.sol";
import "../core/AresScorecardLedger.sol";
import "../erc8004-adapters/ERC8004IdentityAdapter.sol";
import "../erc8004-adapters/ERC8004ReputationAdapter.sol";
import "../erc8004-adapters/ERC8004ValidationAdapter.sol";
import "../interfaces/erc8004-spec/IERC8004IdentityRegistry.sol";

contract MockValidationDispute is IAresDisputeAdapter {
    uint256 public nextId = 1;
    uint256 public finalized;
    function disputeActionFromAdapter(address, uint256, bytes32, uint256, string calldata) external override returns (uint256 disputeId) { disputeId = nextId++; }
    function validatorJoinFromAdapter(address, uint256, uint256) external override {}
    function voteFromAdapter(address, uint256, bool) external override {}
    function finalize(uint256 disputeId) external override { finalized = disputeId; }
}

contract ERC8004AdapterResidualTest is Test {
    uint256 internal scorerPk = 0x7878;
    address internal scorer;
    address internal operator = address(0xA11CE);
    address internal reviewer = address(0xB0B);
    address internal relayer = address(0xC0DE);

    function testBridgeFallsBackToCoreOperatorWhenWalletUnset() public {
        scorer = vm.addr(scorerPk);
        AresToken token = new AresToken(address(this), address(this));
        AresRegistry registry = new AresRegistry(address(this), address(this), token, 100 ether, 1 days);
        uint256[] memory decay = new uint256[](3);
        decay[0] = 1e18; decay[1] = 99e16; decay[2] = 9801e14;
        AresARIEngine engine = new AresARIEngine(address(this), address(this), registry, 0, decay);
        AresScorecardLedger ledger = new AresScorecardLedger(address(this), address(this), registry, engine);
        ERC8004IdentityAdapter identity = new ERC8004IdentityAdapter(address(this), address(this), IAresRegistryForAdapter(address(registry)));
        ERC8004ReputationAdapter reputation = new ERC8004ReputationAdapter(address(this), address(this), IIdentityAdapterView(address(identity)), IAresRegistryView(address(registry)), IAresLedgerWriter(address(ledger)));

        engine.grantRole(engine.LEDGER_ROLE(), address(ledger));
        ledger.setAuthorizedScorer(scorer, true);
        registry.setAdapterRole(address(identity), true);
        token.mint(operator, 1_000 ether);
        vm.prank(operator);
        token.approve(address(registry), type(uint256).max);

        IERC8004IdentityRegistry.MetadataEntry[] memory metadata = new IERC8004IdentityRegistry.MetadataEntry[](0);
        vm.prank(operator);
        uint256 agentId = identity.register("ipfs://adapter-agent", metadata);

        vm.prank(reviewer);
        uint256 feedbackId = reputation.giveFeedback(agentId, 10, 0, bytes32("ARES"), bytes32("SCORE"), "ipfs://feedback", bytes32(0));

        reputation.setBridgeFeedbackEnabled(true);
        reputation.setBridgeRelayer(relayer, true);

        bytes32 actionId = keccak256("fallback-operator");
        uint16[5] memory scores = [uint16(100), 101, 102, 103, 104];
        uint64 timestamp = uint64(block.timestamp);
        bytes memory sig = _sign(ledger, operator, actionId, scores, timestamp);

        vm.prank(relayer);
        reputation.bridgeFeedbackToScorecard(feedbackId, actionId, scores, timestamp, sig);

        (uint16[5] memory stored,, address recoveredScorer,) = ledger.getAction(agentId, actionId);
        assertEq(stored[0], 100);
        assertEq(recoveredScorer, scorer);
    }

    function testValidationAdapterFinalizeCanBeCalledByAnyone() public {
        MockValidationDispute dispute = new MockValidationDispute();
        ERC8004ValidationAdapter adapter = new ERC8004ValidationAdapter(address(this), address(this), dispute);

        vm.prank(address(0xABCD));
        uint256 requestId = adapter.validationRequest(7, keccak256("act"), "ipfs://r", 1 ether);

        vm.prank(address(0xDEAD));
        adapter.finalizeValidation(requestId);
        assertEq(dispute.finalized(), requestId);
    }

    function _sign(AresScorecardLedger ledger, address agent, bytes32 actionId, uint16[5] memory scores, uint64 timestamp) internal view returns (bytes memory) {
        bytes32 scoresHash = keccak256(abi.encode(scores[0], scores[1], scores[2], scores[3], scores[4]));
        bytes32 structHash = keccak256(abi.encode(ledger.ACTION_SCORE_TYPEHASH(), agent, actionId, scoresHash, timestamp));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", ledger.domainSeparator(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(scorerPk, digest);
        return abi.encodePacked(r, s, v);
    }
}
