// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../interfaces/IAresRegistry.sol";
import "../interfaces/IAresARIEngine.sol";
import "../interfaces/erc8183-spec/IACPHook.sol";
import "../interfaces/erc8183-spec/IAresACPCompat.sol";

interface IAresScorecardWriter {
    function recordActionScore(
        address agent,
        bytes32 actionId,
        uint16[5] calldata scores,
        uint64 timestamp,
        bytes calldata scorerSignature
    ) external;
}

/// @title ARES ACP Hook for ERC-8183
/// @notice Applies reputation-gated policy and records job outcomes into ARES scorecards.
/// @dev Designed for one immutable ACP deployment; a future ACP shim can be added behind IAresACPCompat.
contract AresACPHook is IACPHook, AccessControl, ReentrancyGuard {
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");

    bytes4 public constant SET_PROVIDER_SELECTOR = bytes4(keccak256("setProvider(uint256,address,bytes)"));
    bytes4 public constant FUND_SELECTOR = bytes4(keccak256("fund(uint256,uint256,bytes)"));
    bytes4 public constant SUBMIT_SELECTOR = bytes4(keccak256("submit(uint256,bytes32,bytes)"));
    bytes4 public constant COMPLETE_SELECTOR = bytes4(keccak256("complete(uint256,bytes32,bytes)"));
    bytes4 public constant REJECT_SELECTOR = bytes4(keccak256("reject(uint256,bytes32,bytes)"));

    bytes32 internal constant STEP_GET_PROVIDER = bytes32("GET_PROVIDER");
    bytes32 internal constant STEP_RESOLVE_AGENT = bytes32("RESOLVE_AGENT");
    bytes32 internal constant STEP_IS_REGISTERED = bytes32("IS_REGISTERED");
    bytes32 internal constant STEP_GET_ARI = bytes32("GET_ARI");
    bytes32 internal constant STEP_GET_JOB_STATE = bytes32("GET_JOB_STATE");
    bytes32 internal constant STEP_RECORD_SCORE = bytes32("RECORD_SCORE");
    bytes32 internal constant STEP_DECODE_SET_PROVIDER = bytes32("DECODE_SET_PROVIDER");
    bytes32 internal constant STEP_DECODE_SUBMIT = bytes32("DECODE_SUBMIT");
    bytes32 internal constant STEP_DECODE_RESOLUTION = bytes32("DECODE_RESOLUTION");
    bytes32 internal constant STEP_DECODE_SCORE = bytes32("DECODE_SCORE");

    bytes32 internal constant REASON_PROVIDER_LOOKUP_FAILED = bytes32("PROVIDER_LOOKUP_FAILED");
    bytes32 internal constant REASON_PROVIDER_ZERO = bytes32("PROVIDER_ZERO");
    bytes32 internal constant REASON_AGENT_LOOKUP_FAILED = bytes32("AGENT_LOOKUP_FAILED");
    bytes32 internal constant REASON_AGENT_UNREGISTERED = bytes32("AGENT_UNREGISTERED");
    bytes32 internal constant REASON_ARI_LOOKUP_FAILED = bytes32("ARI_LOOKUP_FAILED");
    bytes32 internal constant REASON_DECODE_FAILED = bytes32("DECODE_FAILED");
    bytes32 internal constant REASON_SCORE_PAYLOAD_INVALID = bytes32("SCORE_PAYLOAD_INVALID");
    bytes32 internal constant REASON_LEDGER_WRITE_FAILED = bytes32("LEDGER_WRITE_FAILED");
    bytes32 internal constant REASON_PROVIDER_CHECK_BYPASSED = bytes32("PROVIDER_CHECK_BYPASSED");

    IAresACPCompat public immutable acp;
    IAresRegistry public immutable registry;
    IAresARIEngine public immutable ariEngine;
    IAresScorecardWriter public immutable scorecardLedger;

    uint256 public minProviderScore;
    bool public enforceRegisteredProviderOnSetProvider;

    enum JobOutcome {
        Submitted,
        Completed,
        RejectedAfterSubmit,
        RejectedBeforeSubmit
    }

    enum RejectPreState {
        None,
        Funded,
        Submitted
    }

    enum AgentResolution {
        Ok,
        LookupFailed,
        Unregistered
    }

    struct ScorePayload {
        bytes32 actionId;
        uint64 timestamp;
        bytes scorerSignature;
    }

    mapping(JobOutcome => uint16[5]) private _scoreProfiles;
    mapping(uint256 => RejectPreState) private _rejectSnapshots;

    event MinProviderScoreUpdated(uint256 oldValue, uint256 newValue);
    event ProviderRegistrationCheckUpdated(bool enabled);
    event ScoreProfileUpdated(JobOutcome indexed outcome, uint16[5] scores);
    event ProviderGateEvaluated(
        uint256 indexed jobId, uint256 indexed agentId, uint256 score, uint256 minRequired, bool allowed
    );
    event GateBypass(uint256 indexed jobId, bytes4 indexed selector, bytes32 reasonCode);
    event RejectSnapshotStored(uint256 indexed jobId, RejectPreState snapshot);
    event RejectSnapshotMissing(uint256 indexed jobId);
    event ScoreWriteSkipped(uint256 indexed jobId, bytes4 indexed selector, bytes32 reasonCode);
    event ExternalLookupFailed(uint256 indexed jobId, bytes4 indexed selector, bytes32 step, bytes reason);
    event JobOutcomeRecorded(uint256 indexed jobId, uint256 indexed agentId, JobOutcome outcome, bytes32 actionId);

    error OnlyACP();
    error InvalidScoreProfile();
    error ProviderNotRegistered(address provider);
    error InsufficientReputation(uint256 agentId, uint256 score, uint256 minRequired);

    constructor(
        address admin,
        address governance,
        IAresACPCompat acp_,
        IAresRegistry registry_,
        IAresARIEngine ariEngine_,
        IAresScorecardWriter scorecardLedger_,
        uint256 minProviderScore_
    ) {
        require(admin != address(0), "invalid admin");
        require(governance != address(0), "invalid governance");
        require(address(acp_) != address(0), "invalid acp");
        require(address(registry_) != address(0), "invalid registry");
        require(address(ariEngine_) != address(0), "invalid ari");
        require(address(scorecardLedger_) != address(0), "invalid ledger");

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GOVERNANCE_ROLE, governance);

        acp = acp_;
        registry = registry_;
        ariEngine = ariEngine_;
        scorecardLedger = scorecardLedger_;
        minProviderScore = minProviderScore_;

        uint16[5] memory submitProfile = [uint16(105), 100, 100, 100, 100];
        uint16[5] memory completeProfile = [uint16(140), 100, 100, 100, 100];
        uint16[5] memory rejectSubmittedProfile = [uint16(60), 100, 100, 100, 100];
        uint16[5] memory rejectFundedProfile = [uint16(90), 100, 100, 100, 100];

        _setScoreProfile(JobOutcome.Submitted, submitProfile, false);
        _setScoreProfile(JobOutcome.Completed, completeProfile, false);
        _setScoreProfile(JobOutcome.RejectedAfterSubmit, rejectSubmittedProfile, false);
        _setScoreProfile(JobOutcome.RejectedBeforeSubmit, rejectFundedProfile, false);
    }

    modifier onlyACP() {
        if (msg.sender != address(acp)) revert OnlyACP();
        _;
    }

    /// @notice Governance setter for minimum ARI required at fund-time.
    function setMinProviderScore(uint256 newMinProviderScore) external onlyRole(GOVERNANCE_ROLE) {
        uint256 oldValue = minProviderScore;
        minProviderScore = newMinProviderScore;
        emit MinProviderScoreUpdated(oldValue, newMinProviderScore);
    }

    /// @notice Governance toggle for registration enforcement during setProvider.
    function setEnforceRegisteredProviderOnSetProvider(bool enabled) external onlyRole(GOVERNANCE_ROLE) {
        enforceRegisteredProviderOnSetProvider = enabled;
        emit ProviderRegistrationCheckUpdated(enabled);
    }

    /// @notice Governance setter for outcome score profiles.
    function setScoreProfile(JobOutcome outcome, uint16[5] calldata scores) external onlyRole(GOVERNANCE_ROLE) {
        uint16[5] memory nextScores = scores;
        _setScoreProfile(outcome, nextScores, true);
    }

    /// @notice Returns score profile used for a given outcome.
    function getScoreProfile(JobOutcome outcome) external view returns (uint16[5] memory) {
        return _scoreProfiles[outcome];
    }

    /// @notice Exposes reject snapshot state for observability.
    function getRejectSnapshot(uint256 jobId) external view returns (RejectPreState) {
        return _rejectSnapshots[jobId];
    }

    /// @inheritdoc IACPHook
    function beforeAction(uint256 jobId, bytes4 selector, bytes calldata data) external override onlyACP nonReentrant {
        if (selector == FUND_SELECTOR) {
            _beforeFund(jobId);
        } else if (selector == SET_PROVIDER_SELECTOR) {
            _beforeSetProvider(jobId, data);
        } else if (selector == REJECT_SELECTOR) {
            _beforeReject(jobId);
        }
    }

    /// @inheritdoc IACPHook
    function afterAction(uint256 jobId, bytes4 selector, bytes calldata data) external override onlyACP nonReentrant {
        if (selector == SUBMIT_SELECTOR) {
            _afterSubmit(jobId, data);
        } else if (selector == COMPLETE_SELECTOR) {
            _afterComplete(jobId, data);
        } else if (selector == REJECT_SELECTOR) {
            _afterReject(jobId, data);
        }
    }

    /// @notice Decodes ERC-8183 setProvider hook data.
    function decodeSetProviderInput(bytes calldata data) external pure returns (address provider, bytes memory optParams) {
        return abi.decode(data, (address, bytes));
    }

    /// @notice Decodes ERC-8183 submit hook data.
    function decodeSubmitInput(bytes calldata data) external pure returns (bytes32 deliverable, bytes memory optParams) {
        return abi.decode(data, (bytes32, bytes));
    }

    /// @notice Decodes ERC-8183 complete/reject hook data.
    function decodeResolutionInput(bytes calldata data) external pure returns (bytes32 reason, bytes memory optParams) {
        return abi.decode(data, (bytes32, bytes));
    }

    /// @notice Decodes ARES score payload carried in ACP optParams.
    function decodeScorePayload(bytes calldata optParams) external pure returns (ScorePayload memory payload) {
        return abi.decode(optParams, (ScorePayload));
    }

    function _beforeFund(uint256 jobId) internal {
        (bool providerOk, address provider) = _getProvider(jobId, FUND_SELECTOR);
        if (!providerOk) {
            emit GateBypass(jobId, FUND_SELECTOR, REASON_PROVIDER_LOOKUP_FAILED);
            return;
        }

        (AgentResolution resolution, uint256 agentId) = _resolveRegisteredAgent(provider, jobId, FUND_SELECTOR);
        if (resolution == AgentResolution.LookupFailed) {
            emit GateBypass(jobId, FUND_SELECTOR, REASON_AGENT_LOOKUP_FAILED);
            return;
        }
        if (resolution == AgentResolution.Unregistered) {
            revert ProviderNotRegistered(provider);
        }

        (bool scoreOk, uint256 score) = _safeGetAri(agentId, jobId, FUND_SELECTOR);
        if (!scoreOk) {
            emit GateBypass(jobId, FUND_SELECTOR, REASON_ARI_LOOKUP_FAILED);
            return;
        }

        bool allowed = score >= minProviderScore;
        emit ProviderGateEvaluated(jobId, agentId, score, minProviderScore, allowed);
        if (!allowed) {
            revert InsufficientReputation(agentId, score, minProviderScore);
        }
    }

    function _beforeSetProvider(uint256 jobId, bytes calldata data) internal {
        if (!enforceRegisteredProviderOnSetProvider) {
            return;
        }

        (bool decoded, address provider,) = _safeDecodeSetProviderData(jobId, data);
        if (!decoded) {
            emit GateBypass(jobId, SET_PROVIDER_SELECTOR, REASON_PROVIDER_CHECK_BYPASSED);
            return;
        }

        if (provider == address(0)) {
            emit GateBypass(jobId, SET_PROVIDER_SELECTOR, REASON_PROVIDER_ZERO);
            return;
        }

        uint256 agentId;
        try registry.resolveAgentId(provider) returns (uint256 id) {
            agentId = id;
        } catch (bytes memory reason) {
            emit ExternalLookupFailed(jobId, SET_PROVIDER_SELECTOR, STEP_RESOLVE_AGENT, reason);
            emit GateBypass(jobId, SET_PROVIDER_SELECTOR, REASON_PROVIDER_CHECK_BYPASSED);
            return;
        }

        if (agentId == 0) {
            revert ProviderNotRegistered(provider);
        }

        bool registered;
        try registry.isRegisteredAgent(agentId) returns (bool isRegistered) {
            registered = isRegistered;
        } catch (bytes memory reason) {
            emit ExternalLookupFailed(jobId, SET_PROVIDER_SELECTOR, STEP_IS_REGISTERED, reason);
            emit GateBypass(jobId, SET_PROVIDER_SELECTOR, REASON_PROVIDER_CHECK_BYPASSED);
            return;
        }

        if (!registered) {
            revert ProviderNotRegistered(provider);
        }
    }

    function _beforeReject(uint256 jobId) internal {
        RejectPreState snapshot = RejectPreState.None;
        try acp.getJobState(jobId) returns (IAresACPCompat.JobState state) {
            if (state == IAresACPCompat.JobState.Funded) {
                snapshot = RejectPreState.Funded;
            } else if (state == IAresACPCompat.JobState.Submitted) {
                snapshot = RejectPreState.Submitted;
            }
        } catch (bytes memory reason) {
            emit ExternalLookupFailed(jobId, REJECT_SELECTOR, STEP_GET_JOB_STATE, reason);
        }

        _rejectSnapshots[jobId] = snapshot;
        emit RejectSnapshotStored(jobId, snapshot);
    }

    function _afterSubmit(uint256 jobId, bytes calldata data) internal {
        (bool decoded, bytes memory optParams) = _safeDecodeSubmitOptParams(jobId, data);
        if (!decoded) {
            emit ScoreWriteSkipped(jobId, SUBMIT_SELECTOR, REASON_DECODE_FAILED);
            return;
        }
        _recordOutcome(jobId, SUBMIT_SELECTOR, JobOutcome.Submitted, optParams);
    }

    function _afterComplete(uint256 jobId, bytes calldata data) internal {
        (bool decoded, bytes memory optParams) = _safeDecodeResolutionOptParams(jobId, COMPLETE_SELECTOR, data);
        if (!decoded) {
            emit ScoreWriteSkipped(jobId, COMPLETE_SELECTOR, REASON_DECODE_FAILED);
            return;
        }
        _recordOutcome(jobId, COMPLETE_SELECTOR, JobOutcome.Completed, optParams);
    }

    function _afterReject(uint256 jobId, bytes calldata data) internal {
        RejectPreState snapshot = _rejectSnapshots[jobId];
        delete _rejectSnapshots[jobId];

        JobOutcome outcome;
        if (snapshot == RejectPreState.Submitted) {
            outcome = JobOutcome.RejectedAfterSubmit;
        } else if (snapshot == RejectPreState.Funded) {
            outcome = JobOutcome.RejectedBeforeSubmit;
        } else {
            emit RejectSnapshotMissing(jobId);
            outcome = JobOutcome.RejectedBeforeSubmit;
        }

        (bool decoded, bytes memory optParams) = _safeDecodeResolutionOptParams(jobId, REJECT_SELECTOR, data);
        if (!decoded) {
            emit ScoreWriteSkipped(jobId, REJECT_SELECTOR, REASON_DECODE_FAILED);
            return;
        }

        _recordOutcome(jobId, REJECT_SELECTOR, outcome, optParams);
    }

    function _recordOutcome(uint256 jobId, bytes4 selector, JobOutcome outcome, bytes memory optParams) internal {
        (bool providerOk, address provider) = _getProvider(jobId, selector);
        if (!providerOk) {
            emit ScoreWriteSkipped(jobId, selector, REASON_PROVIDER_LOOKUP_FAILED);
            return;
        }

        (AgentResolution resolution, uint256 agentId) = _resolveRegisteredAgent(provider, jobId, selector);
        if (resolution == AgentResolution.LookupFailed) {
            emit ScoreWriteSkipped(jobId, selector, REASON_AGENT_LOOKUP_FAILED);
            return;
        }
        if (resolution == AgentResolution.Unregistered) {
            emit ScoreWriteSkipped(jobId, selector, REASON_AGENT_UNREGISTERED);
            return;
        }

        (bool payloadOk, ScorePayload memory payload) = _safeDecodeScorePayload(jobId, selector, optParams);
        if (!payloadOk) {
            emit ScoreWriteSkipped(jobId, selector, REASON_SCORE_PAYLOAD_INVALID);
            return;
        }

        uint16[5] memory scores = _scoreProfiles[outcome];
        try scorecardLedger.recordActionScore(
            provider, payload.actionId, scores, payload.timestamp, payload.scorerSignature
        ) {
            emit JobOutcomeRecorded(jobId, agentId, outcome, payload.actionId);
        } catch (bytes memory reason) {
            emit ExternalLookupFailed(jobId, selector, STEP_RECORD_SCORE, reason);
            emit ScoreWriteSkipped(jobId, selector, REASON_LEDGER_WRITE_FAILED);
        }
    }

    function _setScoreProfile(JobOutcome outcome, uint16[5] memory scores, bool emitEvent) internal {
        _validateProfile(scores);
        _scoreProfiles[outcome] = scores;
        if (emitEvent) {
            emit ScoreProfileUpdated(outcome, scores);
        }
    }

    function _validateProfile(uint16[5] memory scores) internal pure {
        for (uint256 i = 0; i < 5; i++) {
            if (scores[i] > 200) {
                revert InvalidScoreProfile();
            }
        }
    }

    function _getProvider(uint256 jobId, bytes4 selector) internal returns (bool ok, address provider) {
        try acp.getJobProvider(jobId) returns (address p) {
            if (p == address(0)) {
                emit ScoreWriteSkipped(jobId, selector, REASON_PROVIDER_ZERO);
                return (false, address(0));
            }
            return (true, p);
        } catch (bytes memory reason) {
            emit ExternalLookupFailed(jobId, selector, STEP_GET_PROVIDER, reason);
            return (false, address(0));
        }
    }

    function _resolveRegisteredAgent(address provider, uint256 jobId, bytes4 selector)
        internal
        returns (AgentResolution resolution, uint256 agentId)
    {
        try registry.resolveAgentId(provider) returns (uint256 id) {
            agentId = id;
        } catch (bytes memory reason) {
            emit ExternalLookupFailed(jobId, selector, STEP_RESOLVE_AGENT, reason);
            return (AgentResolution.LookupFailed, 0);
        }

        if (agentId == 0) {
            return (AgentResolution.Unregistered, 0);
        }

        bool registered;
        try registry.isRegisteredAgent(agentId) returns (bool isRegistered) {
            registered = isRegistered;
        } catch (bytes memory reason) {
            emit ExternalLookupFailed(jobId, selector, STEP_IS_REGISTERED, reason);
            return (AgentResolution.LookupFailed, 0);
        }

        if (!registered) {
            return (AgentResolution.Unregistered, 0);
        }

        return (AgentResolution.Ok, agentId);
    }

    function _safeGetAri(uint256 agentId, uint256 jobId, bytes4 selector) internal returns (bool ok, uint256 score) {
        try ariEngine.getARIByAgentId(agentId) returns (
            uint256 ari,
            uint8,
            uint32,
            uint64,
            uint64
        ) {
            return (true, ari);
        } catch (bytes memory reason) {
            emit ExternalLookupFailed(jobId, selector, STEP_GET_ARI, reason);
            return (false, 0);
        }
    }

    function _safeDecodeSetProviderData(uint256 jobId, bytes calldata data)
        internal
        returns (bool ok, address provider, bytes memory optParams)
    {
        try this.decodeSetProviderInput(data) returns (address p, bytes memory opt) {
            return (true, p, opt);
        } catch (bytes memory reason) {
            emit ExternalLookupFailed(jobId, SET_PROVIDER_SELECTOR, STEP_DECODE_SET_PROVIDER, reason);
            return (false, address(0), bytes(""));
        }
    }

    function _safeDecodeSubmitOptParams(uint256 jobId, bytes calldata data)
        internal
        returns (bool ok, bytes memory optParams)
    {
        try this.decodeSubmitInput(data) returns (bytes32, bytes memory opt) {
            return (true, opt);
        } catch (bytes memory reason) {
            emit ExternalLookupFailed(jobId, SUBMIT_SELECTOR, STEP_DECODE_SUBMIT, reason);
            return (false, bytes(""));
        }
    }

    function _safeDecodeResolutionOptParams(uint256 jobId, bytes4 selector, bytes calldata data)
        internal
        returns (bool ok, bytes memory optParams)
    {
        try this.decodeResolutionInput(data) returns (bytes32, bytes memory opt) {
            return (true, opt);
        } catch (bytes memory reason) {
            emit ExternalLookupFailed(jobId, selector, STEP_DECODE_RESOLUTION, reason);
            return (false, bytes(""));
        }
    }

    function _safeDecodeScorePayload(uint256 jobId, bytes4 selector, bytes memory optParams)
        internal
        returns (bool ok, ScorePayload memory payload)
    {
        try this.decodeScorePayload(optParams) returns (ScorePayload memory decoded) {
            if (decoded.actionId == bytes32(0) || decoded.scorerSignature.length == 0) {
                return (false, payload);
            }
            return (true, decoded);
        } catch (bytes memory reason) {
            emit ExternalLookupFailed(jobId, selector, STEP_DECODE_SCORE, reason);
            return (false, payload);
        }
    }
}
