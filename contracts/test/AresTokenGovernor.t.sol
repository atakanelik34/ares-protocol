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

contract AresTokenGovernorTest is Test {
    AresToken token;
    TimelockController timelock;
    AresGovernor governor;
    GovernorTarget target;

    address treasury = address(0xBEEF);
    address voter = address(0xA11CE);
    address spender = address(0xB0B);

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
}
