// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC8004ReputationRegistry {
    struct Feedback {
        uint256 agentId;
        int128 value;
        uint8 valueDecimals;
        bytes32 tag1;
        bytes32 tag2;
        string feedbackURI;
        bytes32 evidenceHash;
        address submitter;
        uint64 createdAt;
    }

    function giveFeedback(
        uint256 agentId,
        int128 value,
        uint8 valueDecimals,
        bytes32 tag1,
        bytes32 tag2,
        string calldata feedbackURI,
        bytes32 evidenceHash
    ) external returns (uint256 feedbackId);

    function getFeedback(uint256 feedbackId) external view returns (Feedback memory);

    event NewFeedback(
        uint256 indexed feedbackId,
        uint256 indexed agentId,
        address indexed submitter,
        int128 value,
        uint8 valueDecimals,
        bytes32 tag1,
        bytes32 tag2,
        string feedbackURI,
        bytes32 evidenceHash
    );
}
