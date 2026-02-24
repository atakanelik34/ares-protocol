// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IAresDispute.sol";
import "../interfaces/IAresScorecardLedger.sol";
import "../interfaces/IAresARIEngine.sol";

contract AresDispute is AccessControl, IAresDispute {
    using SafeERC20 for IERC20;

    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant ADAPTER_ROLE = keccak256("ADAPTER_ROLE");

    struct Dispute {
        uint256 id;
        uint256 agentId;
        bytes32 actionId;
        address challenger;
        uint256 challengerStake;
        string reasonURI;
        uint64 deadline;
        bool finalized;
        bool accepted;
        uint256 totalAcceptStake;
        uint256 totalRejectStake;
        uint256 totalValidatorStake;
        address[] validators;
    }

    struct ValidatorPosition {
        uint256 stake;
        bool voted;
        bool acceptChallenge;
        bool exists;
    }

    IERC20 public immutable stakingToken;
    IAresScorecardLedger public immutable ledger;
    IAresARIEngine public immutable ariEngine;

    uint256 public minChallengerStake;
    uint256 public minValidatorStake;
    uint64 public votingPeriod;
    uint256 public quorum;
    uint16 public slashingBps;
    address public treasury;

    uint256 public nextDisputeId = 1;

    mapping(uint256 => Dispute) public disputes;
    mapping(uint256 => mapping(address => ValidatorPosition)) public validatorPositions;
    mapping(address => uint256) public pendingWithdrawals;

    event DisputeOpened(
        uint256 indexed disputeId,
        uint256 indexed agent,
        bytes32 indexed actionId,
        address challenger,
        uint256 challengerStake,
        string reasonURI,
        uint64 deadline
    );
    event ValidatorJoined(uint256 indexed disputeId, address indexed validator, uint256 stake);
    event VoteCast(uint256 indexed disputeId, address indexed voter, bool acceptChallenge, uint256 stake);
    event DisputeFinalized(uint256 indexed disputeId, bool accepted, uint256 slashedAmount);
    event ScoreInvalidated(uint256 indexed disputeId, uint256 indexed agent, bytes32 indexed actionId);
    event WithdrawalClaimed(address indexed account, uint256 amount);

    error InvalidStake();
    error DisputeNotFound();
    error VotingClosed();
    error VotingNotClosed();
    error AlreadyFinalized();
    error AlreadyVoted();
    error NotValidator();

    constructor(
        address admin,
        address governance,
        IERC20 stakingToken_,
        IAresScorecardLedger ledger_,
        IAresARIEngine ariEngine_,
        address treasury_,
        uint256 minChallengerStake_,
        uint256 minValidatorStake_,
        uint64 votingPeriod_,
        uint256 quorum_,
        uint16 slashingBps_
    ) {
        require(admin != address(0), "invalid admin");
        require(governance != address(0), "invalid governance");
        require(address(stakingToken_) != address(0), "invalid token");
        require(address(ledger_) != address(0), "invalid ledger");
        require(address(ariEngine_) != address(0), "invalid engine");
        require(treasury_ != address(0), "invalid treasury");
        require(slashingBps_ <= 10_000, "invalid slashing");

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GOVERNANCE_ROLE, governance);

        stakingToken = stakingToken_;
        ledger = ledger_;
        ariEngine = ariEngine_;
        treasury = treasury_;
        minChallengerStake = minChallengerStake_;
        minValidatorStake = minValidatorStake_;
        votingPeriod = votingPeriod_;
        quorum = quorum_;
        slashingBps = slashingBps_;
    }

    function disputeAction(uint256 agentId, bytes32 actionId, uint256 challengerStake, string calldata reasonURI)
        external
        override
        returns (uint256 disputeId)
    {
        disputeId = _openDispute(msg.sender, agentId, actionId, challengerStake, reasonURI);
    }

    function validatorJoin(uint256 disputeId, uint256 stake) external override {
        _validatorJoin(msg.sender, disputeId, stake);
    }

    function disputeActionFromAdapter(address challenger, uint256 agentId, bytes32 actionId, uint256 challengerStake, string calldata reasonURI)
        external
        onlyRole(ADAPTER_ROLE)
        returns (uint256 disputeId)
    {
        disputeId = _openDispute(challenger, agentId, actionId, challengerStake, reasonURI);
    }

    function validatorJoinFromAdapter(address validator, uint256 disputeId, uint256 stake)
        external
        onlyRole(ADAPTER_ROLE)
    {
        _validatorJoin(validator, disputeId, stake);
    }

    function _openDispute(address challenger, uint256 agentId, bytes32 actionId, uint256 challengerStake, string calldata reasonURI)
        internal
        returns (uint256 disputeId)
    {
        if (challengerStake < minChallengerStake) revert InvalidStake();
        stakingToken.safeTransferFrom(challenger, address(this), challengerStake);

        disputeId = nextDisputeId++;
        Dispute storage d = disputes[disputeId];
        d.id = disputeId;
        d.agentId = agentId;
        d.actionId = actionId;
        d.challenger = challenger;
        d.challengerStake = challengerStake;
        d.reasonURI = reasonURI;
        d.deadline = uint64(block.timestamp + votingPeriod);

        emit DisputeOpened(disputeId, agentId, actionId, challenger, challengerStake, reasonURI, d.deadline);
    }

    function _validatorJoin(address validator, uint256 disputeId, uint256 stake) internal {
        if (stake < minValidatorStake) revert InvalidStake();

        Dispute storage d = disputes[disputeId];
        if (d.id == 0) revert DisputeNotFound();
        if (block.timestamp >= d.deadline) revert VotingClosed();

        ValidatorPosition storage pos = validatorPositions[disputeId][validator];
        if (!pos.exists) {
            pos.exists = true;
            d.validators.push(validator);
        }
        pos.stake += stake;
        d.totalValidatorStake += stake;

        stakingToken.safeTransferFrom(validator, address(this), stake);

        emit ValidatorJoined(disputeId, validator, stake);
    }

    function vote(uint256 disputeId, bool acceptChallenge) external override {
        _vote(msg.sender, disputeId, acceptChallenge);
    }

    function voteFromAdapter(address validator, uint256 disputeId, bool acceptChallenge)
        external
        onlyRole(ADAPTER_ROLE)
    {
        _vote(validator, disputeId, acceptChallenge);
    }

    function _vote(address validator, uint256 disputeId, bool acceptChallenge) internal {
        Dispute storage d = disputes[disputeId];
        if (d.id == 0) revert DisputeNotFound();
        if (block.timestamp >= d.deadline) revert VotingClosed();

        ValidatorPosition storage pos = validatorPositions[disputeId][validator];
        if (!pos.exists || pos.stake == 0) revert NotValidator();
        if (pos.voted) revert AlreadyVoted();

        pos.voted = true;
        pos.acceptChallenge = acceptChallenge;

        if (acceptChallenge) {
            d.totalAcceptStake += pos.stake;
        } else {
            d.totalRejectStake += pos.stake;
        }

        emit VoteCast(disputeId, validator, acceptChallenge, pos.stake);
    }

    function finalize(uint256 disputeId) external override {
        Dispute storage d = disputes[disputeId];
        if (d.id == 0) revert DisputeNotFound();
        if (d.finalized) revert AlreadyFinalized();
        if (block.timestamp < d.deadline) revert VotingNotClosed();

        d.finalized = true;

        uint256 totalParticipation = d.challengerStake + d.totalValidatorStake;
        bool accepted = d.totalAcceptStake > d.totalRejectStake && totalParticipation >= quorum;
        d.accepted = accepted;

        uint256 slashedPool = 0;
        uint256 winnerStake = 0;

        if (accepted) {
            (uint16[5] memory scores, uint64 ts) = ledger.invalidateAction(d.agentId, d.actionId);
            ariEngine.invalidateActionContribution(d.agentId, scores, ts);
            emit ScoreInvalidated(disputeId, d.agentId, d.actionId);
        }

        uint256 challengerNet = d.challengerStake;
        if (!accepted) {
            uint256 challengerSlash = (d.challengerStake * slashingBps) / 10_000;
            challengerNet -= challengerSlash;
            slashedPool += challengerSlash;
            winnerStake = d.totalRejectStake;
        } else {
            winnerStake = d.totalAcceptStake;
        }

        pendingWithdrawals[d.challenger] += challengerNet;

        uint256 len = d.validators.length;
        for (uint256 i = 0; i < len; i++) {
            address validator = d.validators[i];
            ValidatorPosition storage pos = validatorPositions[disputeId][validator];

            uint256 slash = 0;
            if (pos.voted) {
                bool loser = accepted ? !pos.acceptChallenge : pos.acceptChallenge;
                if (loser) {
                    slash = (pos.stake * slashingBps) / 10_000;
                }
            }

            uint256 net = pos.stake - slash;
            pendingWithdrawals[validator] += net;
            slashedPool += slash;
        }

        if (slashedPool > 0 && winnerStake > 0) {
            if (accepted) {
                uint256 challengerReward = slashedPool / 2;
                pendingWithdrawals[d.challenger] += challengerReward;
                uint256 remainder = slashedPool - challengerReward;
                _distributeToWinners(disputeId, true, remainder, winnerStake);
            } else {
                _distributeToWinners(disputeId, false, slashedPool, winnerStake);
            }
        } else if (slashedPool > 0) {
            pendingWithdrawals[treasury] += slashedPool;
        }

        emit DisputeFinalized(disputeId, accepted, slashedPool);
    }

    function _distributeToWinners(uint256 disputeId, bool accepted, uint256 amount, uint256 winnerStake) internal {
        Dispute storage d = disputes[disputeId];

        uint256 distributed = 0;
        uint256 len = d.validators.length;
        for (uint256 i = 0; i < len; i++) {
            address validator = d.validators[i];
            ValidatorPosition storage pos = validatorPositions[disputeId][validator];
            if (!pos.voted) continue;
            if (accepted != pos.acceptChallenge) continue;

            uint256 share = (amount * pos.stake) / winnerStake;
            if (share == 0) continue;

            pendingWithdrawals[validator] += share;
            distributed += share;
        }

        if (accepted && d.totalAcceptStake == 0) {
            pendingWithdrawals[d.challenger] += amount;
            return;
        }

        if (distributed < amount) {
            pendingWithdrawals[treasury] += (amount - distributed);
        }
    }

    function claim() external {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "nothing to claim");

        pendingWithdrawals[msg.sender] = 0;
        stakingToken.safeTransfer(msg.sender, amount);

        emit WithdrawalClaimed(msg.sender, amount);
    }

    function setDisputeParams(
        uint256 minChallengerStake_,
        uint256 minValidatorStake_,
        uint64 votingPeriod_,
        uint256 quorum_,
        uint16 slashingBps_,
        address treasury_
    ) external onlyRole(GOVERNANCE_ROLE) {
        require(slashingBps_ <= 10_000, "invalid slashing");
        require(treasury_ != address(0), "invalid treasury");

        minChallengerStake = minChallengerStake_;
        minValidatorStake = minValidatorStake_;
        votingPeriod = votingPeriod_;
        quorum = quorum_;
        slashingBps = slashingBps_;
        treasury = treasury_;
    }

    function setAdapterRole(address adapter, bool allowed) external onlyRole(GOVERNANCE_ROLE) {
        if (allowed) {
            _grantRole(ADAPTER_ROLE, adapter);
        } else {
            _revokeRole(ADAPTER_ROLE, adapter);
        }
    }

    function getDispute(uint256 disputeId) external view returns (Dispute memory) {
        return disputes[disputeId];
    }
}
