// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../erc8004-adapters/ERC8004ValidationAdapter.sol";

contract MockDisputeAdapter is IAresDisputeAdapter {
    uint256 public nextId = 1;
    address public lastChallenger;
    uint256 public lastAgentId;
    bytes32 public lastActionId;
    string public lastReasonURI;
    uint256 public lastStakeAmount;
    address public lastValidator;
    uint256 public lastRequestId;
    bool public lastVote;
    uint256 public finalizeCount;
    uint256 public joinCount;
    uint256 public voteCount;

    function disputeActionFromAdapter(address challenger, uint256 agentId, bytes32 actionId, uint256 challengerStake, string calldata reasonURI)
        external
        override
        returns (uint256 disputeId)
    {
        lastChallenger = challenger;
        lastAgentId = agentId;
        lastActionId = actionId;
        lastReasonURI = reasonURI;
        lastStakeAmount = challengerStake;
        disputeId = nextId++;
    }

    function validatorJoinFromAdapter(address validator, uint256 disputeId, uint256 stake) external override {
        lastValidator = validator;
        lastRequestId = disputeId;
        lastStakeAmount = stake;
        joinCount++;
    }

    function voteFromAdapter(address validator, uint256 disputeId, bool acceptChallenge) external override {
        lastValidator = validator;
        lastRequestId = disputeId;
        lastVote = acceptChallenge;
        voteCount++;
    }

    function finalize(uint256 disputeId) external override {
        lastRequestId = disputeId;
        finalizeCount++;
    }
}

contract ERC8004ValidationAdapterTest is Test {
    MockDisputeAdapter dispute;
    ERC8004ValidationAdapter adapter;

    address requester = address(0xA11CE);
    address validator = address(0xB0B);

    function setUp() public {
        dispute = new MockDisputeAdapter();
        adapter = new ERC8004ValidationAdapter(address(this), address(this), dispute);
    }

    function testConstructorGuardrails() public {
        vm.expectRevert("invalid admin");
        new ERC8004ValidationAdapter(address(0), address(this), dispute);

        vm.expectRevert("invalid governance");
        new ERC8004ValidationAdapter(address(this), address(0), dispute);

        vm.expectRevert("invalid dispute");
        new ERC8004ValidationAdapter(address(this), address(this), IAresDisputeAdapter(address(0)));
    }

    function testValidationRequestStoresAndForwards() public {
        bytes32 actionId = keccak256("act");

        vm.prank(requester);
        uint256 requestId = adapter.validationRequest(1, actionId, "ipfs://reason", 10 ether);

        IERC8004ValidationRegistry.ValidationRequest memory req = adapter.getValidationRequest(requestId);
        assertEq(req.agentId, 1);
        assertEq(req.actionId, actionId);
        assertEq(req.requester, requester);
        assertEq(req.reasonURI, "ipfs://reason");
        assertEq(req.stakeAmount, 10 ether);

        assertEq(dispute.lastChallenger(), requester);
        assertEq(dispute.lastAgentId(), 1);
        assertEq(dispute.lastActionId(), actionId);
    }

    function testValidationResponseAndFinalizeForward() public {
        vm.prank(requester);
        uint256 requestId = adapter.validationRequest(7, keccak256("act-2"), "ipfs://reason", 5 ether);

        vm.prank(validator);
        adapter.validationResponse(requestId, true, 4 ether);
        assertEq(dispute.joinCount(), 1);
        assertEq(dispute.voteCount(), 1);
        assertEq(dispute.lastValidator(), validator);
        assertEq(dispute.lastRequestId(), requestId);
        assertTrue(dispute.lastVote());

        vm.prank(validator);
        adapter.validationResponse(requestId, false, 0);
        assertEq(dispute.joinCount(), 1);
        assertEq(dispute.voteCount(), 2);
        assertFalse(dispute.lastVote());

        adapter.finalizeValidation(requestId);
        assertEq(dispute.finalizeCount(), 1);
        assertEq(dispute.lastRequestId(), requestId);
    }

    function testValidationResponseWithoutStakeSkipsJoinAndUnknownRequestReadsZero() public {
        IERC8004ValidationRegistry.ValidationRequest memory emptyReq = adapter.getValidationRequest(999);
        assertEq(emptyReq.agentId, 0);
        assertEq(emptyReq.requester, address(0));

        vm.prank(requester);
        uint256 requestId = adapter.validationRequest(5, keccak256("act-3"), "ipfs://reason", 1 ether);

        vm.prank(validator);
        adapter.validationResponse(requestId, true, 0);
        assertEq(dispute.joinCount(), 0);
        assertEq(dispute.voteCount(), 1);
        assertEq(dispute.lastRequestId(), requestId);

        vm.prank(address(0xCAFE));
        adapter.finalizeValidation(requestId);
        assertEq(dispute.finalizeCount(), 1);
    }
}
