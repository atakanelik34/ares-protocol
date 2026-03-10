// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ARES ACP Compatibility Interface
/// @notice Minimal ACP surface used by ARES ERC-8183 adapters.
/// @dev This interface is the abstraction boundary for a future shim if ACP variants diverge.
interface IAresACPCompat {
    /// @notice ERC-8183 job lifecycle states.
    enum JobState {
        Open,
        Funded,
        Submitted,
        Completed,
        Rejected,
        Expired
    }

    /// @notice Returns the provider for a job.
    /// @param jobId Job identifier.
    /// @return provider Provider wallet address.
    function getJobProvider(uint256 jobId) external view returns (address provider);

    /// @notice Returns the current state for a job.
    /// @param jobId Job identifier.
    /// @return state Current job state.
    function getJobState(uint256 jobId) external view returns (JobState state);

    /// @notice Marks a submitted job as completed.
    /// @param jobId Job identifier.
    /// @param reason Optional attestation or reason hash.
    /// @param optParams Optional hook payload.
    function complete(uint256 jobId, bytes32 reason, bytes calldata optParams) external;

    /// @notice Rejects a job.
    /// @param jobId Job identifier.
    /// @param reason Optional attestation or reason hash.
    /// @param optParams Optional hook payload.
    function reject(uint256 jobId, bytes32 reason, bytes calldata optParams) external;
}
