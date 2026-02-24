// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAresScorecardLedger {
    enum ActionStatus {
        NONE,
        VALID,
        INVALID
    }

    function getAction(uint256 agentId, bytes32 actionId)
        external
        view
        returns (uint16[5] memory scores, uint64 timestamp, address scorer, ActionStatus status);

    function invalidateAction(uint256 agentId, bytes32 actionId)
        external
        returns (uint16[5] memory scores, uint64 timestamp);
}
