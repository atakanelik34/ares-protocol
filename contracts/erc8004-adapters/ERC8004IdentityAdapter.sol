// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "../interfaces/erc8004-spec/IERC8004IdentityRegistry.sol";

interface IAresRegistryForAdapter {
    function registerAgent(address operator, string calldata metadataURI, bytes32 metadataHash)
        external
        returns (uint256 agentId);

    function operatorOf(uint256 agentId) external view returns (address operator);
}

contract ERC8004IdentityAdapter is ERC721URIStorage, AccessControl, IERC8004IdentityRegistry {
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");

    IAresRegistryForAdapter public immutable coreRegistry;

    mapping(uint256 => uint256) public coreAgentIdOf;
    mapping(uint256 => address) private _agentWallet;

    mapping(uint256 => bytes32[]) private _metadataKeys;
    mapping(uint256 => mapping(bytes32 => bytes)) private _metadataValues;
    mapping(uint256 => mapping(bytes32 => bool)) private _metadataKeyExists;

    constructor(address admin, address governance, IAresRegistryForAdapter coreRegistry_)
        ERC721("ARES ERC8004 Identity Adapter", "ARES-ID")
    {
        require(admin != address(0), "invalid admin");
        require(governance != address(0), "invalid governance");
        require(address(coreRegistry_) != address(0), "invalid registry");

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GOVERNANCE_ROLE, governance);

        coreRegistry = coreRegistry_;
    }

    function register(string calldata agentURI_, MetadataEntry[] calldata metadata)
        external
        override
        returns (uint256 agentId)
    {
        bytes32 metadataHash = keccak256(abi.encode(metadata));
        uint256 coreId = coreRegistry.registerAgent(msg.sender, agentURI_, metadataHash);

        require(!_exists(coreId), "adapter token exists");

        _safeMint(msg.sender, coreId);
        _setTokenURI(coreId, agentURI_);
        coreAgentIdOf[coreId] = coreId;

        _setMetadataInternal(coreId, metadata);

        emit Registered(msg.sender, coreId, agentURI_);
        return coreId;
    }

    function setAgentURI(uint256 agentId, string calldata newAgentURI) external override {
        require(_isApprovedOrOwner(msg.sender, agentId), "not owner/approved");
        _setTokenURI(agentId, newAgentURI);
        emit URIUpdated(agentId, newAgentURI);
    }

    function agentURI(uint256 agentId) external view override returns (string memory) {
        return tokenURI(agentId);
    }

    function setMetadata(uint256 agentId, MetadataEntry[] calldata metadata) external override {
        require(_isApprovedOrOwner(msg.sender, agentId), "not owner/approved");
        _setMetadataInternal(agentId, metadata);
    }

    function getMetadata(uint256 agentId) external view override returns (MetadataEntry[] memory entries) {
        bytes32[] storage keys = _metadataKeys[agentId];
        entries = new MetadataEntry[](keys.length);

        for (uint256 i = 0; i < keys.length; i++) {
            entries[i] = MetadataEntry({key: keys[i], value: _metadataValues[agentId][keys[i]]});
        }
    }

    function setAgentWallet(uint256 agentId, address wallet) external override {
        require(_isApprovedOrOwner(msg.sender, agentId), "not owner/approved");
        _agentWallet[agentId] = wallet;
        emit AgentWalletSet(agentId, wallet);
    }

    function getAgentWallet(uint256 agentId) external view override returns (address) {
        return _agentWallet[agentId];
    }

    function unsetAgentWallet(uint256 agentId) external override {
        require(_isApprovedOrOwner(msg.sender, agentId), "not owner/approved");
        delete _agentWallet[agentId];
        emit AgentWalletUnset(agentId);
    }

    function coreOperatorOf(uint256 adapterAgentId) external view returns (address) {
        uint256 coreId = coreAgentIdOf[adapterAgentId];
        if (coreId == 0) return address(0);
        return coreRegistry.operatorOf(coreId);
    }

    function isDesynced(uint256 adapterAgentId) external view returns (bool) {
        if (!_exists(adapterAgentId)) return false;
        uint256 coreId = coreAgentIdOf[adapterAgentId];
        if (coreId == 0) return false;

        address coreOperator = coreRegistry.operatorOf(coreId);
        return ownerOf(adapterAgentId) != coreOperator;
    }

    function _setMetadataInternal(uint256 agentId, MetadataEntry[] calldata metadata) internal {
        for (uint256 i = 0; i < metadata.length; i++) {
            bytes32 key = metadata[i].key;
            if (!_metadataKeyExists[agentId][key]) {
                _metadataKeyExists[agentId][key] = true;
                _metadataKeys[agentId].push(key);
            }
            _metadataValues[agentId][key] = metadata[i].value;
            emit MetadataSet(agentId, key, metadata[i].value);
        }
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl, ERC721URIStorage)
        returns (bool)
    {
        return interfaceId == type(IERC8004IdentityRegistry).interfaceId || super.supportsInterface(interfaceId);
    }
}
