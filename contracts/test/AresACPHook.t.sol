// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../token/AresToken.sol";
import "../core/AresRegistry.sol";
import "../core/AresARIEngine.sol";
import "../core/AresScorecardLedger.sol";
import "../erc8183-adapters/AresACPHook.sol";
import "../erc8183-adapters/AresACPAdapter.sol";
import "../erc8183-adapters/AresEvaluator.sol";
import "../interfaces/erc8183-spec/IACPHook.sol";
import "../interfaces/erc8183-spec/IAresACPCompat.sol";

contract MockACPCompat is IAresACPCompat {
    struct Job {
        address client;
        address provider;
        address evaluator;
        JobState state;
    }

    bytes4 public constant SET_PROVIDER_SELECTOR = bytes4(keccak256("setProvider(uint256,address,bytes)"));
    bytes4 public constant FUND_SELECTOR = bytes4(keccak256("fund(uint256,uint256,bytes)"));
    bytes4 public constant SUBMIT_SELECTOR = bytes4(keccak256("submit(uint256,bytes32,bytes)"));
    bytes4 public constant COMPLETE_SELECTOR = bytes4(keccak256("complete(uint256,bytes32,bytes)"));
    bytes4 public constant REJECT_SELECTOR = bytes4(keccak256("reject(uint256,bytes32,bytes)"));

    uint256 public nextJobId = 1;
    mapping(uint256 => Job) public jobs;

    IACPHook public hook;

    function setHook(IACPHook hook_) external {
        hook = hook_;
    }

    function createJob(address provider, address evaluator) external returns (uint256 jobId) {
        require(evaluator != address(0), "invalid evaluator");
        jobId = nextJobId++;
        jobs[jobId] = Job({client: msg.sender, provider: provider, evaluator: evaluator, state: JobState.Open});
    }

    function setProvider(uint256 jobId, address provider, bytes calldata optParams) external {
        Job storage job = jobs[jobId];
        require(msg.sender == job.client, "not client");
        require(job.state == JobState.Open, "bad state");
        require(job.provider == address(0), "provider set");
        require(provider != address(0), "provider zero");

        _before(jobId, SET_PROVIDER_SELECTOR, abi.encode(provider, optParams));
        job.provider = provider;
        _after(jobId, SET_PROVIDER_SELECTOR, abi.encode(provider, optParams));
    }

    function fund(uint256 jobId, uint256, bytes calldata optParams) external {
        Job storage job = jobs[jobId];
        require(msg.sender == job.client, "not client");
        require(job.state == JobState.Open, "bad state");
        require(job.provider != address(0), "provider zero");

        _before(jobId, FUND_SELECTOR, optParams);
        job.state = JobState.Funded;
        _after(jobId, FUND_SELECTOR, optParams);
    }

    function submit(uint256 jobId, bytes32 deliverable, bytes calldata optParams) external {
        Job storage job = jobs[jobId];
        require(msg.sender == job.provider, "not provider");
        require(job.state == JobState.Funded, "bad state");

        _before(jobId, SUBMIT_SELECTOR, abi.encode(deliverable, optParams));
        job.state = JobState.Submitted;
        _after(jobId, SUBMIT_SELECTOR, abi.encode(deliverable, optParams));
    }

    function complete(uint256 jobId, bytes32 reason, bytes calldata optParams) external override {
        Job storage job = jobs[jobId];
        require(msg.sender == job.evaluator, "not evaluator");
        require(job.state == JobState.Submitted, "bad state");

        _before(jobId, COMPLETE_SELECTOR, abi.encode(reason, optParams));
        job.state = JobState.Completed;
        _after(jobId, COMPLETE_SELECTOR, abi.encode(reason, optParams));
    }

    function reject(uint256 jobId, bytes32 reason, bytes calldata optParams) external override {
        Job storage job = jobs[jobId];
        require(
            (job.state == JobState.Open && msg.sender == job.client)
                || ((job.state == JobState.Funded || job.state == JobState.Submitted) && msg.sender == job.evaluator),
            "not rejector"
        );

        _before(jobId, REJECT_SELECTOR, abi.encode(reason, optParams));
        job.state = JobState.Rejected;
        _after(jobId, REJECT_SELECTOR, abi.encode(reason, optParams));
    }

    function getJobProvider(uint256 jobId) external view override returns (address provider) {
        return jobs[jobId].provider;
    }

    function getJobState(uint256 jobId) external view override returns (JobState state) {
        return jobs[jobId].state;
    }

    function callAfterAction(uint256 jobId, bytes4 selector, bytes calldata data) external {
        _after(jobId, selector, data);
    }

    function _before(uint256 jobId, bytes4 selector, bytes memory data) internal {
        if (address(hook) != address(0)) {
            hook.beforeAction(jobId, selector, data);
        }
    }

    function _after(uint256 jobId, bytes4 selector, bytes memory data) internal {
        if (address(hook) != address(0)) {
            hook.afterAction(jobId, selector, data);
        }
    }
}

contract MockFailingRegistry is IAresRegistry {
    function resolveAgentId(address) external pure returns (uint256) {
        revert("registry down");
    }

    function operatorOf(uint256) external pure returns (address operator) {
        operator = address(0);
    }

    function isRegisteredAgent(uint256) external pure returns (bool) {
        return false;
    }
}

contract MockPassiveARIEngine is IAresARIEngine {
    function applyActionScore(uint256, uint16[5] calldata, uint64) external {}

    function invalidateActionContribution(uint256, uint16[5] calldata, uint64) external {}

    function getARIByAgentId(uint256) external pure returns (uint256 ari, uint8 tier, uint32 actionsCount, uint64, uint64) {
        return (0, tier, actionsCount, 0, 0);
    }
}

contract MockNoopLedgerWriter is IAresScorecardWriter {
    function recordActionScore(address, bytes32, uint16[5] calldata, uint64, bytes calldata) external {}
}

contract MockEvaluatorACP is IAresACPCompat {
    uint256 public completeCount;
    uint256 public rejectCount;
    uint256 public lastCompleteJobId;
    uint256 public lastRejectJobId;
    bytes32 public lastCompleteReason;
    bytes32 public lastRejectReason;
    bytes public lastCompleteOptParams;
    bytes public lastRejectOptParams;
    address public lastCaller;

    function getJobProvider(uint256) external pure returns (address provider) {
        provider = address(0xBEEF);
    }

    function getJobState(uint256) external pure returns (JobState state) {
        state = JobState.Submitted;
    }

    function complete(uint256 jobId, bytes32 reason, bytes calldata optParams) external {
        completeCount += 1;
        lastCompleteJobId = jobId;
        lastCompleteReason = reason;
        lastCompleteOptParams = optParams;
        lastCaller = msg.sender;
    }

    function reject(uint256 jobId, bytes32 reason, bytes calldata optParams) external {
        rejectCount += 1;
        lastRejectJobId = jobId;
        lastRejectReason = reason;
        lastRejectOptParams = optParams;
        lastCaller = msg.sender;
    }
}

contract AresACPHookTest is Test {
    uint256 internal scorerPk = 0x777;
    address internal scorer;
    address internal provider = address(0xA11CE);
    address internal evaluator = address(0xB0B);

    AresToken internal token;
    AresRegistry internal registry;
    AresARIEngine internal engine;
    AresScorecardLedger internal ledger;
    MockACPCompat internal acp;
    AresACPHook internal hook;
    AresACPAdapter internal adapter;

    uint256 internal providerAgentId;

    function setUp() public {
        scorer = vm.addr(scorerPk);

        token = new AresToken(address(this), address(this));
        registry = new AresRegistry(address(this), address(this), token, 100 ether, 1 days);

        uint256[] memory decay = new uint256[](3);
        decay[0] = 1e18;
        decay[1] = 990000000000000000;
        decay[2] = 980100000000000000;
        engine = new AresARIEngine(address(this), address(this), registry, 0, decay);
        ledger = new AresScorecardLedger(address(this), address(this), registry, engine);
        acp = new MockACPCompat();

        engine.grantRole(engine.LEDGER_ROLE(), address(ledger));
        engine.grantRole(engine.LEDGER_ROLE(), address(this));
        ledger.setAuthorizedScorer(scorer, true);

        token.mint(provider, 1_000 ether);
        vm.startPrank(provider);
        token.approve(address(registry), type(uint256).max);
        providerAgentId = registry.registerAgent(provider, "ipfs://provider", bytes32("provider"));
        vm.stopPrank();

        hook = new AresACPHook(
            address(this),
            address(this),
            IAresACPCompat(address(acp)),
            registry,
            engine,
            IAresScorecardWriter(address(ledger)),
            0
        );
        acp.setHook(IACPHook(address(hook)));
        adapter = new AresACPAdapter(registry, engine);
    }

    function testFundBlocksProviderBelowThreshold() public {
        hook.setMinProviderScore(10);

        uint256 jobId = acp.createJob(provider, evaluator);

        vm.expectRevert(
            abi.encodeWithSelector(AresACPHook.InsufficientReputation.selector, providerAgentId, uint256(0), uint256(10))
        );
        acp.fund(jobId, 1 ether, "");
    }

    function testFundAllowsProviderAboveThreshold() public {
        _boostAri(providerAgentId, 20);
        hook.setMinProviderScore(30);

        uint256 jobId = acp.createJob(provider, evaluator);
        acp.fund(jobId, 1 ether, "");

        assertEq(uint8(acp.getJobState(jobId)), uint8(IAresACPCompat.JobState.Funded));
    }

    function testFundBlocksUnregisteredProvider() public {
        address unknownProvider = address(0xC0FFEE);
        uint256 jobId = acp.createJob(unknownProvider, evaluator);

        vm.expectRevert(abi.encodeWithSelector(AresACPHook.ProviderNotRegistered.selector, unknownProvider));
        acp.fund(jobId, 1 ether, "");
    }

    function testCompleteWritesPositiveScorecardEntry() public {
        uint256 jobId = acp.createJob(provider, evaluator);
        acp.fund(jobId, 1 ether, "");

        vm.prank(provider);
        acp.submit(jobId, keccak256("deliverable"), "");

        uint16[5] memory completeProfile = hook.getScoreProfile(AresACPHook.JobOutcome.Completed);
        bytes32 actionId = keccak256("complete-1");
        bytes memory completeOptParams = _buildScorePayload(provider, actionId, completeProfile, uint64(block.timestamp));

        vm.prank(evaluator);
        acp.complete(jobId, bytes32("ok"), completeOptParams);

        (uint16[5] memory scores,,, IAresScorecardLedger.ActionStatus status) = ledger.getAction(providerAgentId, actionId);
        assertEq(scores[0], completeProfile[0]);
        assertEq(uint8(status), uint8(IAresScorecardLedger.ActionStatus.VALID));
    }

    function testRejectPostSubmitWritesNegativeProfile() public {
        uint256 jobId = acp.createJob(provider, evaluator);
        acp.fund(jobId, 1 ether, "");

        vm.prank(provider);
        acp.submit(jobId, keccak256("deliverable"), "");

        uint16[5] memory profile = hook.getScoreProfile(AresACPHook.JobOutcome.RejectedAfterSubmit);
        bytes32 actionId = keccak256("reject-post-submit");
        bytes memory rejectOptParams = _buildScorePayload(provider, actionId, profile, uint64(block.timestamp));

        vm.prank(evaluator);
        acp.reject(jobId, bytes32("bad"), rejectOptParams);

        (uint16[5] memory scores,,, IAresScorecardLedger.ActionStatus status) = ledger.getAction(providerAgentId, actionId);
        assertEq(scores[0], profile[0]);
        assertEq(uint8(status), uint8(IAresScorecardLedger.ActionStatus.VALID));
        assertEq(uint8(acp.getJobState(jobId)), uint8(IAresACPCompat.JobState.Rejected));
    }

    function testRejectFundedWritesMildProfile() public {
        uint256 jobId = acp.createJob(provider, evaluator);
        acp.fund(jobId, 1 ether, "");

        uint16[5] memory profile = hook.getScoreProfile(AresACPHook.JobOutcome.RejectedBeforeSubmit);
        bytes32 actionId = keccak256("reject-funded");
        bytes memory rejectOptParams = _buildScorePayload(provider, actionId, profile, uint64(block.timestamp));

        vm.prank(evaluator);
        acp.reject(jobId, bytes32("no-submission"), rejectOptParams);

        (uint16[5] memory scores,,, IAresScorecardLedger.ActionStatus status) = ledger.getAction(providerAgentId, actionId);
        assertEq(scores[0], profile[0]);
        assertEq(uint8(status), uint8(IAresScorecardLedger.ActionStatus.VALID));
    }

    function testRejectClassificationUsesSnapshotAndSnapshotClears() public {
        uint256 jobId = acp.createJob(provider, evaluator);
        acp.fund(jobId, 1 ether, "");

        vm.prank(provider);
        acp.submit(jobId, keccak256("deliverable"), "");

        uint16[5] memory negativeProfile = hook.getScoreProfile(AresACPHook.JobOutcome.RejectedAfterSubmit);
        bytes32 firstActionId = keccak256("reject-snapshot-first");
        bytes memory firstRejectOpt = _buildScorePayload(provider, firstActionId, negativeProfile, uint64(block.timestamp));

        vm.prank(evaluator);
        acp.reject(jobId, bytes32("reject"), firstRejectOpt);

        (uint16[5] memory firstScores,,, IAresScorecardLedger.ActionStatus firstStatus) =
            ledger.getAction(providerAgentId, firstActionId);
        assertEq(firstScores[0], negativeProfile[0]);
        assertEq(uint8(firstStatus), uint8(IAresScorecardLedger.ActionStatus.VALID));
        assertEq(uint8(hook.getRejectSnapshot(jobId)), uint8(AresACPHook.RejectPreState.None));

        uint16[5] memory mildProfile = hook.getScoreProfile(AresACPHook.JobOutcome.RejectedBeforeSubmit);
        bytes32 secondActionId = keccak256("reject-snapshot-second");
        bytes memory secondRejectOpt = _buildScorePayload(provider, secondActionId, mildProfile, uint64(block.timestamp));

        acp.callAfterAction(jobId, hook.REJECT_SELECTOR(), abi.encode(bytes32("manual-after"), secondRejectOpt));

        (uint16[5] memory secondScores,,, IAresScorecardLedger.ActionStatus secondStatus) =
            ledger.getAction(providerAgentId, secondActionId);
        assertEq(secondScores[0], mildProfile[0]);
        assertEq(uint8(secondStatus), uint8(IAresScorecardLedger.ActionStatus.VALID));
    }

    function testHookFailOpenWhenRegistryLookupFails() public {
        MockACPCompat failOpenAcp = new MockACPCompat();
        MockFailingRegistry badRegistry = new MockFailingRegistry();
        MockPassiveARIEngine passiveEngine = new MockPassiveARIEngine();
        MockNoopLedgerWriter noopLedger = new MockNoopLedgerWriter();

        AresACPHook failOpenHook = new AresACPHook(
            address(this),
            address(this),
            IAresACPCompat(address(failOpenAcp)),
            IAresRegistry(address(badRegistry)),
            IAresARIEngine(address(passiveEngine)),
            IAresScorecardWriter(address(noopLedger)),
            100
        );
        failOpenAcp.setHook(IACPHook(address(failOpenHook)));

        uint256 jobId = failOpenAcp.createJob(provider, evaluator);
        failOpenAcp.fund(jobId, 1 ether, "");
        assertEq(uint8(failOpenAcp.getJobState(jobId)), uint8(IAresACPCompat.JobState.Funded));
    }

    function testOnlyAcpCanCallHookEntryPoints() public {
        bytes4 fundSelector = hook.FUND_SELECTOR();
        bytes4 completeSelector = hook.COMPLETE_SELECTOR();

        vm.expectRevert(AresACPHook.OnlyACP.selector);
        hook.beforeAction(1, fundSelector, "");

        vm.expectRevert(AresACPHook.OnlyACP.selector);
        hook.afterAction(1, completeSelector, "");
    }

    function testAdapterReturnsScoreRegistrationAndAgentId() public {
        _boostAri(providerAgentId, 20);

        (uint256 score, bool isRegistered) = adapter.getAgentScore(provider);
        assertTrue(isRegistered);
        assertGt(score, 0);
        assertEq(adapter.getAgentId(provider), providerAgentId);
        assertTrue(adapter.meetsReputationThreshold(provider, score));
        assertFalse(adapter.meetsReputationThreshold(provider, score + 1));

        (uint256 unknownScore, bool unknownRegistered) = adapter.getAgentScore(address(0xDEAD));
        assertEq(unknownScore, 0);
        assertFalse(unknownRegistered);
        assertEq(adapter.getAgentId(address(0xDEAD)), 0);
    }

    function testFullFlowCreateFundSubmitCompleteUpdatesAri() public {
        uint16[5] memory submitProfile = hook.getScoreProfile(AresACPHook.JobOutcome.Submitted);
        uint16[5] memory completeProfile = hook.getScoreProfile(AresACPHook.JobOutcome.Completed);

        for (uint256 i = 0; i < 3; i++) {
            uint256 jobId = acp.createJob(provider, evaluator);
            acp.fund(jobId, 1 ether, "");

            bytes32 submitActionId = keccak256(abi.encodePacked("submit-", i));
            bytes memory submitOptParams = _buildScorePayload(
                provider, submitActionId, submitProfile, uint64(block.timestamp)
            );
            vm.prank(provider);
            acp.submit(jobId, keccak256(abi.encodePacked("deliverable-", i)), submitOptParams);

            bytes32 completeActionId = keccak256(abi.encodePacked("complete-", i));
            bytes memory completeOptParams = _buildScorePayload(
                provider, completeActionId, completeProfile, uint64(block.timestamp)
            );
            vm.prank(evaluator);
            acp.complete(jobId, bytes32("ok"), completeOptParams);
        }

        (uint256 ari,, uint32 actionsCount,,) = engine.getARIByAgentId(providerAgentId);
        assertEq(actionsCount, 6);
        assertGt(ari, 0);
    }

    function _boostAri(uint256 agentId, uint256 count) internal {
        uint16[5] memory scores = [uint16(200), 200, 200, 200, 200];
        for (uint256 i = 0; i < count; i++) {
            engine.applyActionScore(agentId, scores, uint64(block.timestamp));
        }
    }

    function _buildScorePayload(address agent, bytes32 actionId, uint16[5] memory scores, uint64 timestamp)
        internal
        view
        returns (bytes memory)
    {
        bytes memory signature = _sign(agent, actionId, scores, timestamp);
        AresACPHook.ScorePayload memory payload = AresACPHook.ScorePayload({
            actionId: actionId,
            timestamp: timestamp,
            scorerSignature: signature
        });
        return abi.encode(payload);
    }

    function _sign(address agent, bytes32 actionId, uint16[5] memory scores, uint64 timestamp)
        internal
        view
        returns (bytes memory)
    {
        bytes32 scoresHash = keccak256(abi.encode(scores[0], scores[1], scores[2], scores[3], scores[4]));
        bytes32 structHash =
            keccak256(abi.encode(ledger.ACTION_SCORE_TYPEHASH(), agent, actionId, scoresHash, timestamp));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", ledger.domainSeparator(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(scorerPk, digest);
        return abi.encodePacked(r, s, v);
    }
}

contract AresEvaluatorTest is Test {
    address internal oracleA = address(0xAA01);
    address internal oracleB = address(0xBB02);

    MockEvaluatorACP internal acp;
    AresEvaluator internal evaluator;

    function setUp() public {
        acp = new MockEvaluatorACP();
        evaluator = new AresEvaluator(address(this), address(this), IAresACPCompat(address(acp)));
        evaluator.setOracle(oracleA, true);
        evaluator.setOracle(oracleB, true);
    }

    function testOnlyAuthorizedOracleCanResolve() public {
        vm.prank(address(0xDEAD));
        vm.expectRevert();
        evaluator.resolveComplete(1, bytes32("unauthorized"), "");

        vm.prank(oracleA);
        evaluator.resolveComplete(1, bytes32("ok"), hex"01");

        assertEq(acp.completeCount(), 1);
        assertEq(acp.lastCompleteJobId(), 1);
        assertEq(acp.lastCompleteReason(), bytes32("ok"));
        assertEq(acp.lastCaller(), address(evaluator));
    }

    function testOracleRateLimitRevertsWithinSameBlockAndResetsNextBlock() public {
        vm.startPrank(oracleA);
        evaluator.resolveComplete(1, bytes32("first"), "");

        vm.expectRevert(
            abi.encodeWithSelector(
                AresEvaluator.OracleRateLimitExceeded.selector, oracleA, block.number, uint256(2), uint256(1)
            )
        );
        evaluator.resolveReject(2, bytes32("second"), "");
        vm.stopPrank();

        vm.roll(block.number + 1);
        vm.prank(oracleA);
        evaluator.resolveReject(3, bytes32("after-roll"), "");

        assertEq(acp.completeCount(), 1);
        assertEq(acp.rejectCount(), 1);
        assertEq(acp.lastRejectJobId(), 3);
    }

    function testDifferentOraclesHaveIndependentPerBlockQuota() public {
        vm.prank(oracleA);
        evaluator.resolveComplete(10, bytes32("a"), "");

        vm.prank(oracleB);
        evaluator.resolveReject(20, bytes32("b"), "");

        assertEq(acp.completeCount(), 1);
        assertEq(acp.rejectCount(), 1);
        assertEq(evaluator.oracleResolutionsInBlock(oracleA, block.number), 1);
        assertEq(evaluator.oracleResolutionsInBlock(oracleB, block.number), 1);
    }
}
