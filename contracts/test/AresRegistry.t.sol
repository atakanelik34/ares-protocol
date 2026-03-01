// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../token/AresToken.sol";
import "../core/AresRegistry.sol";

contract AresRegistryTest is Test {
    AresToken token;
    AresRegistry registry;

    address admin = address(this);
    address governance = address(0xBEEF);
    address operator = address(0xA11CE);
    address wallet = address(0xCAFE);

    function setUp() public {
        token = new AresToken(admin, admin);
        registry = new AresRegistry(admin, governance, token, 100 ether, 2 days);

        token.mint(operator, 1_000 ether);

        vm.startPrank(operator);
        token.approve(address(registry), type(uint256).max);
        vm.stopPrank();
    }

    function testStakeLifecycleAndWalletLinking() public {
        vm.prank(operator);
        uint256 agentId = registry.registerAgent(operator, "ipfs://agent", bytes32("meta"));

        assertEq(agentId, 1);
        assertEq(registry.resolveAgentId(operator), 1);
        assertEq(registry.stakeOf(agentId), 100 ether);

        vm.prank(operator);
        registry.depositStake(50 ether);
        assertEq(registry.stakeOf(agentId), 150 ether);

        vm.prank(operator);
        registry.linkWallet(wallet);
        assertEq(registry.resolveAgentId(wallet), 1);

        vm.prank(operator);
        registry.unlinkWallet(wallet);
        assertEq(registry.resolveAgentId(wallet), 0);

        vm.prank(operator);
        registry.requestStakeWithdrawal(25 ether);

        vm.warp(block.timestamp + 2 days + 1);
        vm.prank(operator);
        registry.withdrawStake();

        assertEq(registry.stakeOf(agentId), 125 ether);
    }

    function testRejectsInvalidRegistrationAndBadWalletActions() public {
        vm.prank(operator);
        vm.expectRevert(AresRegistry.InvalidOperator.selector);
        registry.registerAgent(address(0), "ipfs://bad", bytes32("meta"));

        vm.prank(wallet);
        vm.expectRevert(AresRegistry.NotOperator.selector);
        registry.registerAgent(operator, "ipfs://bad", bytes32("meta"));

        vm.prank(operator);
        uint256 agentId = registry.registerAgent(operator, "ipfs://agent", bytes32("meta"));

        vm.prank(operator);
        vm.expectRevert(AresRegistry.InvalidAmount.selector);
        registry.depositStake(0);

        vm.prank(operator);
        vm.expectRevert(AresRegistry.InvalidOperator.selector);
        registry.linkWallet(address(0));

        vm.prank(operator);
        registry.linkWallet(wallet);

        vm.prank(operator);
        vm.expectRevert(AresRegistry.WalletAlreadyLinked.selector);
        registry.linkWallet(wallet);

        vm.prank(operator);
        vm.expectRevert(AresRegistry.WalletNotLinked.selector);
        registry.unlinkWallet(address(0xF00D));

        assertEq(registry.stakeOf(agentId), 100 ether);
    }

    function testWithdrawalGuardrailsAndGovernanceSetters() public {
        vm.prank(operator);
        uint256 agentId = registry.registerAgent(operator, "ipfs://agent", bytes32("meta"));

        vm.prank(operator);
        registry.depositStake(50 ether);

        vm.prank(operator);
        vm.expectRevert(AresRegistry.InvalidAmount.selector);
        registry.requestStakeWithdrawal(0);

        vm.prank(operator);
        vm.expectRevert(AresRegistry.InsufficientStake.selector);
        registry.requestStakeWithdrawal(100 ether);

        vm.prank(operator);
        registry.requestStakeWithdrawal(10 ether);

        vm.prank(operator);
        vm.expectRevert(AresRegistry.CooldownNotElapsed.selector);
        registry.withdrawStake();

        vm.prank(governance);
        registry.setMinStake(50 ether);
        assertEq(registry.minStake(), 50 ether);

        vm.prank(governance);
        registry.setWithdrawalCooldown(3 days);
        assertEq(registry.withdrawalCooldown(), 3 days);

        vm.prank(governance);
        registry.setAdapterRole(wallet, true);
        assertTrue(registry.hasRole(registry.ADAPTER_ROLE(), wallet));

        vm.prank(governance);
        registry.setAdapterRole(wallet, false);
        assertFalse(registry.hasRole(registry.ADAPTER_ROLE(), wallet));

        assertEq(registry.stakeOf(agentId), 150 ether);
    }

    function testAdapterRegistrationAndMissingAgentGuardrails() public {
        address adapter = address(0xADAD);
        vm.prank(governance);
        registry.setAdapterRole(adapter, true);

        vm.prank(adapter);
        uint256 agentId = registry.registerAgent(operator, "ipfs://adapter-agent", bytes32("meta"));
        assertEq(agentId, 1);
        assertTrue(registry.isRegisteredAgent(agentId));
        assertEq(registry.operatorOf(agentId), operator);

        (string memory uri, bytes32 hash) = registry.metadataOf(agentId);
        assertEq(uri, "ipfs://adapter-agent");
        assertEq(hash, bytes32("meta"));

        vm.prank(adapter);
        vm.expectRevert(AresRegistry.AgentAlreadyRegistered.selector);
        registry.registerAgent(operator, "ipfs://duplicate", bytes32("dup"));

        vm.prank(wallet);
        vm.expectRevert(AresRegistry.AgentNotFound.selector);
        registry.depositStake(1 ether);

        vm.prank(wallet);
        vm.expectRevert(AresRegistry.AgentNotFound.selector);
        registry.requestStakeWithdrawal(1 ether);

        vm.prank(wallet);
        vm.expectRevert(AresRegistry.AgentNotFound.selector);
        registry.withdrawStake();

        vm.prank(wallet);
        vm.expectRevert(AresRegistry.AgentNotFound.selector);
        registry.linkWallet(address(0xF00D));

        vm.prank(wallet);
        vm.expectRevert(AresRegistry.AgentNotFound.selector);
        registry.unlinkWallet(address(0xF00D));
    }
}
