// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/governance/TimelockController.sol";

interface IManagedRoles {
    function DEFAULT_ADMIN_ROLE() external view returns (bytes32);
    function GOVERNANCE_ROLE() external view returns (bytes32);
    function hasRole(bytes32 role, address account) external view returns (bool);
    function grantRole(bytes32 role, address account) external;
    function renounceRole(bytes32 role, address account) external;
}

interface ITokenRoles {
    function DEFAULT_ADMIN_ROLE() external view returns (bytes32);
    function MINTER_ROLE() external view returns (bytes32);
    function hasRole(bytes32 role, address account) external view returns (bool);
    function grantRole(bytes32 role, address account) external;
    function renounceRole(bytes32 role, address account) external;
}

contract HandoffGovernance is Script {
    struct Targets {
        address timelock;
        address governor;
        address token;
        address registry;
        address engine;
        address ledger;
        address dispute;
        address apiAccess;
        address identityAdapter;
        address reputationAdapter;
        address validationAdapter;
    }

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

        Targets memory t = Targets({
            timelock: vm.envAddress("TIMELOCK_CONTROLLER_ADDRESS"),
            governor: vm.envAddress("ARES_GOVERNOR_ADDRESS"),
            token: vm.envAddress("ARES_TOKEN_ADDRESS"),
            registry: vm.envAddress("ARES_REGISTRY_ADDRESS"),
            engine: vm.envAddress("ARES_ARI_ENGINE_ADDRESS"),
            ledger: vm.envAddress("ARES_SCORECARD_LEDGER_ADDRESS"),
            dispute: vm.envAddress("ARES_DISPUTE_ADDRESS"),
            apiAccess: vm.envAddress("ARES_API_ACCESS_ADDRESS"),
            identityAdapter: vm.envAddress("ERC8004_IDENTITY_ADAPTER_ADDRESS"),
            reputationAdapter: vm.envAddress("ERC8004_REPUTATION_ADAPTER_ADDRESS"),
            validationAdapter: vm.envAddress("ERC8004_VALIDATION_ADAPTER_ADDRESS")
        });

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

        TimelockController timelock = TimelockController(payable(t.timelock));
        ITokenRoles token = ITokenRoles(t.token);

        _syncTimelockRoles(timelock, t.governor, deployer, policy);

        _syncManagedContractRoles(IManagedRoles(t.registry), t.timelock, deployer, policy);
        _syncManagedContractRoles(IManagedRoles(t.engine), t.timelock, deployer, policy);
        _syncManagedContractRoles(IManagedRoles(t.ledger), t.timelock, deployer, policy);
        _syncManagedContractRoles(IManagedRoles(t.dispute), t.timelock, deployer, policy);
        _syncManagedContractRoles(IManagedRoles(t.apiAccess), t.timelock, deployer, policy);
        _syncManagedContractRoles(IManagedRoles(t.identityAdapter), t.timelock, deployer, policy);
        _syncManagedContractRoles(IManagedRoles(t.reputationAdapter), t.timelock, deployer, policy);
        _syncManagedContractRoles(IManagedRoles(t.validationAdapter), t.timelock, deployer, policy);

        _syncTokenRoles(token, t.timelock, deployer, policy);

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
            _renounceIfPresent(target, adminRole, deployer);
        }
        if (!policy.keepDeployerGovernance) {
            _renounceIfPresent(target, governanceRole, deployer);
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
            _renounceIfPresent(token, adminRole, deployer);
        }
        if (!policy.keepDeployerMinter) {
            _renounceIfPresent(token, minterRole, deployer);
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
            _renounceIfPresent(timelock, proposerRole, deployer);
        }
        if (!policy.keepDeployerTimelockCanceller) {
            _renounceIfPresent(timelock, cancellerRole, deployer);
        }
        if (!policy.keepDeployerTimelockAdmin) {
            _renounceIfPresent(timelock, adminRole, deployer);
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

    function _renounceIfPresent(IManagedRoles target, bytes32 role, address account) internal {
        if (target.hasRole(role, account)) {
            target.renounceRole(role, account);
        }
    }

    function _renounceIfPresent(ITokenRoles target, bytes32 role, address account) internal {
        if (target.hasRole(role, account)) {
            target.renounceRole(role, account);
        }
    }

    function _renounceIfPresent(TimelockController target, bytes32 role, address account) internal {
        if (target.hasRole(role, account)) {
            target.renounceRole(role, account);
        }
    }
}
