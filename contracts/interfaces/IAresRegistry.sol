// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAresRegistry {
    function resolveAgentId(address account) external view returns (uint256 agentId);

    function operatorOf(uint256 agentId) external view returns (address operator);

    function isRegisteredAgent(uint256 agentId) external view returns (bool);
}
