// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../token/AresToken.sol";
import "../core/AresRegistry.sol";
import "../core/AresARIEngine.sol";

contract AresARIEngineTest is Test {
    AresToken token;
    AresRegistry registry;
    AresARIEngine engine;

    address operator = address(0x1234);

    function setUp() public {
        token = new AresToken(address(this), address(this));
        registry = new AresRegistry(address(this), address(this), token, 100 ether, 1 days);

        uint256[] memory decay = new uint256[](731);
        decay[0] = 1e18;
        for (uint256 i = 1; i < decay.length; i++) {
            decay[i] = (decay[i - 1] * 99) / 100;
        }

        engine = new AresARIEngine(address(this), address(this), registry, 0, decay);
        engine.grantRole(engine.LEDGER_ROLE(), address(this));
        engine.grantRole(engine.DISPUTE_ROLE(), address(this));

        token.mint(operator, 1_000 ether);
        vm.startPrank(operator);
        token.approve(address(registry), type(uint256).max);
        registry.registerAgent(operator, "ipfs://agent", bytes32("meta"));
        vm.stopPrank();
    }

    function testTierBoundaries() public view {
        assertEq(engine.getTierByScore(99), 0);
        assertEq(engine.getTierByScore(100), 1);
        assertEq(engine.getTierByScore(299), 1);
        assertEq(engine.getTierByScore(300), 2);
        assertEq(engine.getTierByScore(599), 2);
        assertEq(engine.getTierByScore(600), 3);
        assertEq(engine.getTierByScore(849), 3);
        assertEq(engine.getTierByScore(850), 4);
    }

    function testDecayVolumeAndCorrection() public {
        uint256 agentId = registry.resolveAgentId(operator);

        uint16[5] memory scores = [uint16(200), 200, 200, 200, 200];
        for (uint256 i = 0; i < 120; i++) {
            engine.applyActionScore(agentId, scores, uint64(block.timestamp));
        }

        (uint256 ariBefore,, uint32 actions,,) = engine.getARIByAgentId(agentId);
        assertGt(ariBefore, 0);
        assertEq(actions, 120);

        vm.warp(block.timestamp + 400 days);
        (uint256 ariDecayed,,,,) = engine.getARIDetails(operator);
        assertLe(ariDecayed, ariBefore);

        engine.invalidateActionContribution(agentId, scores, uint64(block.timestamp - 400 days));
        (uint256 ariAfter,, uint32 validAfter,,) = engine.getARIByAgentId(agentId);
        assertEq(validAfter, 119);
        assertLe(ariAfter, ariDecayed);
    }

    function testChunkedDecaySaturation() public {
        uint256 agentId = registry.resolveAgentId(operator);
        uint16[5] memory scores = [uint16(120), 120, 120, 120, 120];
        engine.applyActionScore(agentId, scores, uint64(block.timestamp));

        vm.warp(block.timestamp + 20_000 days);
        (uint256 ari,,,,) = engine.getARIByAgentId(agentId);
        assertLe(ari, 1000);
    }
}
