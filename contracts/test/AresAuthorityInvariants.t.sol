// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/StdInvariant.sol";
import "../token/AresToken.sol";
import "../core/AresApiAccess.sol";

contract AresAuthorityHandler is Test {
    AresToken public token;
    AresApiAccess public access;

    address[] internal _treasuries;
    address[] internal _vaults;
    address[] internal _buyers;
    address[] internal _recipients;
    uint256[] internal _planIds;

    mapping(address => uint64) public trackedExpiry;

    constructor(AresToken token_, AresApiAccess access_) {
        token = token_;
        access = access_;

        _treasuries.push(address(0xBEEF));
        _treasuries.push(address(0xCAFE));
        _treasuries.push(address(0xD00D));

        _vaults.push(address(0xAAA1));
        _vaults.push(address(0xAAA2));
        _vaults.push(address(0xAAA3));

        _buyers.push(address(0x101));
        _buyers.push(address(0x102));
        _buyers.push(address(0x103));

        _recipients.push(address(0x201));
        _recipients.push(address(0x202));
        _recipients.push(address(0x203));
    }

    function treasuriesLength() external view returns (uint256) {
        return _treasuries.length;
    }

    function treasuryAt(uint256 index) external view returns (address) {
        return _treasuries[index];
    }

    function recipientsLength() external view returns (uint256) {
        return _recipients.length;
    }

    function recipientAt(uint256 index) external view returns (address) {
        return _recipients[index];
    }

    function planIdsLength() external view returns (uint256) {
        return _planIds.length;
    }

    function planIdAt(uint256 index) external view returns (uint256) {
        return _planIds[index];
    }

    function mintBuyer(uint8 buyerSeed, uint96 rawAmount) external {
        address buyer = _buyers[buyerSeed % _buyers.length];
        uint256 amount = bound(uint256(rawAmount), 1 ether, 1_000 ether);
        token.mint(buyer, amount);

        vm.prank(buyer);
        token.approve(address(access), type(uint256).max);
    }

    function rotateTokenTreasury(uint8 treasurySeed) external {
        token.setTreasury(_treasuries[treasurySeed % _treasuries.length]);
    }

    function rotateAccessTreasury(uint8 treasurySeed, uint8 vaultSeed) external {
        access.setTreasury(
            _treasuries[treasurySeed % _treasuries.length],
            _vaults[vaultSeed % _vaults.length]
        );
    }

    function setFeeSplit(uint16 burnSeed, uint16 treasurySeed) external {
        uint16 burnBps = uint16(uint256(burnSeed) % 10_001);
        uint16 treasuryBps = uint16(uint256(treasurySeed) % (10_001 - burnBps));
        uint16 validatorBps = uint16(10_000 - burnBps - treasuryBps);
        access.setFeeSplit(burnBps, treasuryBps, validatorBps);
    }

    function upsertPlan(uint8 existingSeed, uint96 rawPrice, uint32 rawDuration, bool enabled) external {
        uint256 planId = 0;
        if (_planIds.length > 0 && existingSeed % 2 == 1) {
            planId = _planIds[existingSeed % _planIds.length];
        }

        uint256 price = bound(uint256(rawPrice), 0, 250 ether);
        uint64 duration = uint64(bound(uint256(rawDuration), 1 hours, 180 days));
        uint256 beforeNext = access.nextPlanId();

        access.upsertPlan(planId, price, duration, enabled);

        if (planId == 0) {
            _planIds.push(beforeNext);
        }
    }

    function purchase(uint8 buyerSeed, uint8 recipientSeed, uint8 planSeed) external {
        if (_planIds.length == 0) return;

        address buyer = _buyers[buyerSeed % _buyers.length];
        address recipient = _recipients[recipientSeed % _recipients.length];
        uint256 planId = _planIds[planSeed % _planIds.length];

        vm.prank(buyer);
        try access.purchaseAccess(planId, recipient) returns (uint64 expiry) {
            if (expiry > trackedExpiry[recipient]) {
                trackedExpiry[recipient] = expiry;
            }
        } catch {}
    }
}

contract AresAuthorityInvariantTest is StdInvariant, Test {
    AresToken internal token;
    AresApiAccess internal access;
    AresAuthorityHandler internal handler;

    function setUp() public {
        token = new AresToken(address(this), address(0xBEEF));
        access = new AresApiAccess(
            address(this),
            address(this),
            token,
            token,
            address(0xBEEF),
            address(0xAAA1),
            2_000,
            3_000,
            5_000
        );

        handler = new AresAuthorityHandler(token, access);

        token.grantRole(token.DEFAULT_ADMIN_ROLE(), address(handler));
        token.grantRole(token.MINTER_ROLE(), address(handler));
        access.grantRole(access.GOVERNANCE_ROLE(), address(handler));

        for (uint256 i = 0; i < 3; i++) {
            address buyer = address(uint160(0x101 + i));
            token.mint(buyer, 5_000 ether);
            vm.prank(buyer);
            token.approve(address(access), type(uint256).max);
        }

        targetContract(address(handler));
    }

    function invariant_tokenTreasuryRemainsNonZeroAndAuthorized() public view {
        address treasury = token.treasury();
        assertTrue(treasury != address(0));
        assertTrue(token.hasRole(token.TREASURY_ROLE(), treasury));
    }

    function invariant_apiAccessFeeSplitRemainsBounded() public view {
        uint256 sum = uint256(access.burnBps()) + uint256(access.treasuryBps()) + uint256(access.validatorBps());
        assertEq(sum, 10_000);
        assertTrue(access.treasury() != address(0));
        assertTrue(access.validatorRewardVault() != address(0));
    }

    function invariant_trackedPlansRemainWellFormed() public view {
        uint256 len = handler.planIdsLength();
        for (uint256 i = 0; i < len; i++) {
            uint256 planId = handler.planIdAt(i);
            (uint256 price, uint64 duration,) = access.plans(planId);
            assertTrue(duration > 0);
            assertLe(price, 250 ether);
        }
        assertEq(access.nextPlanId(), len + 1);
    }

    function invariant_accessExpiryNeverRegressesForTrackedRecipients() public view {
        uint256 len = handler.recipientsLength();
        for (uint256 i = 0; i < len; i++) {
            address recipient = handler.recipientAt(i);
            assertEq(access.accessExpiry(recipient), handler.trackedExpiry(recipient));
        }
    }
}
