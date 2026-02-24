// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC8004IdentityRegistry {
    struct MetadataEntry {
        bytes32 key;
        bytes value;
    }

    function register(string calldata agentURI, MetadataEntry[] calldata metadata) external returns (uint256 agentId);

    function setAgentURI(uint256 agentId, string calldata newAgentURI) external;

    function agentURI(uint256 agentId) external view returns (string memory);

    function setMetadata(uint256 agentId, MetadataEntry[] calldata metadata) external;

    function getMetadata(uint256 agentId) external view returns (MetadataEntry[] memory);

    function setAgentWallet(uint256 agentId, address wallet) external;

    function getAgentWallet(uint256 agentId) external view returns (address);

    function unsetAgentWallet(uint256 agentId) external;

    event Registered(address indexed owner, uint256 indexed agentId, string agentURI);
    event URIUpdated(uint256 indexed agentId, string newAgentURI);
    event MetadataSet(uint256 indexed agentId, bytes32 indexed key, bytes value);
    event AgentWalletSet(uint256 indexed agentId, address indexed wallet);
    event AgentWalletUnset(uint256 indexed agentId);
}
