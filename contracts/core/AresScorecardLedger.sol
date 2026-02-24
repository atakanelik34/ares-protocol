// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "../interfaces/IAresARIEngine.sol";
import "../interfaces/IAresRegistry.sol";
import "../interfaces/IAresScorecardLedger.sol";

contract AresScorecardLedger is AccessControl, EIP712, IAresScorecardLedger {
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant DISPUTE_ROLE = keccak256("DISPUTE_ROLE");

    bytes32 public constant ACTION_SCORE_TYPEHASH = keccak256(
        "ActionScore(address agent,bytes32 actionId,bytes32 scoresHash,uint64 timestamp)"
    );

    struct ActionRecord {
        uint16[5] scores;
        uint64 timestamp;
        address scorer;
        ActionStatus status;
    }

    IAresRegistry public immutable registry;
    IAresARIEngine public immutable ariEngine;

    mapping(address => bool) public authorizedScorers;
    mapping(uint256 => mapping(bytes32 => ActionRecord)) internal actions;

    event ActionScored(uint256 indexed agent, bytes32 indexed actionId, uint16[5] scores, uint64 timestamp, address scorer);
    event ScorerAuthorizationUpdated(address indexed scorer, bool authorized);
    event ActionInvalidated(uint256 indexed agentId, bytes32 indexed actionId);

    error AgentNotRegistered();
    error InvalidScoreRange();
    error ActionAlreadyRecorded();
    error InvalidSignature();
    error ActionNotFound();
    error ActionAlreadyInvalid();

    constructor(address admin, address governance, IAresRegistry registry_, IAresARIEngine ariEngine_)
        EIP712("AresScorecardLedger", "1")
    {
        require(admin != address(0), "invalid admin");
        require(governance != address(0), "invalid governance");
        require(address(registry_) != address(0), "invalid registry");
        require(address(ariEngine_) != address(0), "invalid ari");

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GOVERNANCE_ROLE, governance);

        registry = registry_;
        ariEngine = ariEngine_;
    }

    function recordActionScore(
        address agent,
        bytes32 actionId,
        uint16[5] calldata scores,
        uint64 timestamp,
        bytes calldata scorerSignature
    ) external {
        uint256 agentId = registry.resolveAgentId(agent);
        if (agentId == 0 || !registry.isRegisteredAgent(agentId)) revert AgentNotRegistered();
        if (actions[agentId][actionId].status != ActionStatus.NONE) revert ActionAlreadyRecorded();

        for (uint256 i = 0; i < 5; i++) {
            if (scores[i] > 200) revert InvalidScoreRange();
        }

        bytes32 scoresHash = keccak256(abi.encode(scores[0], scores[1], scores[2], scores[3], scores[4]));
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(ACTION_SCORE_TYPEHASH, agent, actionId, scoresHash, timestamp)));
        address signer = ECDSA.recover(digest, scorerSignature);
        if (!authorizedScorers[signer]) revert InvalidSignature();

        actions[agentId][actionId] = ActionRecord({
            scores: scores,
            timestamp: timestamp,
            scorer: signer,
            status: ActionStatus.VALID
        });

        ariEngine.applyActionScore(agentId, scores, timestamp);

        emit ActionScored(agentId, actionId, scores, timestamp, signer);
    }

    function invalidateAction(uint256 agentId, bytes32 actionId)
        external
        override
        onlyRole(DISPUTE_ROLE)
        returns (uint16[5] memory scores, uint64 timestamp)
    {
        ActionRecord storage action = actions[agentId][actionId];
        if (action.status == ActionStatus.NONE) revert ActionNotFound();
        if (action.status == ActionStatus.INVALID) revert ActionAlreadyInvalid();

        action.status = ActionStatus.INVALID;

        emit ActionInvalidated(agentId, actionId);
        return (action.scores, action.timestamp);
    }

    function setAuthorizedScorer(address scorer, bool authorized) external onlyRole(GOVERNANCE_ROLE) {
        authorizedScorers[scorer] = authorized;
        emit ScorerAuthorizationUpdated(scorer, authorized);
    }

    function getAction(uint256 agentId, bytes32 actionId)
        external
        view
        override
        returns (uint16[5] memory scores, uint64 timestamp, address scorer, ActionStatus status)
    {
        ActionRecord storage action = actions[agentId][actionId];
        return (action.scores, action.timestamp, action.scorer, action.status);
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
