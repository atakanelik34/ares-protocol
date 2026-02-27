// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

/// @notice Mainnet architecture note: tokenomics v2.1 targets one-time full-supply mint and post-init minter revoke.
/// @dev This sprint does not change runtime mint behavior; the note documents the intended mainnet deployment sequence.
contract AresToken is ERC20, ERC20Burnable, ERC20Permit, ERC20Votes, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");

    address public treasury;

    event FeePaid(address indexed payer, uint256 amount, bytes32 indexed context);
    event Burned(address indexed account, uint256 amount);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    constructor(address admin, address treasury_) ERC20("ARES Protocol", "ARES") ERC20Permit("ARES Protocol") {
        require(admin != address(0), "invalid admin");
        require(treasury_ != address(0), "invalid treasury");

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(TREASURY_ROLE, treasury_);

        treasury = treasury_;
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function setTreasury(address newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newTreasury != address(0), "invalid treasury");
        address old = treasury;

        _revokeRole(TREASURY_ROLE, old);
        _grantRole(TREASURY_ROLE, newTreasury);

        treasury = newTreasury;
        emit TreasuryUpdated(old, newTreasury);
    }

    function recordFeePayment(uint256 amount, bytes32 context) external {
        emit FeePaid(msg.sender, amount, context);
    }

    function burn(uint256 value) public override {
        super.burn(value);
        emit Burned(msg.sender, value);
    }

    function burnFrom(address account, uint256 value) public override {
        super.burnFrom(account, value);
        emit Burned(account, value);
    }

    function nonces(address owner) public view override(ERC20Permit) returns (uint256) {
        return super.nonces(owner);
    }

    function _afterTokenTransfer(address from, address to, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._burn(account, amount);
    }
}
