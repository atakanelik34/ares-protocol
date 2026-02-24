// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "../interfaces/erc8004-spec/IERC8004ReputationRegistry.sol";

interface IIdentityAdapterView is IERC721 {
    function getAgentWallet(uint256 agentId) external view returns (address);
}

interface IAresRegistryView {
    function operatorOf(uint256 agentId) external view returns (address operator);
}

interface IAresLedgerWriter {
    function recordActionScore(
        address agent,
        bytes32 actionId,
        uint16[5] calldata scores,
        uint64 timestamp,
        bytes calldata scorerSignature
    ) external;
}

contract ERC8004ReputationAdapter is AccessControl, IERC8004ReputationRegistry {
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");

    IIdentityAdapterView public immutable identityAdapter;
    IAresRegistryView public immutable coreRegistry;
    IAresLedgerWriter public immutable scorecardLedger;

    bool public bridgeFeedbackEnabled;
    mapping(address => bool) public bridgeRelayers;

    uint256 public nextFeedbackId = 1;
    mapping(uint256 => Feedback) public feedbackById;

    event BridgeFeedbackToggled(bool enabled);
    event BridgeRelayerUpdated(address indexed relayer, bool allowed);
    event FeedbackBridged(uint256 indexed feedbackId, bytes32 indexed actionId, address indexed relayer);

    constructor(
        address admin,
        address governance,
        IIdentityAdapterView identityAdapter_,
        IAresRegistryView coreRegistry_,
        IAresLedgerWriter scorecardLedger_
    ) {
        require(admin != address(0), "invalid admin");
        require(governance != address(0), "invalid governance");
        require(address(identityAdapter_) != address(0), "invalid identity");
        require(address(coreRegistry_) != address(0), "invalid registry");
        require(address(scorecardLedger_) != address(0), "invalid ledger");

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GOVERNANCE_ROLE, governance);

        identityAdapter = identityAdapter_;
        coreRegistry = coreRegistry_;
        scorecardLedger = scorecardLedger_;
    }

    function giveFeedback(
        uint256 agentId,
        int128 value,
        uint8 valueDecimals,
        bytes32 tag1,
        bytes32 tag2,
        string calldata feedbackURI,
        bytes32 evidenceHash
    ) external override returns (uint256 feedbackId) {
        address owner = identityAdapter.ownerOf(agentId);
        require(msg.sender != owner, "submitter is owner");

        address approved = identityAdapter.getApproved(agentId);
        bool isApprovedForAll = identityAdapter.isApprovedForAll(owner, msg.sender);
        require(msg.sender != approved && !isApprovedForAll, "submitter is approved operator");

        feedbackId = nextFeedbackId++;
        feedbackById[feedbackId] = Feedback({
            agentId: agentId,
            value: value,
            valueDecimals: valueDecimals,
            tag1: tag1,
            tag2: tag2,
            feedbackURI: feedbackURI,
            evidenceHash: evidenceHash,
            submitter: msg.sender,
            createdAt: uint64(block.timestamp)
        });

        emit NewFeedback(feedbackId, agentId, msg.sender, value, valueDecimals, tag1, tag2, feedbackURI, evidenceHash);
    }

    function getFeedback(uint256 feedbackId) external view override returns (Feedback memory) {
        return feedbackById[feedbackId];
    }

    function setBridgeFeedbackEnabled(bool enabled) external onlyRole(GOVERNANCE_ROLE) {
        bridgeFeedbackEnabled = enabled;
        emit BridgeFeedbackToggled(enabled);
    }

    function setBridgeRelayer(address relayer, bool allowed) external onlyRole(GOVERNANCE_ROLE) {
        bridgeRelayers[relayer] = allowed;
        emit BridgeRelayerUpdated(relayer, allowed);
    }

    function bridgeFeedbackToScorecard(
        uint256 feedbackId,
        bytes32 actionId,
        uint16[5] calldata scores,
        uint64 timestamp,
        bytes calldata scorerSignature
    ) external {
        require(bridgeFeedbackEnabled, "bridge disabled");
        require(bridgeRelayers[msg.sender], "not relayer");

        Feedback memory feedback = feedbackById[feedbackId];
        require(feedback.createdAt != 0, "feedback not found");

        address owner = identityAdapter.ownerOf(feedback.agentId);
        address coreOperator = coreRegistry.operatorOf(feedback.agentId);
        require(msg.sender != owner && msg.sender != coreOperator, "relayer cannot be owner/operator");

        if (feedback.evidenceHash != bytes32(0)) {
            require(keccak256(bytes(feedback.feedbackURI)) == feedback.evidenceHash, "evidence mismatch");
        }

        address agentWallet = identityAdapter.getAgentWallet(feedback.agentId);
        if (agentWallet == address(0)) {
            agentWallet = coreOperator;
        }

        scorecardLedger.recordActionScore(agentWallet, actionId, scores, timestamp, scorerSignature);

        emit FeedbackBridged(feedbackId, actionId, msg.sender);
    }
}
