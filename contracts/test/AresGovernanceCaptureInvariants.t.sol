// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/StdInvariant.sol";
import "@openzeppelin/contracts/governance/TimelockController.sol";
import "../token/AresToken.sol";
import "../token/AresGovernor.sol";

contract GovernanceInvariantTarget {
    uint256 public value;

    function setValue(uint256 newValue) external {
        value = newValue;
    }
}

contract GovernanceCaptureHandler is Test {
    address public admin;
    AresToken public token;
    AresGovernor public governor;
    TimelockController public timelock;
    GovernanceInvariantTarget public target;

    address public voter = address(0xA11CE);
    address public lateWhale = address(0xBADA55);
    uint256 public proposalId;
    uint256 public initialForVotes;
    uint256 public snapshotBlock;
    uint256 public initialQuorum;

    constructor(
        address admin_,
        AresToken token_,
        AresGovernor governor_,
        TimelockController timelock_,
        GovernanceInvariantTarget target_
    ) {
        admin = admin_;
        token = token_;
        governor = governor_;
        timelock = timelock_;
        target = target_;

        vm.prank(admin);
        token.mint(voter, 1_000 ether);
        vm.prank(voter);
        token.delegate(voter);
        vm.roll(block.number + 1);

        address[] memory targets = new address[](1);
        targets[0] = address(target);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeCall(GovernanceInvariantTarget.setValue, (42));

        vm.prank(voter);
        proposalId = governor.propose(targets, values, calldatas, "gov-invariant");

        snapshotBlock = governor.proposalSnapshot(proposalId);
        vm.roll(snapshotBlock + 1);
        initialQuorum = governor.quorum(snapshotBlock);
        vm.prank(voter);
        governor.castVote(proposalId, 1);
        (, initialForVotes,) = governor.proposalVotes(proposalId);
    }

    function mintLate(uint96 rawAmount) external {
        uint256 amount = bound(uint256(rawAmount), 1 ether, 500_000 ether);
        vm.prank(admin);
        token.mint(lateWhale, amount);
    }

    function delegateLate() external {
        vm.prank(lateWhale);
        token.delegate(lateWhale);
    }

    function rollBlocks(uint16 blocksForward) external {
        uint256 step = bound(uint256(blocksForward), 1, 100);
        vm.roll(block.number + step);
    }
}

contract AresGovernanceCaptureInvariantTest is StdInvariant, Test {
    AresToken internal token;
    TimelockController internal timelock;
    AresGovernor internal governor;
    GovernanceInvariantTarget internal target;
    GovernanceCaptureHandler internal handler;

    function setUp() public {
        token = new AresToken(address(this), address(this));
        address[] memory proposers = new address[](0);
        address[] memory executors = new address[](1);
        executors[0] = address(0);
        timelock = new TimelockController(2 days, proposers, executors, address(this));
        governor = new AresGovernor(token, timelock, uint48(1 days), uint32(1 weeks), 0, 4);
        timelock.grantRole(timelock.PROPOSER_ROLE(), address(governor));
        timelock.grantRole(timelock.CANCELLER_ROLE(), address(governor));
        target = new GovernanceInvariantTarget();
        handler = new GovernanceCaptureHandler(address(this), token, governor, timelock, target);
        targetContract(address(handler));
    }

    function invariant_PostSnapshotMintDoesNotChangeRecordedVotes() public view {
        (uint256 againstVotes, uint256 forVotes, uint256 abstainVotes) = governor.proposalVotes(handler.proposalId());
        assertEq(againstVotes, 0);
        assertEq(abstainVotes, 0);
        assertEq(forVotes, handler.initialForVotes());
    }

    function invariant_QuorumAtSnapshotRemainsStable() public view {
        assertEq(governor.quorum(handler.snapshotBlock()), handler.initialQuorum());
    }

    function invariant_TimelockDelayNeverDropsBelowTwoDays() public view {
        assertGe(timelock.getMinDelay(), 2 days);
    }
}
