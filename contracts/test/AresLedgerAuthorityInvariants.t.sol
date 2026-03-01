// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/StdInvariant.sol";
import "../token/AresToken.sol";
import "../core/AresRegistry.sol";
import "../core/AresARIEngine.sol";
import "../core/AresScorecardLedger.sol";

contract AresLedgerAuthorityHandler is Test {
    AresScorecardLedger public ledger;
    AresRegistry public registry;

    uint256[] internal _scorerPks;
    address[] internal _scorers;
    address[] internal _agents;
    bytes32[] internal _actions;
    mapping(address => bool) public trackedAuthorization;
    uint256 public unauthorizedSuccesses;
    uint256 internal nextActionNonce;

    constructor(AresRegistry registry_, AresScorecardLedger ledger_) {
        registry = registry_;
        ledger = ledger_;

        _scorerPks.push(0xA11CE);
        _scorerPks.push(0xB0B);
        _scorerPks.push(0xC0DE);

        for (uint256 i = 0; i < _scorerPks.length; i++) {
            address scorer = vm.addr(_scorerPks[i]);
            _scorers.push(scorer);
        }

        _agents.push(address(0x1111));
        _agents.push(address(0x2222));
        _agents.push(address(0x3333));
    }

    function scorersLength() external view returns (uint256) {
        return _scorers.length;
    }

    function scorerAt(uint256 index) external view returns (address) {
        return _scorers[index];
    }

    function actionsLength() external view returns (uint256) {
        return _actions.length;
    }

    function actionAt(uint256 index) external view returns (bytes32) {
        return _actions[index];
    }

    function setAuthorized(uint8 scorerSeed, bool authorized) external {
        address scorer = _scorers[scorerSeed % _scorers.length];
        ledger.setAuthorizedScorer(scorer, authorized);
        trackedAuthorization[scorer] = authorized;
    }

    function recordMaybe(uint8 scorerSeed, uint8 agentSeed, uint64 tsSeed) external {
        address agent = _agents[agentSeed % _agents.length];
        address scorer = _scorers[scorerSeed % _scorers.length];
        uint256 pk = _scorerPks[scorerSeed % _scorerPks.length];

        uint256 agentId = registry.resolveAgentId(agent);
        if (agentId == 0) return;

        bytes32 actionId = keccak256(abi.encodePacked("ledger-auth", scorer, agent, nextActionNonce++));
        uint16[5] memory scores = [uint16(150), 145, 140, 135, 130];
        uint64 timestamp = uint64(block.timestamp - (uint256(tsSeed) % 1 days));
        bytes memory sig = _sign(pk, agent, actionId, scores, timestamp);

        bool wasAuthorized = trackedAuthorization[scorer];
        try ledger.recordActionScore(agent, actionId, scores, timestamp, sig) {
            _actions.push(actionId);
            if (!wasAuthorized) {
                unauthorizedSuccesses += 1;
            }
        } catch {}
    }

    function _sign(uint256 pk, address agent, bytes32 actionId, uint16[5] memory scores, uint64 timestamp)
        internal
        view
        returns (bytes memory)
    {
        bytes32 scoresHash = keccak256(abi.encode(scores[0], scores[1], scores[2], scores[3], scores[4]));
        bytes32 structHash = keccak256(
            abi.encode(ledger.ACTION_SCORE_TYPEHASH(), agent, actionId, scoresHash, timestamp)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", ledger.domainSeparator(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }
}

contract AresLedgerAuthorityInvariantTest is StdInvariant, Test {
    AresToken internal token;
    AresRegistry internal registry;
    AresARIEngine internal engine;
    AresScorecardLedger internal ledger;
    AresLedgerAuthorityHandler internal handler;

    function setUp() public {
        token = new AresToken(address(this), address(this));
        registry = new AresRegistry(address(this), address(this), token, 100 ether, 1 days);

        uint256[] memory decay = new uint256[](3);
        decay[0] = 1e18;
        decay[1] = 990000000000000000;
        decay[2] = 980100000000000000;
        engine = new AresARIEngine(address(this), address(this), registry, 0, decay);
        ledger = new AresScorecardLedger(address(this), address(this), registry, engine);
        engine.grantRole(engine.LEDGER_ROLE(), address(ledger));

        address[3] memory agents = [address(0x1111), address(0x2222), address(0x3333)];
        for (uint256 i = 0; i < agents.length; i++) {
            token.mint(agents[i], 1_000 ether);
            vm.startPrank(agents[i]);
            token.approve(address(registry), type(uint256).max);
            registry.registerAgent(agents[i], "ipfs://agent", bytes32("meta"));
            vm.stopPrank();
        }

        handler = new AresLedgerAuthorityHandler(registry, ledger);
        ledger.grantRole(ledger.GOVERNANCE_ROLE(), address(handler));

        targetContract(address(handler));
    }

    function invariant_disabledScorersCannotProduceSuccessfulWrites() public view {
        assertEq(handler.unauthorizedSuccesses(), 0);
    }

    function invariant_trackedAuthorizationMirrorMatchesLedgerState() public view {
        uint256 len = handler.scorersLength();
        for (uint256 i = 0; i < len; i++) {
            address scorer = handler.scorerAt(i);
            assertEq(ledger.authorizedScorers(scorer), handler.trackedAuthorization(scorer));
        }
    }
}
