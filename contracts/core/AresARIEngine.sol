// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "../interfaces/IAresARIEngine.sol";
import "../interfaces/IAresProtocol.sol";
import "../interfaces/IAresRegistry.sol";

contract AresARIEngine is AccessControl, IAresARIEngine, IAresProtocol {
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant LEDGER_ROLE = keccak256("LEDGER_ROLE");
    bytes32 public constant DISPUTE_ROLE = keccak256("DISPUTE_ROLE");

    uint256 public constant ONE = 1e18;
    uint256 public constant MAX_DAYS_SATURATION = 10_000;

    struct AgentState {
        uint256[5] decayedSum;
        uint64 lastUpdate;
        uint32 totalActionsCount;
        uint32 validActionsCount;
        uint64 firstActionAt;
    }

    IAresRegistry public immutable registry;

    uint16[5] private _weightsBps;
    uint256 private _lambda;
    uint256[] public precomputedDecay;

    mapping(uint256 => AgentState) public agentStates;

    event ARIUpdated(uint256 indexed agentId, uint256 ari, uint8 tier, uint32 actionsCount);
    event WeightsUpdated(uint16[5] oldWeights, uint16[5] newWeights);
    event LambdaUpdated(uint256 oldLambda, uint256 newLambda);
    event DecayTableUpdated(uint256 length);

    error AgentNotRegistered();
    error InvalidDecayTable();
    error InvalidWeights();

    constructor(address admin, address governance, IAresRegistry registry_, uint256 lambda_, uint256[] memory decayTable_) {
        require(admin != address(0), "invalid admin");
        require(governance != address(0), "invalid governance");
        require(address(registry_) != address(0), "invalid registry");

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GOVERNANCE_ROLE, governance);

        registry = registry_;
        _weightsBps = [3000, 2500, 2000, 1500, 1000];
        _lambda = lambda_;

        _setDecayTable(decayTable_);
    }

    function applyActionScore(uint256 agentId, uint16[5] calldata scores, uint64 actionTimestamp)
        external
        override
        onlyRole(LEDGER_ROLE)
    {
        if (!registry.isRegisteredAgent(agentId)) revert AgentNotRegistered();
        if (actionTimestamp > block.timestamp) {
            actionTimestamp = uint64(block.timestamp);
        }

        _syncStorage(agentId);
        AgentState storage state = agentStates[agentId];

        if (state.firstActionAt == 0) {
            state.firstActionAt = actionTimestamp;
        }

        for (uint256 i = 0; i < 5; i++) {
            state.decayedSum[i] += uint256(scores[i]) * ONE;
        }

        state.totalActionsCount += 1;
        state.validActionsCount += 1;

        (uint256 ari, uint8 tier,,,) = getARIByAgentId(agentId);
        emit ARIUpdated(agentId, ari, tier, state.validActionsCount);
    }

    function invalidateActionContribution(uint256 agentId, uint16[5] calldata scores, uint64 actionTimestamp)
        external
        override
        onlyRole(DISPUTE_ROLE)
    {
        _syncStorage(agentId);

        AgentState storage state = agentStates[agentId];
        if (state.validActionsCount > 0) {
            state.validActionsCount -= 1;
        }

        uint256 daysSince = 0;
        if (block.timestamp > actionTimestamp) {
            daysSince = (block.timestamp - actionTimestamp) / 1 days;
        }
        uint256 factor = _decayFactor(daysSince);

        for (uint256 i = 0; i < 5; i++) {
            uint256 contribution = (uint256(scores[i]) * factor);
            if (state.decayedSum[i] > contribution) {
                state.decayedSum[i] -= contribution;
            } else {
                state.decayedSum[i] = 0;
            }
        }

        (uint256 ari, uint8 tier,,,) = getARIByAgentId(agentId);
        emit ARIUpdated(agentId, ari, tier, state.validActionsCount);
    }

    function syncAgent(uint256 agentId) external {
        _syncStorage(agentId);
    }

    function _syncStorage(uint256 agentId) internal {
        AgentState storage state = agentStates[agentId];

        if (state.lastUpdate == 0) {
            state.lastUpdate = uint64(block.timestamp);
            return;
        }

        uint256 elapsedDays = (block.timestamp - state.lastUpdate) / 1 days;
        if (elapsedDays == 0) {
            return;
        }

        uint256 factor = _decayFactor(elapsedDays);

        for (uint256 i = 0; i < 5; i++) {
            state.decayedSum[i] = (state.decayedSum[i] * factor) / ONE;
        }

        state.lastUpdate = uint64(block.timestamp);
    }

    function _decayFactor(uint256 elapsedDays) internal view returns (uint256) {
        if (precomputedDecay.length == 0) {
            return ONE;
        }

        if (elapsedDays > MAX_DAYS_SATURATION) {
            elapsedDays = MAX_DAYS_SATURATION;
        }

        uint256 maxIndex = precomputedDecay.length - 1;
        if (elapsedDays <= maxIndex) {
            return precomputedDecay[elapsedDays];
        }

        uint256 base = precomputedDecay[maxIndex];
        uint256 quotient = elapsedDays / maxIndex;
        uint256 remainder = elapsedDays % maxIndex;

        uint256 qPow = _powFixed(base, quotient);
        uint256 rFactor = precomputedDecay[remainder];

        return (qPow * rFactor) / ONE;
    }

    function _powFixed(uint256 base, uint256 exponent) internal pure returns (uint256 result) {
        result = ONE;
        while (exponent > 0) {
            if ((exponent & 1) == 1) {
                result = (result * base) / ONE;
            }
            base = (base * base) / ONE;
            exponent >>= 1;
        }
    }

    function getARIByAgentId(uint256 agentId)
        public
        view
        override
        returns (uint256 ari, uint8 tier, uint32 actionsCount, uint64 firstActionAt, uint64 lastUpdate)
    {
        AgentState memory state = agentStates[agentId];
        if (state.lastUpdate != 0) {
            uint256 elapsedDays = (block.timestamp - state.lastUpdate) / 1 days;
            if (elapsedDays > 0) {
                uint256 factor = _decayFactor(elapsedDays);
                for (uint256 i = 0; i < 5; i++) {
                    state.decayedSum[i] = (state.decayedSum[i] * factor) / ONE;
                }
                state.lastUpdate = uint64(block.timestamp);
            }
        }

        ari = _computeARI(state.decayedSum, state.validActionsCount);
        tier = getTierByScore(ari);
        actionsCount = state.validActionsCount;
        firstActionAt = state.firstActionAt;
        lastUpdate = state.lastUpdate;
    }

    function _computeARI(uint256[5] memory decayedSums, uint32 validActionsCount) internal view returns (uint256 ari) {
        uint256 dailyDecay = precomputedDecay.length > 1 ? precomputedDecay[1] : ONE;
        uint256 normalizationFactor = dailyDecay <= ONE ? (ONE - dailyDecay) : 0;

        uint256 weighted = 0;
        for (uint256 i = 0; i < 5; i++) {
            uint256 normalizedDim = normalizationFactor == 0 ? decayedSums[i] : (decayedSums[i] * normalizationFactor) / ONE;
            if (normalizedDim > 200 * ONE) {
                normalizedDim = 200 * ONE;
            }
            weighted += (normalizedDim * _weightsBps[i]) / 10_000;
        }

        uint256 volume = validActionsCount >= 100 ? ONE : (uint256(validActionsCount) * ONE) / 100;
        uint256 raw = (weighted * volume) / ONE;
        ari = (raw * 1000) / (200 * ONE);
        if (ari > 1000) {
            ari = 1000;
        }
    }

    function getScore(address agent) external view override returns (uint256 ari) {
        uint256 agentId = registry.resolveAgentId(agent);
        if (agentId == 0) return 0;
        (ari,,,,) = getARIByAgentId(agentId);
    }

    function getARIDetails(address agent)
        external
        view
        override
        returns (uint256 ari, uint8 tier, uint32 actionsCount, uint64 firstActionAt, uint64 lastUpdate)
    {
        uint256 agentId = registry.resolveAgentId(agent);
        if (agentId == 0) {
            return (0, 0, 0, 0, 0);
        }
        return getARIByAgentId(agentId);
    }

    function getTier(address agent) external view override returns (uint8 tier) {
        uint256 agentId = registry.resolveAgentId(agent);
        if (agentId == 0) return 0;
        (, tier,,,) = getARIByAgentId(agentId);
    }

    function getTierByScore(uint256 score) public pure override returns (uint8 tier) {
        if (score <= 99) return 0;
        if (score <= 299) return 1;
        if (score <= 599) return 2;
        if (score <= 849) return 3;
        return 4;
    }

    function isRegistered(address agent) external view override returns (bool) {
        uint256 agentId = registry.resolveAgentId(agent);
        if (agentId == 0) return false;
        return registry.isRegisteredAgent(agentId);
    }

    function getWeights() external view returns (uint16[5] memory) {
        return _weightsBps;
    }

    function getLambda() external view returns (uint256) {
        return _lambda;
    }

    function getParams() external view returns (uint256 maxDays, uint256 decayTableLength) {
        return (MAX_DAYS_SATURATION, precomputedDecay.length);
    }

    function setWeights(uint16[5] calldata newWeights) external onlyRole(GOVERNANCE_ROLE) {
        uint256 sum = 0;
        for (uint256 i = 0; i < 5; i++) {
            sum += newWeights[i];
        }
        if (sum != 10_000) revert InvalidWeights();

        uint16[5] memory old = _weightsBps;
        _weightsBps = newWeights;

        emit WeightsUpdated(old, newWeights);
    }

    function setLambda(uint256 newLambda) external onlyRole(GOVERNANCE_ROLE) {
        uint256 old = _lambda;
        _lambda = newLambda;
        emit LambdaUpdated(old, newLambda);
    }

    function setDecayTable(uint256[] calldata decayTable) external onlyRole(GOVERNANCE_ROLE) {
        _setDecayTable(decayTable);
    }

    function _setDecayTable(uint256[] memory decayTable) internal {
        if (decayTable.length < 2 || decayTable[0] != ONE) revert InvalidDecayTable();

        for (uint256 i = 1; i < decayTable.length; i++) {
            if (decayTable[i] > decayTable[i - 1]) revert InvalidDecayTable();
        }

        delete precomputedDecay;
        for (uint256 i = 0; i < decayTable.length; i++) {
            precomputedDecay.push(decayTable[i]);
        }

        emit DecayTableUpdated(decayTable.length);
    }
}
