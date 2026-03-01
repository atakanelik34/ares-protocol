// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../token/AresToken.sol";
import "../core/AresRegistry.sol";
import "../core/AresARIEngine.sol";
import "../interfaces/IAresRegistry.sol";

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

    function testConstructorAndViewGuardrails() public {
        uint256[] memory decay = new uint256[](2);
        decay[0] = 1e18;
        decay[1] = 99e16;

        vm.expectRevert("invalid admin");
        new AresARIEngine(address(0), address(this), registry, 0, decay);

        vm.expectRevert("invalid governance");
        new AresARIEngine(address(this), address(0), registry, 0, decay);

        vm.expectRevert("invalid registry");
        new AresARIEngine(address(this), address(this), IAresRegistry(address(0)), 0, decay);

        assertEq(engine.getTier(address(0xDEAD)), 0);
        (uint256 ari, uint8 tier, uint32 actions, uint64 firstActionAt, uint64 lastUpdate) =
            engine.getARIDetails(address(0xDEAD));
        assertEq(ari, 0);
        assertEq(tier, 0);
        assertEq(actions, 0);
        assertEq(firstActionAt, 0);
        assertEq(lastUpdate, 0);
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

    function testGovernanceSettersAndValidation() public {
        uint16[5] memory newWeights = [uint16(2500), 2500, 2000, 1500, 1500];
        engine.setWeights(newWeights);
        assertEq(engine.getWeights()[0], 2500);

        engine.setLambda(7);
        assertEq(engine.getLambda(), 7);

        uint256[] memory decay = new uint256[](4);
        decay[0] = 1e18;
        decay[1] = 950000000000000000;
        decay[2] = 902500000000000000;
        decay[3] = 857375000000000000;
        engine.setDecayTable(decay);
        (uint256 maxDays, uint256 len) = engine.getParams();
        assertEq(maxDays, engine.MAX_DAYS_SATURATION());
        assertEq(len, 4);

        uint16[5] memory badWeights = [uint16(3000), 2500, 2000, 1500, 999];
        vm.expectRevert(AresARIEngine.InvalidWeights.selector);
        engine.setWeights(badWeights);

        uint256[] memory badDecay = new uint256[](2);
        badDecay[0] = 9e17;
        badDecay[1] = 8e17;
        vm.expectRevert(AresARIEngine.InvalidDecayTable.selector);
        engine.setDecayTable(badDecay);

        uint256[] memory increasingDecay = new uint256[](3);
        increasingDecay[0] = 1e18;
        increasingDecay[1] = 9e17;
        increasingDecay[2] = 91e16;
        vm.expectRevert(AresARIEngine.InvalidDecayTable.selector);
        engine.setDecayTable(increasingDecay);
    }

    function testNormalizationFactorZeroAndDimensionCapPaths() public {
        uint256[] memory flatDecay = new uint256[](2);
        flatDecay[0] = 1e18;
        flatDecay[1] = 1e18;
        engine.setDecayTable(flatDecay);

        uint256 agentId = registry.resolveAgentId(operator);
        uint16[5] memory scores = [uint16(200), 200, 200, 200, 200];
        engine.applyActionScore(agentId, scores, uint64(block.timestamp));
        engine.applyActionScore(agentId, scores, uint64(block.timestamp));

        (uint256 ari,, uint32 validActions,,) = engine.getARIByAgentId(agentId);
        assertEq(validActions, 2);
        assertGt(ari, 0);
        assertLe(ari, 1000);
    }

    function testRegistrationAndContributionGuardrails() public {
        uint16[5] memory scores = [uint16(200), 200, 200, 200, 200];
        vm.expectRevert(AresARIEngine.AgentNotRegistered.selector);
        engine.applyActionScore(999, scores, uint64(block.timestamp));

        uint256 agentId = registry.resolveAgentId(operator);
        engine.syncAgent(agentId);
        (, , uint32 actions, uint64 firstActionAt, uint64 lastUpdate) = engine.getARIByAgentId(agentId);
        assertEq(actions, 0);
        assertEq(firstActionAt, 0);
        assertEq(lastUpdate, uint64(block.timestamp));

        uint64 futureTimestamp = uint64(block.timestamp + 3 days);
        engine.applyActionScore(agentId, scores, futureTimestamp);

        (uint256 ari, , uint32 validAfter, uint64 firstSeen, uint64 updatedAt) = engine.getARIByAgentId(agentId);
        assertLe(ari, 1000);
        assertEq(validAfter, 1);
        assertEq(firstSeen, uint64(block.timestamp));
        assertEq(updatedAt, uint64(block.timestamp));

        engine.invalidateActionContribution(agentId, [uint16(200), 200, 200, 200, 200], uint64(block.timestamp));
        (uint256 afterInvalidation, , uint32 validFinal, , ) = engine.getARIByAgentId(agentId);
        assertEq(validFinal, 0);
        assertEq(afterInvalidation, 0);

        engine.invalidateActionContribution(agentId, [uint16(200), 200, 200, 200, 200], uint64(block.timestamp));
        (uint256 afterSecondInvalidation, , uint32 validStillZero, , ) = engine.getARIByAgentId(agentId);
        assertEq(validStillZero, 0);
        assertEq(afterSecondInvalidation, 0);

        assertEq(engine.getScore(address(0xDEAD)), 0);
        assertFalse(engine.isRegistered(address(0xDEAD)));
    }
}
