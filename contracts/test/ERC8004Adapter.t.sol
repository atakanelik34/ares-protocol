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

    address operator = address(0xA11CE);
    address other = address(0xB0B);

    function setUp() public {
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

        registry.setAdapterRole(address(identity), true);

        token.mint(operator, 1_000 ether);
        vm.startPrank(operator);
        token.approve(address(registry), type(uint256).max);
        vm.stopPrank();
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
            <REDACTED_PRIVATE_KEY>
        );
    }
}
