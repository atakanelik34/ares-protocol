// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/StdInvariant.sol";
import "../token/AresToken.sol";
import "../core/AresRegistry.sol";
import "../core/AresARIEngine.sol";
import "../core/AresScorecardLedger.sol";

contract AresCoreHandler is Test {
    AresToken public token;
    AresRegistry public registry;
    AresARIEngine public engine;
    AresScorecardLedger public ledger;

    uint256 internal scorerPk = 0x5150;
    address public scorer;

    address[] internal _actors;
    address[] internal _wallets;

    mapping(address => uint256) public recordedActions;
    mapping(address => address) public linkedWalletFor;

    uint256 internal nextActionNonce;

    constructor(AresToken token_, AresRegistry registry_, AresARIEngine engine_, AresScorecardLedger ledger_) {
        token = token_;
        registry = registry_;
        engine = engine_;
        ledger = ledger_;
        scorer = vm.addr(scorerPk);

        _actors.push(address(0x101));
        _actors.push(address(0x102));
        _actors.push(address(0x103));
        _actors.push(address(0x104));

        _wallets.push(address(0x201));
        _wallets.push(address(0x202));
        _wallets.push(address(0x203));
        _wallets.push(address(0x204));

    }

    function actorsLength() external view returns (uint256) {
        return _actors.length;
    }

    function actorAt(uint256 index) external view returns (address) {
        return _actors[index];
    }

    function register(uint8 actorSeed) external {
        address actor = _actors[actorSeed % _actors.length];
        if (registry.resolveAgentId(actor) != 0) return;

        vm.prank(actor);
        registry.registerAgent(actor, "ipfs://agent", bytes32("meta"));
    }

    function deposit(uint8 actorSeed, uint96 rawAmount) external {
        address actor = _actors[actorSeed % _actors.length];
        if (registry.resolveAgentId(actor) == 0) return;

        uint256 amount = bound(uint256(rawAmount), 1 ether, 25 ether);
        vm.prank(actor);
        registry.depositStake(amount);
    }

    function linkWallet(uint8 actorSeed, uint8 walletSeed) external {
        address actor = _actors[actorSeed % _actors.length];
        if (registry.resolveAgentId(actor) == 0) return;
        if (linkedWalletFor[actor] != address(0)) return;

        address wallet = _wallets[walletSeed % _wallets.length];
        if (registry.resolveAgentId(wallet) != 0) return;

        vm.prank(actor);
        try registry.linkWallet(wallet) {
            linkedWalletFor[actor] = wallet;
        } catch {}
    }

    function unlinkWallet(uint8 actorSeed) external {
        address actor = _actors[actorSeed % _actors.length];
        address wallet = linkedWalletFor[actor];
        if (wallet == address(0)) return;

        vm.prank(actor);
        try registry.unlinkWallet(wallet) {
            linkedWalletFor[actor] = address(0);
        } catch {}
    }

    function recordScore(uint8 actorSeed, uint8 scoreSeed) external {
        address actor = _actors[actorSeed % _actors.length];
        if (registry.resolveAgentId(actor) == 0) return;

        bytes32 actionId = keccak256(abi.encode(actor, nextActionNonce++));
        uint16 base = uint16(bound(uint256(scoreSeed), 0, 180));
        uint16[5] memory scores = [
            base,
            uint16(bound(uint256(base) + 5, 0, 200)),
            uint16(bound(uint256(base) + 10, 0, 200)),
            uint16(bound(uint256(base) + 15, 0, 200)),
            uint16(bound(uint256(base) + 20, 0, 200))
        ];
        uint64 timestamp = uint64(block.timestamp);
        bytes memory sig = _sign(actor, actionId, scores, timestamp);

        ledger.recordActionScore(actor, actionId, scores, timestamp, sig);
        recordedActions[actor] += 1;
    }

    function warpTime(uint32 rawSeconds) external {
        uint256 step = bound(uint256(rawSeconds), 1, 3 days);
        vm.warp(block.timestamp + step);
    }

    function syncAgent(uint8 actorSeed) external {
        address actor = _actors[actorSeed % _actors.length];
        uint256 agentId = registry.resolveAgentId(actor);
        if (agentId == 0) return;
        engine.syncAgent(agentId);
    }

    function _sign(address agent, bytes32 actionId, uint16[5] memory scores, uint64 timestamp)
        internal
        view
        returns (bytes memory)
    {
        bytes32 scoresHash = keccak256(abi.encode(scores[0], scores[1], scores[2], scores[3], scores[4]));
        bytes32 structHash = keccak256(
            abi.encode(ledger.ACTION_SCORE_TYPEHASH(), agent, actionId, scoresHash, timestamp)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", ledger.domainSeparator(), structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(scorerPk, digest);
        return abi.encodePacked(r, s, v);
    }
}

contract AresCoreInvariantTest is StdInvariant, Test {
    AresToken internal token;
    AresRegistry internal registry;
    AresARIEngine internal engine;
    AresScorecardLedger internal ledger;
    AresCoreHandler internal handler;

    function setUp() public {
        token = new AresToken(address(this), address(this));
        registry = new AresRegistry(address(this), address(this), token, 100 ether, 1 days);

        uint256[] memory decay = new uint256[](4);
        decay[0] = 1e18;
        decay[1] = 990000000000000000;
        decay[2] = 980100000000000000;
        decay[3] = 970299000000000000;

        engine = new AresARIEngine(address(this), address(this), registry, 0, decay);
        ledger = new AresScorecardLedger(address(this), address(this), registry, engine);
        engine.grantRole(engine.LEDGER_ROLE(), address(ledger));

        handler = new AresCoreHandler(token, registry, engine, ledger);
        ledger.setAuthorizedScorer(handler.scorer(), true);

        uint256 actorCount = handler.actorsLength();
        for (uint256 i = 0; i < actorCount; i++) {
            address actor = handler.actorAt(i);
            token.mint(actor, 5_000 ether);
            vm.prank(actor);
            token.approve(address(registry), type(uint256).max);
        }

        targetContract(address(handler));
    }

    function invariant_ariRemainsBoundedAndTiered() public view {
        uint256 len = handler.actorsLength();
        for (uint256 i = 0; i < len; i++) {
            address actor = handler.actorAt(i);
            uint256 agentId = registry.resolveAgentId(actor);
            if (agentId == 0) continue;

            (uint256 ari, uint8 tier,, uint64 firstActionAt, uint64 lastUpdate) = engine.getARIByAgentId(agentId);
            assertLe(ari, 1000);
            assertLe(tier, 4);

            if (handler.recordedActions(actor) == 0) {
                assertEq(firstActionAt, 0);
            } else {
                assertGt(firstActionAt, 0);
                assertGt(lastUpdate, 0);
            }
        }
    }

    function invariant_recordedActionsUpperBoundValidActions() public view {
        uint256 len = handler.actorsLength();
        for (uint256 i = 0; i < len; i++) {
            address actor = handler.actorAt(i);
            uint256 agentId = registry.resolveAgentId(actor);
            if (agentId == 0) continue;

            (, , uint32 actionsCount,,) = engine.getARIByAgentId(agentId);
            assertLe(actionsCount, handler.recordedActions(actor));
        }
    }

    function invariant_registryResolutionRemainsStable() public view {
        uint256 len = handler.actorsLength();
        for (uint256 i = 0; i < len; i++) {
            address actor = handler.actorAt(i);
            uint256 agentId = registry.resolveAgentId(actor);
            if (agentId == 0) continue;

            assertTrue(registry.isRegisteredAgent(agentId));
            assertEq(registry.operatorOf(agentId), actor);

            address wallet = handler.linkedWalletFor(actor);
            if (wallet != address(0)) {
                assertEq(registry.resolveAgentId(wallet), agentId);
            }
        }
    }
}
