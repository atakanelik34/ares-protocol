// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/governance/TimelockController.sol";
import "@openzeppelin/contracts/governance/utils/IVotes.sol";
import "../token/AresGovernor.sol";

contract DeployGovernance is Script {
    struct Config {
        address tokenAddr;
        uint256 minDelay;
        bool openExecutor;
        bool keepBootstrapRoles;
        bool renounceTimelockAdmin;
        address bootstrapProposer;
    }

    function run() external {
        uint256 deployerPk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPk);

        Config memory cfg = Config({
            tokenAddr: vm.envAddress("ARES_TOKEN_ADDRESS"),
            minDelay: vm.envOr("GOVERNANCE_MIN_DELAY", uint256(2 days)),
            openExecutor: vm.envOr("GOVERNANCE_OPEN_EXECUTOR", true),
            keepBootstrapRoles: vm.envOr("GOVERNANCE_KEEP_BOOTSTRAP_ROLES", false),
            renounceTimelockAdmin: vm.envOr("GOVERNANCE_RENOUNCE_TIMELOCK_ADMIN", false),
            bootstrapProposer: vm.envOr("GOVERNANCE_BOOTSTRAP_PROPOSER", deployer)
        });

        address[] memory proposers;
        if (cfg.bootstrapProposer == address(0)) {
            proposers = new address[](0);
        } else {
            proposers = new address[](1);
            proposers[0] = cfg.bootstrapProposer;
        }

        address[] memory executors = new address[](1);
        executors[0] = cfg.openExecutor ? address(0) : deployer;

        vm.startBroadcast(deployerPk);

        TimelockController timelock = new TimelockController(cfg.minDelay, proposers, executors, deployer);
        AresGovernor governor = new AresGovernor(IVotes(cfg.tokenAddr), timelock);

        bytes32 proposerRole = timelock.PROPOSER_ROLE();
        bytes32 cancellerRole = timelock.CANCELLER_ROLE();
        bytes32 adminRole = timelock.TIMELOCK_ADMIN_ROLE();

        if (!timelock.hasRole(proposerRole, address(governor))) {
            timelock.grantRole(proposerRole, address(governor));
        }
        if (!timelock.hasRole(cancellerRole, address(governor))) {
            timelock.grantRole(cancellerRole, address(governor));
        }

        if (!cfg.keepBootstrapRoles && cfg.bootstrapProposer != address(0)) {
            if (timelock.hasRole(proposerRole, cfg.bootstrapProposer)) {
                timelock.revokeRole(proposerRole, cfg.bootstrapProposer);
            }
            if (timelock.hasRole(cancellerRole, cfg.bootstrapProposer)) {
                timelock.revokeRole(cancellerRole, cfg.bootstrapProposer);
            }
        }

        if (cfg.renounceTimelockAdmin && timelock.hasRole(adminRole, deployer)) {
            timelock.renounceRole(adminRole, deployer);
        }

        console2.log("TimelockController", address(timelock));
        console2.log("AresGovernor", address(governor));
        console2.log("Governance minDelay", cfg.minDelay);

        string memory obj = "governance";
        vm.serializeUint(obj, "chainId", block.chainid);
        vm.serializeAddress(obj, "deployer", deployer);
        vm.serializeAddress(obj, "AresToken", cfg.tokenAddr);
        vm.serializeAddress(obj, "TimelockController", address(timelock));
        vm.serializeAddress(obj, "AresGovernor", address(governor));
        vm.serializeUint(obj, "minDelay", cfg.minDelay);
        vm.serializeBool(obj, "openExecutor", cfg.openExecutor);
        vm.serializeBool(obj, "keepBootstrapRoles", cfg.keepBootstrapRoles);
        string memory json = vm.serializeBool(obj, "renounceTimelockAdmin", cfg.renounceTimelockAdmin);

        string memory root = vm.projectRoot();
        string memory outputPath = string.concat(root, "/latest-governance.json");
        vm.writeJson(json, outputPath);
        console2.log("Governance deployment file", outputPath);

        vm.stopBroadcast();
    }
}
