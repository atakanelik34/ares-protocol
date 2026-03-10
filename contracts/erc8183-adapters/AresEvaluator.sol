// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../interfaces/erc8183-spec/IAresACPCompat.sol";

/// @title ARES Evaluator Adapter for ERC-8183
/// @notice Authorized ARES oracles can resolve ACP jobs through this evaluator contract.
contract AresEvaluator is AccessControl, ReentrancyGuard {
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    uint256 public constant DEFAULT_MAX_RESOLUTIONS_PER_ORACLE_PER_BLOCK = 1;

    IAresACPCompat public immutable acp;

    uint256 public maxResolutionsPerOraclePerBlock;
    mapping(address => mapping(uint256 => uint256)) public oracleResolutionsInBlock;

    event OracleUpdated(address indexed oracle, bool allowed);
    event OracleRateLimitUpdated(uint256 oldValue, uint256 newValue);
    event JobResolved(uint256 indexed jobId, address indexed oracle, bool completed, bytes32 reason);

    error OracleRateLimitExceeded(address oracle, uint256 blockNumber, uint256 attempts, uint256 maxAllowed);

    constructor(address admin, address governance, IAresACPCompat acp_) {
        require(admin != address(0), "invalid admin");
        require(governance != address(0), "invalid governance");
        require(address(acp_) != address(0), "invalid acp");

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GOVERNANCE_ROLE, governance);
        acp = acp_;
        maxResolutionsPerOraclePerBlock = DEFAULT_MAX_RESOLUTIONS_PER_ORACLE_PER_BLOCK;
    }

    /// @notice Enables or disables oracle authorization for resolution actions.
    function setOracle(address oracle, bool allowed) external onlyRole(GOVERNANCE_ROLE) {
        if (allowed) {
            _grantRole(ORACLE_ROLE, oracle);
        } else {
            _revokeRole(ORACLE_ROLE, oracle);
        }
        emit OracleUpdated(oracle, allowed);
    }

    /// @notice Sets max number of job resolutions per oracle per block.
    function setMaxResolutionsPerOraclePerBlock(uint256 newLimit) external onlyRole(GOVERNANCE_ROLE) {
        require(newLimit > 0, "invalid limit");
        uint256 oldValue = maxResolutionsPerOraclePerBlock;
        maxResolutionsPerOraclePerBlock = newLimit;
        emit OracleRateLimitUpdated(oldValue, newLimit);
    }

    /// @notice Resolves an ACP job as completed.
    function resolveComplete(uint256 jobId, bytes32 reason, bytes calldata optParams)
        external
        onlyRole(ORACLE_ROLE)
        nonReentrant
    {
        _consumeRateLimit(msg.sender);
        acp.complete(jobId, reason, optParams);
        emit JobResolved(jobId, msg.sender, true, reason);
    }

    /// @notice Resolves an ACP job as rejected.
    function resolveReject(uint256 jobId, bytes32 reason, bytes calldata optParams)
        external
        onlyRole(ORACLE_ROLE)
        nonReentrant
    {
        _consumeRateLimit(msg.sender);
        acp.reject(jobId, reason, optParams);
        emit JobResolved(jobId, msg.sender, false, reason);
    }

    function _consumeRateLimit(address oracle) internal {
        uint256 newCount = oracleResolutionsInBlock[oracle][block.number] + 1;
        uint256 maxAllowed = maxResolutionsPerOraclePerBlock;
        if (newCount > maxAllowed) {
            revert OracleRateLimitExceeded(oracle, block.number, newCount, maxAllowed);
        }
        oracleResolutionsInBlock[oracle][block.number] = newCount;
    }
}
