// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAresDispute {
    function disputeAction(uint256 agentId, bytes32 actionId, uint256 challengerStake, string calldata reasonURI)
        external
        returns (uint256 disputeId);

    function validatorJoin(uint256 disputeId, uint256 stake) external;

    function vote(uint256 disputeId, bool acceptChallenge) external;

    function finalize(uint256 disputeId) external;
}
