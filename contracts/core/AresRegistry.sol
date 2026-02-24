// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IAresRegistry.sol";

contract AresRegistry is AccessControl, IAresRegistry {
    using SafeERC20 for IERC20;

    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant ADAPTER_ROLE = keccak256("ADAPTER_ROLE");

    struct Agent {
        uint256 id;
        address operator;
        string metadataURI;
        bytes32 metadataHash;
        uint256 stakedAmount;
        uint256 pendingWithdrawAmount;
        uint64 withdrawAvailableAt;
        bool exists;
    }

    IERC20 public immutable stakingToken;
    uint256 public minStake;
    uint64 public withdrawalCooldown;
    uint256 public nextAgentId;

    mapping(uint256 => Agent) public agents;
    mapping(address => uint256) public operatorToAgentId;
    mapping(address => uint256) public walletToAgentId;
    mapping(uint256 => mapping(address => bool)) public linkedWallets;

    event AgentRegistered(address indexed agent, address indexed operator, uint256 indexed agentId);
    event StakeDeposited(address indexed agent, uint256 amount);
    event StakeWithdrawRequested(address indexed agent, uint256 amount, uint64 availableAt);
    event StakeWithdrawn(address indexed agent, uint256 amount);
    event WalletLinked(address indexed agent, address indexed wallet);
    event WalletUnlinked(address indexed agent, address indexed wallet);
    event MinStakeUpdated(uint256 oldValue, uint256 newValue);
    event WithdrawalCooldownUpdated(uint64 oldValue, uint64 newValue);

    error AgentAlreadyRegistered();
    error AgentNotFound();
    error InvalidOperator();
    error NotOperator();
    error InsufficientStake();
    error InvalidAmount();
    error CooldownNotElapsed();
    error WalletAlreadyLinked();
    error WalletNotLinked();

    constructor(address admin, address governance, IERC20 stakingToken_, uint256 minStake_, uint64 withdrawalCooldown_) {
        require(admin != address(0), "invalid admin");
        require(governance != address(0), "invalid governance");
        require(address(stakingToken_) != address(0), "invalid token");

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GOVERNANCE_ROLE, governance);

        stakingToken = stakingToken_;
        minStake = minStake_;
        withdrawalCooldown = withdrawalCooldown_;
        nextAgentId = 1;
    }

    function registerAgent(address operator, string calldata metadataURI, bytes32 metadataHash)
        external
        returns (uint256 agentId)
    {
        if (operator == address(0)) revert InvalidOperator();
        if (operatorToAgentId[operator] != 0) revert AgentAlreadyRegistered();
        if (msg.sender != operator && !hasRole(ADAPTER_ROLE, msg.sender)) revert NotOperator();

        stakingToken.safeTransferFrom(operator, address(this), minStake);

        agentId = nextAgentId++;

        Agent storage agent = agents[agentId];
        agent.id = agentId;
        agent.operator = operator;
        agent.metadataURI = metadataURI;
        agent.metadataHash = metadataHash;
        agent.stakedAmount = minStake;
        agent.exists = true;

        operatorToAgentId[operator] = agentId;

        emit AgentRegistered(operator, operator, agentId);
        emit StakeDeposited(operator, minStake);
    }

    function depositStake(uint256 amount) external {
        if (amount == 0) revert InvalidAmount();

        uint256 agentId = operatorToAgentId[msg.sender];
        if (agentId == 0) revert AgentNotFound();

        agents[agentId].stakedAmount += amount;
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        emit StakeDeposited(msg.sender, amount);
    }

    function requestStakeWithdrawal(uint256 amount) external {
        if (amount == 0) revert InvalidAmount();

        uint256 agentId = operatorToAgentId[msg.sender];
        if (agentId == 0) revert AgentNotFound();

        Agent storage agent = agents[agentId];
        if (agent.stakedAmount < amount) revert InsufficientStake();
        if (agent.stakedAmount - amount < minStake) revert InsufficientStake();

        agent.pendingWithdrawAmount = amount;
        agent.withdrawAvailableAt = uint64(block.timestamp + withdrawalCooldown);

        emit StakeWithdrawRequested(msg.sender, amount, agent.withdrawAvailableAt);
    }

    function withdrawStake() external {
        uint256 agentId = operatorToAgentId[msg.sender];
        if (agentId == 0) revert AgentNotFound();

        Agent storage agent = agents[agentId];
        uint256 amount = agent.pendingWithdrawAmount;

        if (amount == 0) revert InvalidAmount();
        if (block.timestamp < agent.withdrawAvailableAt) revert CooldownNotElapsed();

        agent.pendingWithdrawAmount = 0;
        agent.withdrawAvailableAt = 0;
        agent.stakedAmount -= amount;

        stakingToken.safeTransfer(msg.sender, amount);
        emit StakeWithdrawn(msg.sender, amount);
    }

    function linkWallet(address wallet) external {
        if (wallet == address(0)) revert InvalidOperator();

        uint256 agentId = operatorToAgentId[msg.sender];
        if (agentId == 0) revert AgentNotFound();

        if (walletToAgentId[wallet] != 0) revert WalletAlreadyLinked();
        if (linkedWallets[agentId][wallet]) revert WalletAlreadyLinked();

        linkedWallets[agentId][wallet] = true;
        walletToAgentId[wallet] = agentId;

        emit WalletLinked(msg.sender, wallet);
    }

    function unlinkWallet(address wallet) external {
        uint256 agentId = operatorToAgentId[msg.sender];
        if (agentId == 0) revert AgentNotFound();
        if (!linkedWallets[agentId][wallet]) revert WalletNotLinked();

        linkedWallets[agentId][wallet] = false;
        walletToAgentId[wallet] = 0;

        emit WalletUnlinked(msg.sender, wallet);
    }

    function setMinStake(uint256 newMinStake) external onlyRole(GOVERNANCE_ROLE) {
        uint256 old = minStake;
        minStake = newMinStake;
        emit MinStakeUpdated(old, newMinStake);
    }

    function setWithdrawalCooldown(uint64 newCooldown) external onlyRole(GOVERNANCE_ROLE) {
        uint64 old = withdrawalCooldown;
        withdrawalCooldown = newCooldown;
        emit WithdrawalCooldownUpdated(old, newCooldown);
    }

    function setAdapterRole(address adapter, bool enabled) external onlyRole(GOVERNANCE_ROLE) {
        if (enabled) {
            _grantRole(ADAPTER_ROLE, adapter);
        } else {
            _revokeRole(ADAPTER_ROLE, adapter);
        }
    }

    function resolveAgentId(address account) external view override returns (uint256 agentId) {
        agentId = operatorToAgentId[account];
        if (agentId == 0) {
            agentId = walletToAgentId[account];
        }
    }

    function operatorOf(uint256 agentId) external view override returns (address operator) {
        operator = agents[agentId].operator;
    }

    function metadataOf(uint256 agentId) external view returns (string memory metadataURI, bytes32 metadataHash) {
        Agent storage a = agents[agentId];
        return (a.metadataURI, a.metadataHash);
    }

    function stakeOf(uint256 agentId) external view returns (uint256) {
        return agents[agentId].stakedAmount;
    }

    function isRegisteredAgent(uint256 agentId) external view override returns (bool) {
        return agents[agentId].exists;
    }
}
