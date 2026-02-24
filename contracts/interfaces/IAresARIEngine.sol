// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAresARIEngine {
    function applyActionScore(uint256 agentId, uint16[5] calldata scores, uint64 actionTimestamp) external;

    function invalidateActionContribution(uint256 agentId, uint16[5] calldata scores, uint64 actionTimestamp) external;

    function getARIByAgentId(uint256 agentId)
        external
        view
        returns (uint256 ari, uint8 tier, uint32 actionsCount, uint64 firstActionAt, uint64 lastUpdate);
}
