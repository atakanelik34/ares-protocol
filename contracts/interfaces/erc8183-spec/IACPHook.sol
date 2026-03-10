// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ERC-8183 ACP Hook Interface
/// @notice Hook callback surface for policy and side-effect extensions around ACP actions.
interface IACPHook {
    /// @notice Called before a hookable ACP action executes.
    /// @param jobId Job identifier.
    /// @param selector Selector of the ACP action being executed.
    /// @param data Encoded action-specific payload.
    function beforeAction(uint256 jobId, bytes4 selector, bytes calldata data) external;

    /// @notice Called after a hookable ACP action executes.
    /// @param jobId Job identifier.
    /// @param selector Selector of the ACP action being executed.
    /// @param data Encoded action-specific payload.
    function afterAction(uint256 jobId, bytes4 selector, bytes calldata data) external;
}
