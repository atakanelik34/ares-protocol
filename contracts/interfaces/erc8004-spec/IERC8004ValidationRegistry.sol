// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC8004ValidationRegistry {
    struct ValidationRequest {
        uint256 agentId;
        bytes32 actionId;
        address requester;
        string reasonURI;
        uint256 stakeAmount;
        uint64 createdAt;
    }

    function validationRequest(uint256 agentId, bytes32 actionId, string calldata reasonURI, uint256 stakeAmount)
        external
        returns (uint256 requestId);

    function validationResponse(uint256 requestId, bool acceptChallenge, uint256 stakeAmount) external;

    function getValidationRequest(uint256 requestId) external view returns (ValidationRequest memory);

    event ValidationRequested(
        uint256 indexed requestId,
        uint256 indexed agentId,
        bytes32 indexed actionId,
        address requester,
        string reasonURI,
        uint256 stakeAmount
    );

    event ValidationResponded(
        uint256 indexed requestId,
        address indexed responder,
        bool acceptChallenge,
        uint256 stakeAmount
    );
}
