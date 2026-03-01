// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../token/AresToken.sol";
import "../core/AresApiAccess.sol";

contract AresApiAccessTest is Test {
    AresToken token;
    AresApiAccess access;

    address admin = address(this);
    address governance = address(this);
    address treasury = address(0xBEEF);
    address validatorVault = address(0xCAFE);
    address buyer = address(0xA11CE);
    address recipient = address(0x1234);

    function setUp() public {
        token = new AresToken(admin, treasury);
        access = new AresApiAccess(
            admin,
            governance,
            token,
            token,
            treasury,
            validatorVault,
            2_000,
            3_000,
            5_000
        );

        token.mint(buyer, 1_000 ether);
        vm.prank(buyer);
        token.approve(address(access), type(uint256).max);
    }

    function testUpsertAndPurchaseAccessWithFeeDistribution() public {
        access.upsertPlan(0, 100 ether, 30 days, true);

        (uint256 price, uint64 duration, bool enabled) = access.plans(1);
        assertEq(price, 100 ether);
        assertEq(duration, 30 days);
        assertTrue(enabled);
        assertEq(access.nextPlanId(), 2);

        uint256 supplyBefore = token.totalSupply();

        vm.prank(buyer);
        uint64 expiry = access.purchaseAccess(1, recipient);

        assertEq(expiry, uint64(block.timestamp + 30 days));
        assertTrue(access.hasActiveAccess(recipient));
        assertEq(token.balanceOf(treasury), 30 ether);
        assertEq(token.balanceOf(validatorVault), 50 ether);
        assertEq(token.balanceOf(buyer), 900 ether);
        assertEq(token.totalSupply(), supplyBefore - 20 ether);

        vm.prank(buyer);
        uint64 secondExpiry = access.purchaseAccess(1, recipient);
        assertEq(secondExpiry, expiry + 30 days);
    }

    function testGovernanceSettersAndPlanGuards() public {
        access.upsertPlan(7, 55 ether, 7 days, false);
        (uint256 price, uint64 duration, bool enabled) = access.plans(7);
        assertEq(price, 55 ether);
        assertEq(duration, 7 days);
        assertFalse(enabled);

        vm.expectRevert(bytes("plan disabled"));
        vm.prank(buyer);
        access.purchaseAccess(7, recipient);

        vm.expectRevert(bytes("invalid recipient"));
        vm.prank(buyer);
        access.purchaseAccess(7, address(0));

        access.setFeeSplit(1_000, 4_000, 5_000);
        assertEq(access.burnBps(), 1_000);
        assertEq(access.treasuryBps(), 4_000);
        assertEq(access.validatorBps(), 5_000);

        address newTreasury = address(0xABCD);
        address newVault = address(0xDCBA);
        access.setTreasury(newTreasury, newVault);
        assertEq(access.treasury(), newTreasury);
        assertEq(access.validatorRewardVault(), newVault);

        vm.expectRevert(bytes("duration required"));
        access.upsertPlan(0, 1 ether, 0, true);
    }
}
