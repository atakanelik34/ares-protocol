// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../token/AresToken.sol";

contract AresApiAccess is AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");

    struct Plan {
        uint256 price;
        uint64 duration;
        bool enabled;
    }

    IERC20 public immutable token;
    AresToken public immutable burnableToken;

    uint256 public nextPlanId = 1;
    uint16 public burnBps;
    uint16 public treasuryBps;
    uint16 public validatorBps;

    address public treasury;
    address public validatorRewardVault;

    mapping(uint256 => Plan) public plans;
    mapping(address => uint64) public accessExpiry;

    event PlanUpserted(uint256 indexed planId, uint256 price, uint64 duration, bool enabled);
    event FeeSplitUpdated(uint16 burnBps, uint16 treasuryBps, uint16 validatorBps);
    event ApiAccessPurchased(address indexed payer, address indexed recipient, uint256 indexed planId, uint64 expiry);
    event ApiFeeDistributed(uint256 burnAmount, uint256 treasuryAmount, uint256 validatorAmount);

    constructor(
        address admin,
        address governance,
        IERC20 token_,
        AresToken burnableToken_,
        address treasury_,
        address validatorRewardVault_,
        uint16 burnBps_,
        uint16 treasuryBps_,
        uint16 validatorBps_
    ) {
        require(admin != address(0), "invalid admin");
        require(governance != address(0), "invalid governance");
        require(address(token_) != address(0), "invalid token");
        require(address(burnableToken_) != address(0), "invalid burn token");
        require(treasury_ != address(0), "invalid treasury");
        require(validatorRewardVault_ != address(0), "invalid validator vault");
        require(uint256(burnBps_) + uint256(treasuryBps_) + uint256(validatorBps_) == 10_000, "invalid split");

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GOVERNANCE_ROLE, governance);

        token = token_;
        burnableToken = burnableToken_;
        treasury = treasury_;
        validatorRewardVault = validatorRewardVault_;
        burnBps = burnBps_;
        treasuryBps = treasuryBps_;
        validatorBps = validatorBps_;
    }

    function upsertPlan(uint256 planId, uint256 price, uint64 duration, bool enabled) external onlyRole(GOVERNANCE_ROLE) {
        require(duration > 0, "duration required");
        if (planId == 0) {
            planId = nextPlanId++;
        }

        plans[planId] = Plan({price: price, duration: duration, enabled: enabled});
        emit PlanUpserted(planId, price, duration, enabled);
    }

    function setFeeSplit(uint16 burnBps_, uint16 treasuryBps_, uint16 validatorBps_) external onlyRole(GOVERNANCE_ROLE) {
        require(uint256(burnBps_) + uint256(treasuryBps_) + uint256(validatorBps_) == 10_000, "invalid split");

        burnBps = burnBps_;
        treasuryBps = treasuryBps_;
        validatorBps = validatorBps_;

        emit FeeSplitUpdated(burnBps_, treasuryBps_, validatorBps_);
    }

    function setTreasury(address treasury_, address validatorRewardVault_) external onlyRole(GOVERNANCE_ROLE) {
        require(treasury_ != address(0), "invalid treasury");
        require(validatorRewardVault_ != address(0), "invalid validator vault");

        treasury = treasury_;
        validatorRewardVault = validatorRewardVault_;
    }

    function purchaseAccess(uint256 planId, address recipient) external returns (uint64 expiry) {
        require(recipient != address(0), "invalid recipient");

        Plan memory plan = plans[planId];
        require(plan.enabled, "plan disabled");

        token.safeTransferFrom(msg.sender, address(this), plan.price);

        uint256 burnAmount = (plan.price * burnBps) / 10_000;
        uint256 treasuryAmount = (plan.price * treasuryBps) / 10_000;
        uint256 validatorAmount = plan.price - burnAmount - treasuryAmount;

        if (burnAmount > 0) {
            burnableToken.burn(burnAmount);
        }
        if (treasuryAmount > 0) {
            token.safeTransfer(treasury, treasuryAmount);
        }
        if (validatorAmount > 0) {
            token.safeTransfer(validatorRewardVault, validatorAmount);
        }

        uint64 current = accessExpiry[recipient];
        uint64 start = current > block.timestamp ? current : uint64(block.timestamp);
        expiry = start + plan.duration;
        accessExpiry[recipient] = expiry;

        emit ApiFeeDistributed(burnAmount, treasuryAmount, validatorAmount);
        emit ApiAccessPurchased(msg.sender, recipient, planId, expiry);
    }

    function hasActiveAccess(address account) external view returns (bool) {
        return accessExpiry[account] >= block.timestamp;
    }
}
