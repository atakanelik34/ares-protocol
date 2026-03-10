// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IAresRegistry.sol";
import "../interfaces/IAresARIEngine.sol";

/// @title ARES ACP Read Adapter
/// @notice Stateless helper for ACP integrations to query ARES identity and ARI data.
contract AresACPAdapter {
    IAresRegistry public immutable registry;
    IAresARIEngine public immutable ariEngine;

    constructor(IAresRegistry registry_, IAresARIEngine ariEngine_) {
        require(address(registry_) != address(0), "invalid registry");
        require(address(ariEngine_) != address(0), "invalid ari");
        registry = registry_;
        ariEngine = ariEngine_;
    }

    /// @notice Returns ARI score and registration flag for a wallet.
    /// @param wallet Wallet to query.
    /// @return ariScore Agent ARI score in range 0..1000.
    /// @return isRegistered Whether wallet resolves to a registered ARES agent.
    function getAgentScore(address wallet) external view returns (uint256 ariScore, bool isRegistered) {
        return _getAgentScore(wallet);
    }

    /// @notice Checks if a wallet meets a minimum ARI threshold.
    /// @param wallet Wallet to query.
    /// @param minScore Minimum score required.
    /// @return True when wallet is registered and ARI >= minScore.
    function meetsReputationThreshold(address wallet, uint256 minScore) external view returns (bool) {
        (uint256 ariScore, bool isRegistered) = _getAgentScore(wallet);
        return isRegistered && ariScore >= minScore;
    }

    /// @notice Resolves ARES agent ID from a wallet.
    /// @param wallet Wallet to query.
    /// @return agentId Canonical ARES agent ID, or zero if unavailable.
    function getAgentId(address wallet) external view returns (uint256 agentId) {
        return _safeResolveAgentId(wallet);
    }

    function _getAgentScore(address wallet) internal view returns (uint256 ariScore, bool isRegistered) {
        uint256 agentId = _safeResolveAgentId(wallet);
        if (agentId == 0) {
            return (0, false);
        }

        isRegistered = _safeIsRegisteredAgent(agentId);
        if (!isRegistered) {
            return (0, false);
        }

        ariScore = _safeGetAri(agentId);
        return (ariScore, true);
    }

    function _safeResolveAgentId(address wallet) internal view returns (uint256 agentId) {
        try registry.resolveAgentId(wallet) returns (uint256 id) {
            return id;
        } catch {
            return 0;
        }
    }

    function _safeIsRegisteredAgent(uint256 agentId) internal view returns (bool) {
        try registry.isRegisteredAgent(agentId) returns (bool registered) {
            return registered;
        } catch {
            return false;
        }
    }

    function _safeGetAri(uint256 agentId) internal view returns (uint256 ariScore) {
        try ariEngine.getARIByAgentId(agentId) returns (
            uint256 ari,
            uint8,
            uint32,
            uint64,
            uint64
        ) {
            return ari;
        } catch {
            return 0;
        }
    }
}
