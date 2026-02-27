// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/governance/TimelockController.sol";

interface IManagedRoles {
    function DEFAULT_ADMIN_ROLE() external view returns (bytes32);
    function GOVERNANCE_ROLE() external view returns (bytes32);
    function hasRole(bytes32 role, address account) external view returns (bool);
    function grantRole(bytes32 role, address account) external;
    function revokeRole(bytes32 role, address account) external;
}

interface ITokenRoles {
    function DEFAULT_ADMIN_ROLE() external view returns (bytes32);
    function MINTER_ROLE() external view returns (bytes32);
    function hasRole(bytes32 role, address account) external view returns (bool);
    function grantRole(bytes32 role, address account) external;
    function revokeRole(bytes32 role, address account) external;
}

contract HandoffGovernance is Script {
    struct RolePolicy {
        bool keepDeployerAdmin;
        bool keepDeployerGovernance;
        bool keepDeployerMinter;
        bool grantTimelockMinter;
        bool keepDeployerTimelockAdmin;
        bool keepDeployerTimelockProposer;
        bool keepDeployerTimelockCanceller;
    }

    function run() external {
        uint256 deployerPk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPk);

        address timelockAddr = vm.envAddress("TIMELOCK_CONTROLLER_ADDRESS");
        address governorAddr = vm.envAddress("ARES_GOVERNOR_ADDRESS");

        address tokenAddr = vm.envAddress("ARES_TOKEN_ADDRESS");
        address registryAddr = vm.envAddress("ARES_REGISTRY_ADDRESS");
        address engineAddr = vm.envAddress("ARES_ARI_ENGINE_ADDRESS");
        address ledgerAddr = vm.envAddress("ARES_SCORECARD_LEDGER_ADDRESS");
        address disputeAddr = vm.envAddress("ARES_DISPUTE_ADDRESS");
        address apiAccessAddr = vm.envAddress("ARES_API_ACCESS_ADDRESS");
        address identityAdapterAddr = vm.envAddress("ERC8004_IDENTITY_ADAPTER_ADDRESS");
        address reputationAdapterAddr = vm.envAddress("ERC8004_REPUTATION_ADAPTER_ADDRESS");
        address validationAdapterAddr = vm.envAddress("ERC8004_VALIDATION_ADAPTER_ADDRESS");

        RolePolicy memory policy = RolePolicy({
            keepDeployerAdmin: vm.envOr("HANDOFF_KEEP_DEPLOYER_ADMIN", true),
            keepDeployerGovernance: vm.envOr("HANDOFF_KEEP_DEPLOYER_GOVERNANCE", true),
            keepDeployerMinter: vm.envOr("HANDOFF_KEEP_DEPLOYER_MINTER", true),
            grantTimelockMinter: vm.envOr("HANDOFF_GRANT_TIMELOCK_MINTER", true),
            keepDeployerTimelockAdmin: vm.envOr("HANDOFF_KEEP_DEPLOYER_TIMELOCK_ADMIN", true),
            keepDeployerTimelockProposer: vm.envOr("HANDOFF_KEEP_DEPLOYER_TIMELOCK_PROPOSER", true),
            keepDeployerTimelockCanceller: vm.envOr("HANDOFF_KEEP_DEPLOYER_TIMELOCK_CANCELLER", true)
        });

        vm.startBroadcast(deployerPk);

        TimelockController timelock = TimelockController(payable(timelockAddr));
        ITokenRoles token = ITokenRoles(tokenAddr);

        _syncTimelockRoles(timelock, governorAddr, deployer, policy);

        _syncManagedContractRoles(IManagedRoles(registryAddr), timelockAddr, deployer, policy);
        _syncManagedContractRoles(IManagedRoles(engineAddr), timelockAddr, deployer, policy);
        _syncManagedContractRoles(IManagedRoles(ledgerAddr), timelockAddr, deployer, policy);
        _syncManagedContractRoles(IManagedRoles(disputeAddr), timelockAddr, deployer, policy);
        _syncManagedContractRoles(IManagedRoles(apiAccessAddr), timelockAddr, deployer, policy);
        _syncManagedContractRoles(IManagedRoles(identityAdapterAddr), timelockAddr, deployer, policy);
        _syncManagedContractRoles(IManagedRoles(reputationAdapterAddr), timelockAddr, deployer, policy);
        _syncManagedContractRoles(IManagedRoles(validationAdapterAddr), timelockAddr, deployer, policy);

        _syncTokenRoles(token, timelockAddr, deployer, policy);

        vm.stopBroadcast();
    }

    function _syncManagedContractRoles(IManagedRoles target, address timelock, address deployer, RolePolicy memory policy)
        internal
    {
        bytes32 adminRole = target.DEFAULT_ADMIN_ROLE();
        bytes32 governanceRole = target.GOVERNANCE_ROLE();

        _grantIfMissing(target, adminRole, timelock);
        _grantIfMissing(target, governanceRole, timelock);

        if (!policy.keepDeployerAdmin) {
            _revokeIfPresent(target, adminRole, deployer);
        }
        if (!policy.keepDeployerGovernance) {
            _revokeIfPresent(target, governanceRole, deployer);
        }
    }

    function _syncTokenRoles(ITokenRoles token, address timelock, address deployer, RolePolicy memory policy) internal {
        bytes32 adminRole = token.DEFAULT_ADMIN_ROLE();
        bytes32 minterRole = token.MINTER_ROLE();

        _grantIfMissing(token, adminRole, timelock);
        if (policy.grantTimelockMinter) {
            _grantIfMissing(token, minterRole, timelock);
        }

        if (!policy.keepDeployerAdmin) {
            _revokeIfPresent(token, adminRole, deployer);
        }
        if (!policy.keepDeployerMinter) {
            _revokeIfPresent(token, minterRole, deployer);
        }
    }

    function _syncTimelockRoles(TimelockController timelock, address governor, address deployer, RolePolicy memory policy)
        internal
    {
        bytes32 proposerRole = timelock.PROPOSER_ROLE();
        bytes32 cancellerRole = timelock.CANCELLER_ROLE();
        bytes32 adminRole = timelock.TIMELOCK_ADMIN_ROLE();

        _grantIfMissing(timelock, proposerRole, governor);
        _grantIfMissing(timelock, cancellerRole, governor);

        if (!policy.keepDeployerTimelockProposer) {
            _revokeIfPresent(timelock, proposerRole, deployer);
        }
        if (!policy.keepDeployerTimelockCanceller) {
            _revokeIfPresent(timelock, cancellerRole, deployer);
        }
        if (!policy.keepDeployerTimelockAdmin) {
            if (timelock.hasRole(adminRole, deployer)) {
                timelock.renounceRole(adminRole, deployer);
            }
        }
    }

    function _grantIfMissing(IManagedRoles target, bytes32 role, address account) internal {
        if (!target.hasRole(role, account)) {
            target.grantRole(role, account);
        }
    }

    function _grantIfMissing(ITokenRoles target, bytes32 role, address account) internal {
        if (!target.hasRole(role, account)) {
            target.grantRole(role, account);
        }
    }

    function _grantIfMissing(TimelockController target, bytes32 role, address account) internal {
        if (!target.hasRole(role, account)) {
            target.grantRole(role, account);
        }
    }

    function _revokeIfPresent(IManagedRoles target, bytes32 role, address account) internal {
        if (target.hasRole(role, account)) {
            target.revokeRole(role, account);
        }
    }

    function _revokeIfPresent(ITokenRoles target, bytes32 role, address account) internal {
        if (target.hasRole(role, account)) {
            target.revokeRole(role, account);
        }
    }

    function _revokeIfPresent(TimelockController target, bytes32 role, address account) internal {
        if (target.hasRole(role, account)) {
            target.revokeRole(role, account);
        }
    }
}
