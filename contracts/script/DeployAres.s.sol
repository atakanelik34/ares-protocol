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
    function run() external {
        uint256 deployerPk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPk);

        vm.startBroadcast(deployerPk);

        AresToken token = new AresToken(deployer, deployer);
        AresRegistry registry = new AresRegistry(deployer, deployer, token, 100 ether, 2 days);

        uint256[] memory decay = new uint256[](731);
        decay[0] = 1e18;
        for (uint256 i = 1; i < 731; i++) {
            decay[i] = (decay[i - 1] * 99) / 100;
        }

        AresARIEngine engine = new AresARIEngine(deployer, deployer, registry, 0, decay);
        AresScorecardLedger ledger = new AresScorecardLedger(deployer, deployer, registry, engine);

        AresDispute dispute = new AresDispute(
            deployer,
            deployer,
            token,
            ledger,
            engine,
            deployer,
            10 ether,
            5 ether,
            3 days,
            1 ether,
            1000
        );

        AresApiAccess apiAccess = new AresApiAccess(deployer, deployer, token, token, deployer, deployer, 1000, 4000, 5000);
        apiAccess.upsertPlan(1, 100 ether, 30 days, true);

        ERC8004IdentityAdapter identityAdapter = new ERC8004IdentityAdapter(deployer, deployer, IAresRegistryForAdapter(address(registry)));
        ERC8004ReputationAdapter reputationAdapter = new ERC8004ReputationAdapter(
            deployer,
            deployer,
            IIdentityAdapterView(address(identityAdapter)),
            IAresRegistryView(address(registry)),
            IAresLedgerWriter(address(ledger))
        );
        ERC8004ValidationAdapter validationAdapter = new ERC8004ValidationAdapter(
            deployer, deployer, IAresDisputeAdapter(address(dispute))
        );

        registry.setAdapterRole(address(identityAdapter), true);
        dispute.setAdapterRole(address(validationAdapter), true);
        engine.grantRole(engine.LEDGER_ROLE(), address(ledger));
        engine.grantRole(engine.DISPUTE_ROLE(), address(dispute));
        ledger.grantRole(ledger.DISPUTE_ROLE(), address(dispute));

        console2.log("AresToken", address(token));
        console2.log("AresRegistry", address(registry));
        console2.log("AresARIEngine", address(engine));
        console2.log("AresScorecardLedger", address(ledger));
        console2.log("AresDispute", address(dispute));
        console2.log("AresApiAccess", address(apiAccess));
        console2.log("ERC8004IdentityAdapter", address(identityAdapter));
        console2.log("ERC8004ReputationAdapter", address(reputationAdapter));
        console2.log("ERC8004ValidationAdapter", address(validationAdapter));

        string memory obj = "ares";
        vm.serializeUint(obj, "chainId", block.chainid);
        vm.serializeAddress(obj, "deployer", deployer);
        vm.serializeAddress(obj, "AresToken", address(token));
        vm.serializeAddress(obj, "AresRegistry", address(registry));
        vm.serializeAddress(obj, "AresARIEngine", address(engine));
        vm.serializeAddress(obj, "AresScorecardLedger", address(ledger));
        vm.serializeAddress(obj, "AresDispute", address(dispute));
        vm.serializeAddress(obj, "AresApiAccess", address(apiAccess));
        vm.serializeAddress(obj, "ERC8004IdentityAdapter", address(identityAdapter));
        vm.serializeAddress(obj, "ERC8004ReputationAdapter", address(reputationAdapter));
        string memory json = vm.serializeAddress(obj, "ERC8004ValidationAdapter", address(validationAdapter));

        string memory root = vm.projectRoot();
        string memory outputPath = string.concat(root, "/latest-deploy.json");
        vm.writeJson(json, outputPath);
        console2.log("Deployment file", outputPath);

        vm.stopBroadcast();
    }
}
