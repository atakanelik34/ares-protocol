// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/governance/TimelockController.sol";
import "@openzeppelin/contracts/governance/utils/IVotes.sol";
import "../token/AresGovernor.sol";

contract DeployGovernance is Script {
    function run() external {
        uint256 deployerPk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPk);

        address tokenAddr = vm.envAddress("ARES_TOKEN_ADDRESS");
        uint256 minDelay = vm.envOr("GOVERNANCE_MIN_DELAY", uint256(2 days));
        bool openExecutor = vm.envOr("GOVERNANCE_OPEN_EXECUTOR", true);
        bool keepBootstrapRoles = vm.envOr("GOVERNANCE_KEEP_BOOTSTRAP_ROLES", false);
        bool renounceTimelockAdmin = vm.envOr("GOVERNANCE_RENOUNCE_TIMELOCK_ADMIN", false);

        address bootstrapProposer = vm.envOr("GOVERNANCE_BOOTSTRAP_PROPOSER", deployer);

        address[] memory proposers;
        if (bootstrapProposer == address(0)) {
            proposers = new address[](0);
        } else {
            proposers = new address[](1);
            proposers[0] = bootstrapProposer;
        }

        address[] memory executors = new address[](1);
        executors[0] = openExecutor ? address(0) : deployer;

        vm.startBroadcast(deployerPk);

        TimelockController timelock = new TimelockController(minDelay, proposers, executors, deployer);
        AresGovernor governor = new AresGovernor(IVotes(tokenAddr), timelock);

        bytes32 proposerRole = timelock.PROPOSER_ROLE();
        bytes32 cancellerRole = timelock.CANCELLER_ROLE();
        bytes32 adminRole = timelock.TIMELOCK_ADMIN_ROLE();

        if (!timelock.hasRole(proposerRole, address(governor))) {
            timelock.grantRole(proposerRole, address(governor));
        }
        if (!timelock.hasRole(cancellerRole, address(governor))) {
            timelock.grantRole(cancellerRole, address(governor));
        }

        if (!keepBootstrapRoles && bootstrapProposer != address(0)) {
            if (timelock.hasRole(proposerRole, bootstrapProposer)) {
                timelock.revokeRole(proposerRole, bootstrapProposer);
            }
            if (timelock.hasRole(cancellerRole, bootstrapProposer)) {
                timelock.revokeRole(cancellerRole, bootstrapProposer);
            }
        }

        if (renounceTimelockAdmin && timelock.hasRole(adminRole, deployer)) {
            timelock.renounceRole(adminRole, deployer);
        }

        console2.log("TimelockController", address(timelock));
        console2.log("AresGovernor", address(governor));
        console2.log("Governance minDelay", minDelay);

        string memory obj = "governance";
        vm.serializeUint(obj, "chainId", block.chainid);
        vm.serializeAddress(obj, "deployer", deployer);
        vm.serializeAddress(obj, "AresToken", tokenAddr);
        vm.serializeAddress(obj, "TimelockController", address(timelock));
        vm.serializeAddress(obj, "AresGovernor", address(governor));
        vm.serializeUint(obj, "minDelay", minDelay);
        vm.serializeBool(obj, "openExecutor", openExecutor);
        vm.serializeBool(obj, "keepBootstrapRoles", keepBootstrapRoles);
        string memory json = vm.serializeBool(obj, "renounceTimelockAdmin", renounceTimelockAdmin);

        string memory root = vm.projectRoot();
        string memory outputPath = string.concat(root, "/latest-governance.json");
        vm.writeJson(json, outputPath);
        console2.log("Governance deployment file", outputPath);

        vm.stopBroadcast();
    }
}
