// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../token/AresToken.sol";
import "../core/AresRegistry.sol";
import "../core/AresARIEngine.sol";
import "../core/AresScorecardLedger.sol";
import "../core/AresDispute.sol";
import "../core/AresApiAccess.sol";
import "../erc8004-adapters/ERC8004IdentityAdapter.sol";
import "../erc8004-adapters/ERC8004ReputationAdapter.sol";
import "../erc8004-adapters/ERC8004ValidationAdapter.sol";

contract DeployAres is Script {
    struct DisputeConfig {
        uint256 minChallengerStake;
        uint256 minValidatorStake;
        uint64 votingPeriod;
        uint256 quorum;
        uint16 slashingBps;
    }

    struct Deployment {
        AresToken token;
        AresRegistry registry;
        AresARIEngine engine;
        AresScorecardLedger ledger;
        AresDispute dispute;
        AresApiAccess apiAccess;
        ERC8004IdentityAdapter identityAdapter;
        ERC8004ReputationAdapter reputationAdapter;
        ERC8004ValidationAdapter validationAdapter;
    }

    function run() external {
        uint256 deployerPk = vm.envUint("ARES_DEPLOYER_KEY");
        address deployer = vm.addr(deployerPk);
        DisputeConfig memory disputeConfig = _loadDisputeConfig();

        vm.startBroadcast(deployerPk);
        Deployment memory deployment = _deployProtocol(deployer, disputeConfig);
        _logDeployment(deployment);
        string memory json = _serializeDeployment(deployer, deployment, disputeConfig);

        string memory root = vm.projectRoot();
        string memory outputPath = string.concat(root, "/latest-deploy.json");
        vm.writeJson(json, outputPath);
        console2.log("Deployment file", outputPath);

        vm.stopBroadcast();
    }

    function _loadDisputeConfig() internal view returns (DisputeConfig memory cfg) {
        cfg.minChallengerStake = vm.envOr("DISPUTE_MIN_CHALLENGER_STAKE", uint256(10 ether));
        cfg.minValidatorStake = vm.envOr("DISPUTE_MIN_VALIDATOR_STAKE", uint256(5 ether));
        cfg.votingPeriod = uint64(vm.envOr("DISPUTE_VOTING_PERIOD_SECONDS", uint256(3 days)));
        cfg.quorum = vm.envOr("DISPUTE_QUORUM", uint256(1 ether));
        cfg.slashingBps = uint16(vm.envOr("DISPUTE_SLASHING_BPS", uint256(1000)));
    }

    function _deployProtocol(address deployer, DisputeConfig memory disputeConfig)
        internal
        returns (Deployment memory deployment)
    {
        deployment.token = new AresToken(deployer, deployer);
        deployment.registry = new AresRegistry(deployer, deployer, deployment.token, 100 ether, 2 days);
        deployment.engine = new AresARIEngine(deployer, deployer, deployment.registry, 0, _buildDecayTable());
        deployment.ledger = new AresScorecardLedger(deployer, deployer, deployment.registry, deployment.engine);

        deployment.dispute = new AresDispute(
            deployer,
            deployer,
            deployment.token,
            deployment.ledger,
            deployment.engine,
            deployer,
            disputeConfig.minChallengerStake,
            disputeConfig.minValidatorStake,
            disputeConfig.votingPeriod,
            disputeConfig.quorum,
            disputeConfig.slashingBps
        );

        deployment.apiAccess =
            new AresApiAccess(deployer, deployer, deployment.token, deployment.token, deployer, deployer, 1000, 4000, 5000);
        deployment.apiAccess.upsertPlan(1, 100 ether, 30 days, true);

        deployment.identityAdapter =
            new ERC8004IdentityAdapter(deployer, deployer, IAresRegistryForAdapter(address(deployment.registry)));
        deployment.reputationAdapter = new ERC8004ReputationAdapter(
            deployer,
            deployer,
            IIdentityAdapterView(address(deployment.identityAdapter)),
            IAresRegistryView(address(deployment.registry)),
            IAresLedgerWriter(address(deployment.ledger))
        );
        deployment.validationAdapter =
            new ERC8004ValidationAdapter(deployer, deployer, IAresDisputeAdapter(address(deployment.dispute)));

        deployment.registry.setAdapterRole(address(deployment.identityAdapter), true);
        deployment.dispute.setAdapterRole(address(deployment.validationAdapter), true);
        deployment.engine.grantRole(deployment.engine.LEDGER_ROLE(), address(deployment.ledger));
        deployment.engine.grantRole(deployment.engine.DISPUTE_ROLE(), address(deployment.dispute));
        deployment.ledger.grantRole(deployment.ledger.DISPUTE_ROLE(), address(deployment.dispute));
    }

    function _buildDecayTable() internal pure returns (uint256[] memory decay) {
        decay = new uint256[](731);
        decay[0] = 1e18;
        for (uint256 i = 1; i < 731; i++) {
            decay[i] = (decay[i - 1] * 99) / 100;
        }
    }

    function _logDeployment(Deployment memory deployment) internal view {
        console2.log("AresToken", address(deployment.token));
        console2.log("AresRegistry", address(deployment.registry));
        console2.log("AresARIEngine", address(deployment.engine));
        console2.log("AresScorecardLedger", address(deployment.ledger));
        console2.log("AresDispute", address(deployment.dispute));
        console2.log("AresApiAccess", address(deployment.apiAccess));
        console2.log("ERC8004IdentityAdapter", address(deployment.identityAdapter));
        console2.log("ERC8004ReputationAdapter", address(deployment.reputationAdapter));
        console2.log("ERC8004ValidationAdapter", address(deployment.validationAdapter));
    }

    function _serializeDeployment(address deployer, Deployment memory deployment, DisputeConfig memory disputeConfig)
        internal
        returns (string memory json)
    {
        string memory obj = "ares";
        vm.serializeUint(obj, "chainId", block.chainid);
        vm.serializeAddress(obj, "deployer", deployer);
        vm.serializeAddress(obj, "AresToken", address(deployment.token));
        vm.serializeAddress(obj, "AresRegistry", address(deployment.registry));
        vm.serializeAddress(obj, "AresARIEngine", address(deployment.engine));
        vm.serializeAddress(obj, "AresScorecardLedger", address(deployment.ledger));
        vm.serializeAddress(obj, "AresDispute", address(deployment.dispute));
        vm.serializeAddress(obj, "AresApiAccess", address(deployment.apiAccess));
        vm.serializeAddress(obj, "ERC8004IdentityAdapter", address(deployment.identityAdapter));
        vm.serializeAddress(obj, "ERC8004ReputationAdapter", address(deployment.reputationAdapter));
        vm.serializeUint(obj, "disputeMinChallengerStake", disputeConfig.minChallengerStake);
        vm.serializeUint(obj, "disputeMinValidatorStake", disputeConfig.minValidatorStake);
        vm.serializeUint(obj, "disputeVotingPeriod", disputeConfig.votingPeriod);
        vm.serializeUint(obj, "disputeQuorum", disputeConfig.quorum);
        vm.serializeUint(obj, "disputeSlashingBps", disputeConfig.slashingBps);
        json = vm.serializeAddress(obj, "ERC8004ValidationAdapter", address(deployment.validationAdapter));
    }
}
