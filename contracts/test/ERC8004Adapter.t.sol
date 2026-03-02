// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../token/AresToken.sol";
import "../core/AresRegistry.sol";
import "../core/AresARIEngine.sol";
import "../core/AresScorecardLedger.sol";
import "../erc8004-adapters/ERC8004IdentityAdapter.sol";
import "../erc8004-adapters/ERC8004ReputationAdapter.sol";
import "../interfaces/erc8004-spec/IERC8004IdentityRegistry.sol";
import "../interfaces/erc8004-spec/IERC8004ReputationRegistry.sol";
import "../interfaces/erc8004-spec/IERC8004ValidationRegistry.sol";

contract ERC8004AdapterTest is Test {
    AresToken token;
    AresRegistry registry;
    AresARIEngine engine;
    AresScorecardLedger ledger;
    ERC8004IdentityAdapter identity;
    ERC8004ReputationAdapter reputation;

    uint256 scorerPk = 0x777;
    address scorer;
    address operator = address(0xA11CE);
    address other = address(0xB0B);
    address relayer = address(0xC0DE);

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

        identity = new ERC8004IdentityAdapter(address(this), address(this), IAresRegistryForAdapter(address(registry)));
        reputation = new ERC8004ReputationAdapter(
            address(this), address(this), IIdentityAdapterView(address(identity)), IAresRegistryView(address(registry)), IAresLedgerWriter(address(ledger))
        );

        engine.grantRole(engine.LEDGER_ROLE(), address(ledger));
        ledger.setAuthorizedScorer(scorer, true);
        registry.setAdapterRole(address(identity), true);

        token.mint(operator, 1_000 ether);
        vm.startPrank(operator);
        token.approve(address(registry), type(uint256).max);
        vm.stopPrank();
    }

    function testAdapterConstructorGuardrails() public {
        vm.expectRevert("invalid admin");
        new ERC8004IdentityAdapter(address(0), address(this), IAresRegistryForAdapter(address(registry)));

        vm.expectRevert("invalid governance");
        new ERC8004IdentityAdapter(address(this), address(0), IAresRegistryForAdapter(address(registry)));

        vm.expectRevert("invalid registry");
        new ERC8004IdentityAdapter(address(this), address(this), IAresRegistryForAdapter(address(0)));

        vm.expectRevert("invalid admin");
        new ERC8004ReputationAdapter(
            address(0),
            address(this),
            IIdentityAdapterView(address(identity)),
            IAresRegistryView(address(registry)),
            IAresLedgerWriter(address(ledger))
        );

        vm.expectRevert("invalid governance");
        new ERC8004ReputationAdapter(
            address(this),
            address(0),
            IIdentityAdapterView(address(identity)),
            IAresRegistryView(address(registry)),
            IAresLedgerWriter(address(ledger))
        );

        vm.expectRevert("invalid identity");
        new ERC8004ReputationAdapter(
            address(this),
            address(this),
            IIdentityAdapterView(address(0)),
            IAresRegistryView(address(registry)),
            IAresLedgerWriter(address(ledger))
        );

        vm.expectRevert("invalid registry");
        new ERC8004ReputationAdapter(
            address(this),
            address(this),
            IIdentityAdapterView(address(identity)),
            IAresRegistryView(address(0)),
            IAresLedgerWriter(address(ledger))
        );

        vm.expectRevert("invalid ledger");
        new ERC8004ReputationAdapter(
            address(this),
            address(this),
            IIdentityAdapterView(address(identity)),
            IAresRegistryView(address(registry)),
            IAresLedgerWriter(address(0))
        );
    }

    function testIdentityAdapterRegisterAndDesyncBadge() public {
        IERC8004IdentityRegistry.MetadataEntry[] memory metadata = new IERC8004IdentityRegistry.MetadataEntry[](1);
        metadata[0] = IERC8004IdentityRegistry.MetadataEntry({key: bytes32("name"), value: bytes("agent")});

        vm.prank(operator);
        uint256 agentId = identity.register("ipfs://adapter-agent", metadata);

        assertEq(agentId, 1);
        assertEq(identity.coreAgentIdOf(agentId), 1);
        assertEq(identity.ownerOf(agentId), operator);
        assertEq(registry.resolveAgentId(operator), 1);

        vm.prank(operator);
        identity.transferFrom(operator, other, agentId);

        assertTrue(identity.isDesynced(agentId));
    }

    function testReputationAdapterBlocksOwnerFeedback() public {
        IERC8004IdentityRegistry.MetadataEntry[] memory metadata = new IERC8004IdentityRegistry.MetadataEntry[](0);
        vm.prank(operator);
        uint256 agentId = identity.register("ipfs://adapter-agent", metadata);

        vm.prank(operator);
        vm.expectRevert("submitter is owner");
        reputation.giveFeedback(agentId, 10, 0, bytes32("ARES"), bytes32("ARI"), "ipfs://feedback", bytes32(0));
    }

    function testIdentityAdapterMetadataUriWalletAndApprovalPaths() public {
        IERC8004IdentityRegistry.MetadataEntry[] memory metadata = new IERC8004IdentityRegistry.MetadataEntry[](1);
        metadata[0] = IERC8004IdentityRegistry.MetadataEntry({key: bytes32("name"), value: bytes("agent")});

        vm.prank(operator);
        uint256 agentId = identity.register("ipfs://adapter-agent", metadata);

        IERC8004IdentityRegistry.MetadataEntry[] memory initial = identity.getMetadata(agentId);
        assertEq(initial.length, 1);
        assertEq(initial[0].key, bytes32("name"));
        assertEq(initial[0].value, bytes("agent"));

        IERC8004IdentityRegistry.MetadataEntry[] memory updated = new IERC8004IdentityRegistry.MetadataEntry[](2);
        updated[0] = IERC8004IdentityRegistry.MetadataEntry({key: bytes32("name"), value: bytes("agent-v2")});
        updated[1] = IERC8004IdentityRegistry.MetadataEntry({key: bytes32("region"), value: bytes("base")});

        vm.prank(operator);
        identity.setMetadata(agentId, updated);

        vm.prank(operator);
        identity.setAgentURI(agentId, "ipfs://adapter-agent-v2");
        assertEq(identity.agentURI(agentId), "ipfs://adapter-agent-v2");

        vm.prank(operator);
        identity.setAgentWallet(agentId, other);
        assertEq(identity.getAgentWallet(agentId), other);

        vm.prank(operator);
        identity.approve(other, agentId);

        vm.prank(other);
        identity.setAgentURI(agentId, "ipfs://adapter-agent-v3");
        assertEq(identity.agentURI(agentId), "ipfs://adapter-agent-v3");

        vm.prank(other);
        identity.unsetAgentWallet(agentId);
        assertEq(identity.getAgentWallet(agentId), address(0));

        vm.prank(operator);
        identity.setApprovalForAll(other, true);

        IERC8004IdentityRegistry.MetadataEntry[] memory finalMeta = new IERC8004IdentityRegistry.MetadataEntry[](1);
        finalMeta[0] = IERC8004IdentityRegistry.MetadataEntry({key: bytes32("status"), value: bytes("approved")});
        vm.prank(other);
        identity.setMetadata(agentId, finalMeta);

        IERC8004IdentityRegistry.MetadataEntry[] memory snapshot = identity.getMetadata(agentId);
        assertEq(snapshot.length, 3);
        assertEq(snapshot[0].value, bytes("agent-v2"));
        assertEq(snapshot[1].value, bytes("base"));
        assertEq(snapshot[2].value, bytes("approved"));
    }

    function testIdentityAdapterRejectsUnauthorizedMutations() public {
        IERC8004IdentityRegistry.MetadataEntry[] memory metadata = new IERC8004IdentityRegistry.MetadataEntry[](0);
        vm.prank(operator);
        uint256 agentId = identity.register("ipfs://adapter-agent", metadata);

        vm.prank(other);
        vm.expectRevert("not owner/approved");
        identity.setAgentURI(agentId, "ipfs://bad");

        IERC8004IdentityRegistry.MetadataEntry[] memory updated = new IERC8004IdentityRegistry.MetadataEntry[](1);
        updated[0] = IERC8004IdentityRegistry.MetadataEntry({key: bytes32("name"), value: bytes("bad")});

        vm.prank(other);
        vm.expectRevert("not owner/approved");
        identity.setMetadata(agentId, updated);

        vm.prank(other);
        vm.expectRevert("not owner/approved");
        identity.setAgentWallet(agentId, other);

        vm.prank(other);
        vm.expectRevert("not owner/approved");
        identity.unsetAgentWallet(agentId);
    }

    function testIdentityAdapterViewDefaultsAndDuplicateMetadataKeys() public {
        assertEq(identity.coreOperatorOf(999), address(0));
        assertFalse(identity.isDesynced(999));

        IERC8004IdentityRegistry.MetadataEntry[] memory metadata = new IERC8004IdentityRegistry.MetadataEntry[](2);
        metadata[0] = IERC8004IdentityRegistry.MetadataEntry({key: bytes32("name"), value: bytes("v1")});
        metadata[1] = IERC8004IdentityRegistry.MetadataEntry({key: bytes32("name"), value: bytes("v2")});

        vm.prank(operator);
        uint256 agentId = identity.register("ipfs://adapter-agent", metadata);

        IERC8004IdentityRegistry.MetadataEntry[] memory snapshot = identity.getMetadata(agentId);
        assertEq(snapshot.length, 1);
        assertEq(snapshot[0].key, bytes32("name"));
        assertEq(snapshot[0].value, bytes("v2"));
        assertEq(identity.coreOperatorOf(agentId), operator);
        assertFalse(identity.isDesynced(agentId));
    }

    function testReputationAdapterBlocksApprovedOperatorsAndBridgingGuardrails() public {
        IERC8004IdentityRegistry.MetadataEntry[] memory metadata = new IERC8004IdentityRegistry.MetadataEntry[](0);
        vm.prank(operator);
        uint256 agentId = identity.register("ipfs://adapter-agent", metadata);

        vm.prank(operator);
        identity.approve(other, agentId);

        vm.prank(other);
        vm.expectRevert("submitter is approved operator");
        reputation.giveFeedback(agentId, 5, 0, bytes32("ARES"), bytes32("ARI"), "ipfs://feedback", bytes32(0));

        vm.prank(relayer);
        vm.expectRevert("bridge disabled");
        reputation.bridgeFeedbackToScorecard(1, keccak256("missing"), [uint16(1), 1, 1, 1, 1], uint64(block.timestamp), "");

        reputation.setBridgeFeedbackEnabled(true);

        vm.prank(relayer);
        vm.expectRevert("not relayer");
        reputation.bridgeFeedbackToScorecard(1, keccak256("missing"), [uint16(1), 1, 1, 1, 1], uint64(block.timestamp), "");

        reputation.setBridgeRelayer(relayer, true);

        vm.prank(relayer);
        vm.expectRevert("feedback not found");
        reputation.bridgeFeedbackToScorecard(999, keccak256("missing"), [uint16(1), 1, 1, 1, 1], uint64(block.timestamp), "");
    }

    function testReputationAdapterStoresFeedbackAndBridgesToLedger() public {
        IERC8004IdentityRegistry.MetadataEntry[] memory metadata = new IERC8004IdentityRegistry.MetadataEntry[](0);
        vm.prank(operator);
        uint256 agentId = identity.register("ipfs://adapter-agent", metadata);

        vm.prank(other);
        uint256 feedbackId = reputation.giveFeedback(
            agentId,
            42,
            0,
            bytes32("ARES"),
            bytes32("SCORECARD"),
            "ipfs://feedback",
            keccak256(bytes("ipfs://feedback"))
        );

        IERC8004ReputationRegistry.Feedback memory feedback = reputation.getFeedback(feedbackId);
        assertEq(feedback.agentId, agentId);
        assertEq(feedback.submitter, other);
        assertEq(feedback.feedbackURI, "ipfs://feedback");

        reputation.setBridgeFeedbackEnabled(true);
        reputation.setBridgeRelayer(relayer, true);
        reputation.setBridgeRelayer(operator, true);

        {
            bytes32 ownerActionId = keccak256("action-owner");
            uint16[5] memory ownerScores = [uint16(150), 149, 148, 147, 146];
            bytes memory ownerSig = _sign(operator, ownerActionId, ownerScores, uint64(block.timestamp));

            vm.prank(operator);
            vm.expectRevert("relayer cannot be owner/operator");
            reputation.bridgeFeedbackToScorecard(
                feedbackId,
                ownerActionId,
                ownerScores,
                uint64(block.timestamp),
                ownerSig
            );
        }

        vm.prank(other);
        uint256 mismatchFeedbackId = reputation.giveFeedback(
            agentId,
            7,
            0,
            bytes32("ARES"),
            bytes32("BADHASH"),
            "ipfs://tampered",
            bytes32("wrong")
        );

        {
            bytes32 mismatchActionId = keccak256("action-mismatch");
            uint16[5] memory mismatchScores = [uint16(120), 121, 122, 123, 124];
            bytes memory mismatchSig = _sign(operator, mismatchActionId, mismatchScores, uint64(block.timestamp));

            vm.prank(relayer);
            vm.expectRevert("evidence mismatch");
            reputation.bridgeFeedbackToScorecard(
                mismatchFeedbackId,
                mismatchActionId,
                mismatchScores,
                uint64(block.timestamp),
                mismatchSig
            );
        }

        bytes32 actionId = keccak256("action-bridge");
        uint16[5] memory scores = [uint16(160), 150, 140, 130, 120];
        uint64 timestamp = uint64(block.timestamp);
        bytes memory signature = _sign(operator, actionId, scores, timestamp);

        vm.prank(relayer);
        reputation.bridgeFeedbackToScorecard(feedbackId, actionId, scores, timestamp, signature);

        (uint16[5] memory storedScores,, address scorerAddr, IAresScorecardLedger.ActionStatus status) =
            ledger.getAction(agentId, actionId);
        assertEq(storedScores[0], 160);
        assertEq(scorerAddr, scorer);
        assertEq(uint8(status), uint8(IAresScorecardLedger.ActionStatus.VALID));
    }

    function testIdentityAdapterSupportsERC8004Interface() public view {
        bytes4 interfaceId = type(IERC8004IdentityRegistry).interfaceId;
        assertTrue(identity.supportsInterface(interfaceId));
    }

    function testReputationAdapterSelectorSnapshot() public pure {
        assertEq(
            IERC8004ReputationRegistry.giveFeedback.selector,
            bytes4(keccak256("giveFeedback(uint256,int128,uint8,bytes32,bytes32,string,bytes32)"))
        );
    }

    function testIdentityAndValidationSelectorSnapshot() public pure {
        assertEq(
            IERC8004IdentityRegistry.register.selector,
            bytes4(keccak256("register(string,(bytes32,bytes)[])"))
        );
        assertEq(
            IERC8004ValidationRegistry.validationRequest.selector,
            bytes4(keccak256("validationRequest(uint256,bytes32,string,uint256)"))
        );
        assertEq(
            keccak256("Registered(address,uint256,string)"),
            bytes32(0x6cbc388989dfabc5be9f5fcbe5da02f3df0c392b42fcda0a88fa4bc9d39c12c7)
        );
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
