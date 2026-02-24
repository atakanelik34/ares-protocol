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
}
