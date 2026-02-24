// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "../interfaces/erc8004-spec/IERC8004ValidationRegistry.sol";

interface IAresDisputeAdapter {
    function disputeActionFromAdapter(address challenger, uint256 agentId, bytes32 actionId, uint256 challengerStake, string calldata reasonURI)
        external
        returns (uint256 disputeId);

    function validatorJoinFromAdapter(address validator, uint256 disputeId, uint256 stake) external;

    function voteFromAdapter(address validator, uint256 disputeId, bool acceptChallenge) external;

    function finalize(uint256 disputeId) external;
}

contract ERC8004ValidationAdapter is AccessControl, IERC8004ValidationRegistry {
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");

    IAresDisputeAdapter public immutable dispute;

    mapping(uint256 => ValidationRequest) public requests;

    constructor(address admin, address governance, IAresDisputeAdapter dispute_) {
        require(admin != address(0), "invalid admin");
        require(governance != address(0), "invalid governance");
        require(address(dispute_) != address(0), "invalid dispute");

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GOVERNANCE_ROLE, governance);

        dispute = dispute_;
    }

    function validationRequest(uint256 agentId, bytes32 actionId, string calldata reasonURI, uint256 stakeAmount)
        external
        override
        returns (uint256 requestId)
    {
        requestId = dispute.disputeActionFromAdapter(msg.sender, agentId, actionId, stakeAmount, reasonURI);

        requests[requestId] = ValidationRequest({
            agentId: agentId,
            actionId: actionId,
            requester: msg.sender,
            reasonURI: reasonURI,
            stakeAmount: stakeAmount,
            createdAt: uint64(block.timestamp)
        });

        emit ValidationRequested(requestId, agentId, actionId, msg.sender, reasonURI, stakeAmount);
    }

    function validationResponse(uint256 requestId, bool acceptChallenge, uint256 stakeAmount) external override {
        if (stakeAmount > 0) {
            dispute.validatorJoinFromAdapter(msg.sender, requestId, stakeAmount);
        }

        dispute.voteFromAdapter(msg.sender, requestId, acceptChallenge);

        emit ValidationResponded(requestId, msg.sender, acceptChallenge, stakeAmount);
    }

    function getValidationRequest(uint256 requestId) external view override returns (ValidationRequest memory) {
        return requests[requestId];
    }

    function finalizeValidation(uint256 requestId) external {
        dispute.finalize(requestId);
    }
}
