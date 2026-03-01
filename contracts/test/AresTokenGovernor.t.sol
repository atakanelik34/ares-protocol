// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts/governance/TimelockController.sol";
import "@openzeppelin/contracts/governance/IGovernor.sol";
import "../token/AresToken.sol";
import "../token/AresGovernor.sol";

contract GovernorTarget {
    uint256 public value;

    function setValue(uint256 newValue) external {
        value = newValue;
    }
}

contract GovernedTarget {
    address public immutable timelock;
    uint256 public guardedValue;

    constructor(address timelock_) {
        timelock = timelock_;
    }

    function setGuardedValue(uint256 newValue) external {
        require(msg.sender == timelock, "only timelock");
        guardedValue = newValue;
    }
}

contract AresTokenGovernorTest is Test {
    AresToken token;
    TimelockController timelock;
    AresGovernor governor;
    GovernorTarget target;
    GovernedTarget governedTarget;

    address treasury = address(0xBEEF);
    address voter = address(0xA11CE);
    address lateWhale = address(0xBADA55);
    address spender = address(0xB0B);

    function _deploySnapshotHarness(uint256 voterMint, uint256 passiveSupply)
        internal
        returns (AresToken token_, TimelockController timelock_, AresGovernor governor_, GovernedTarget governedTarget_)
    {
        token_ = new AresToken(address(this), treasury);

        address[] memory proposers = new address[](0);
        address[] memory executors = new address[](1);
        executors[0] = address(0);
        timelock_ = new TimelockController(2 days, proposers, executors, address(this));
        governor_ = new AresGovernor(token_, timelock_);

        timelock_.grantRole(timelock_.PROPOSER_ROLE(), address(governor_));
        timelock_.grantRole(timelock_.CANCELLER_ROLE(), address(governor_));

        token_.mint(voter, voterMint);
        if (passiveSupply > 0) {
            token_.mint(address(this), passiveSupply);
        }
        vm.prank(voter);
        token_.delegate(voter);
        vm.roll(block.number + 1);

        governedTarget_ = new GovernedTarget(address(timelock_));
    }

    function setUp() public {
        token = new AresToken(address(this), treasury);

        address[] memory proposers = new address[](0);
        address[] memory executors = new address[](1);
        executors[0] = address(0);
        timelock = new TimelockController(2 days, proposers, executors, address(this));
        governor = new AresGovernor(token, timelock);
        target = new GovernorTarget();

        timelock.grantRole(timelock.PROPOSER_ROLE(), address(governor));
        timelock.grantRole(timelock.CANCELLER_ROLE(), address(governor));

        token.mint(voter, 1_000 ether);
        vm.prank(voter);
        token.delegate(voter);
        vm.roll(block.number + 1);
        governedTarget = new GovernedTarget(address(timelock));
    }

    function testTokenConstructorGuardrails() public {
        vm.expectRevert(bytes("invalid admin"));
        new AresToken(address(0), treasury);

        vm.expectRevert(bytes("invalid treasury"));
        new AresToken(address(this), address(0));
    }

    function testTokenRolesTreasuryAndBurnPaths() public {
        assertTrue(token.hasRole(token.MINTER_ROLE(), address(this)));
        assertTrue(token.hasRole(token.TREASURY_ROLE(), treasury));

        address newTreasury = address(0xCAFE);
        token.setTreasury(newTreasury);
        assertEq(token.treasury(), newTreasury);
        assertTrue(token.hasRole(token.TREASURY_ROLE(), newTreasury));
        assertFalse(token.hasRole(token.TREASURY_ROLE(), treasury));

        vm.prank(voter);
        token.approve(spender, 100 ether);

        vm.prank(spender);
        token.burnFrom(voter, 40 ether);
        assertEq(token.balanceOf(voter), 960 ether);

        vm.prank(voter);
        token.burn(10 ether);
        assertEq(token.balanceOf(voter), 950 ether);

        token.recordFeePayment(5 ether, keccak256("api"));
    }

    function testTokenPrivilegeGuardrails() public {
        vm.prank(voter);
        vm.expectRevert();
        token.mint(voter, 1 ether);

        vm.prank(voter);
        vm.expectRevert();
        token.setTreasury(voter);

        vm.expectRevert(bytes("invalid treasury"));
        token.setTreasury(address(0));
    }

    function testGovernorLifecycleExecutesProposal() public {
        assertEq(governor.quorum(block.number - 1), 40 ether);
        assertEq(governor.votingDelay(), 1 days);
        assertEq(governor.votingPeriod(), 1 weeks);
        assertEq(governor.proposalThreshold(), 0);
        address[] memory targets = new address[](1);
        targets[0] = address(target);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeCall(GovernorTarget.setValue, (42));
        string memory description = "set-governor-target";

        vm.prank(voter);
        uint256 proposalId = governor.propose(targets, values, calldatas, description);
        assertEq(uint256(governor.state(proposalId)), uint256(IGovernor.ProposalState.Pending));

        vm.roll(block.number + governor.votingDelay() + 1);
        assertEq(uint256(governor.state(proposalId)), uint256(IGovernor.ProposalState.Active));

        vm.prank(voter);
        governor.castVote(proposalId, 1);

        vm.roll(block.number + governor.votingPeriod() + 1);
        assertEq(uint256(governor.state(proposalId)), uint256(IGovernor.ProposalState.Succeeded));

        bytes32 descriptionHash = keccak256(bytes(description));
        governor.queue(targets, values, calldatas, descriptionHash);
        assertEq(uint256(governor.state(proposalId)), uint256(IGovernor.ProposalState.Queued));

        vm.warp(block.timestamp + timelock.getMinDelay() + 1);
        governor.execute(targets, values, calldatas, descriptionHash);

        assertEq(target.value(), 42);
        assertEq(uint256(governor.state(proposalId)), uint256(IGovernor.ProposalState.Executed));
    }

    function testGovernorMetadataAndTimelockBindings() public view {
        assertEq(governor.name(), "AresGovernor");
        assertEq(address(governor.token()), address(token));
        assertEq(address(governor.timelock()), address(timelock));
    }

    function testGovernorInterfaceAndTimelockDelayBindings() public view {
        assertTrue(governor.supportsInterface(type(IERC165).interfaceId));
        assertEq(governor.votingDelay(), 1 days);
        assertEq(governor.votingPeriod(), 1 weeks);
        assertEq(timelock.getMinDelay(), 2 days);
    }

    function testGovernedTargetRejectsDirectMutationAndUnauthorizedScheduling() public {
        vm.prank(voter);
        vm.expectRevert(bytes("only timelock"));
        governedTarget.setGuardedValue(7);

        bytes memory data = abi.encodeCall(GovernedTarget.setGuardedValue, (7));
        uint256 minDelay = timelock.getMinDelay();
        bytes32 salt = bytes32("salt");

        vm.prank(voter);
        vm.expectRevert();
        timelock.schedule(address(governedTarget), 0, data, bytes32(0), salt, minDelay);

        vm.prank(voter);
        vm.expectRevert();
        timelock.execute(address(governedTarget), 0, data, bytes32(0), salt);
    }

    function testGovernorCannotBypassQueueOrTimelockDelayForGovernedMutation() public {
        address[] memory targets = new address[](1);
        targets[0] = address(governedTarget);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeCall(GovernedTarget.setGuardedValue, (99));
        string memory description = "set-guarded-target";
        bytes32 descriptionHash = keccak256(bytes(description));

        vm.prank(voter);
        uint256 proposalId = governor.propose(targets, values, calldatas, description);

        vm.roll(block.number + governor.votingDelay() + 1);
        vm.prank(voter);
        governor.castVote(proposalId, 1);
        vm.roll(block.number + governor.votingPeriod() + 1);

        vm.expectRevert();
        governor.execute(targets, values, calldatas, descriptionHash);

        governor.queue(targets, values, calldatas, descriptionHash);

        vm.warp(block.timestamp + timelock.getMinDelay() - 1);
        vm.expectRevert();
        governor.execute(targets, values, calldatas, descriptionHash);

        vm.warp(block.timestamp + 1);
        governor.execute(targets, values, calldatas, descriptionHash);

        assertEq(governedTarget.guardedValue(), 99);
        assertEq(uint256(governor.state(proposalId)), uint256(IGovernor.ProposalState.Executed));
    }

    function testMintRoleRevocationAloneDoesNotCreateFinality() public {
        token.revokeRole(token.MINTER_ROLE(), address(this));
        assertFalse(token.hasRole(token.MINTER_ROLE(), address(this)));

        token.grantRole(token.MINTER_ROLE(), address(this));
        assertTrue(token.hasRole(token.MINTER_ROLE(), address(this)));
        token.mint(address(this), 1 ether);
        assertEq(token.balanceOf(address(this)), 1 ether);
    }

    function testMintFinalityCeremonyBecomesOneWayAfterAdminRenounce() public {
        token.mint(address(this), 1_000_000_000 ether);
        bytes32 minterRole = token.MINTER_ROLE();
        bytes32 adminRole = token.DEFAULT_ADMIN_ROLE();
        token.revokeRole(minterRole, address(this));
        assertFalse(token.hasRole(minterRole, address(this)));

        token.renounceRole(adminRole, address(this));
        assertFalse(token.hasRole(adminRole, address(this)));

        vm.expectRevert();
        token.grantRole(minterRole, address(this));

        vm.expectRevert();
        token.mint(address(this), 1 ether);
    }

    function testPostSnapshotMintCannotCreateQuorumForExistingProposal() public {
        (AresToken token_, TimelockController timelock_, AresGovernor governor_, GovernedTarget governedTarget_) =
            _deploySnapshotHarness(39 ether, 961 ether);

        address[] memory targets = new address[](1);
        targets[0] = address(governedTarget_);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeCall(GovernedTarget.setGuardedValue, (111));
        string memory description = "late-mint-cannot-create-quorum";

        vm.prank(voter);
        uint256 proposalId = governor_.propose(targets, values, calldatas, description);

        vm.roll(block.number + governor_.votingDelay() + 1);
        vm.prank(voter);
        governor_.castVote(proposalId, 1);

        token_.mint(lateWhale, 1_000 ether);
        vm.prank(lateWhale);
        token_.delegate(lateWhale);
        vm.roll(block.number + 1);

        vm.prank(lateWhale);
        governor_.castVote(proposalId, 1);

        vm.roll(block.number + governor_.votingPeriod() + 1);
        assertEq(uint256(governor_.state(proposalId)), uint256(IGovernor.ProposalState.Defeated));
        assertEq(governor_.quorum(block.number - 1), 80 ether);
    }

    function testPostSnapshotDelegationCannotRetroactivelyIncreaseVotes() public {
        (AresToken token_, TimelockController timelock_, AresGovernor governor_, GovernedTarget governedTarget_) =
            _deploySnapshotHarness(39 ether, 0);
        assertTrue(address(timelock_) != address(0));

        token_.mint(lateWhale, 961 ether);

        address[] memory targets = new address[](1);
        targets[0] = address(governedTarget_);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeCall(GovernedTarget.setGuardedValue, (222));
        string memory description = "late-delegation-cannot-help";

        vm.prank(voter);
        uint256 proposalId = governor_.propose(targets, values, calldatas, description);

        vm.roll(block.number + governor_.votingDelay() + 1);
        vm.prank(voter);
        governor_.castVote(proposalId, 1);

        vm.prank(lateWhale);
        token_.delegate(lateWhale);
        vm.roll(block.number + 1);

        vm.prank(lateWhale);
        governor_.castVote(proposalId, 1);

        vm.roll(block.number + governor_.votingPeriod() + 1);
        assertEq(uint256(governor_.state(proposalId)), uint256(IGovernor.ProposalState.Defeated));
        assertEq(governor_.quorum(block.number - 1), 40 ether);
    }
}
