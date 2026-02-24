// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAresProtocol {
    function getScore(address agent) external view returns (uint256 ari);

    function getARIDetails(address agent)
        external
        view
        returns (uint256 ari, uint8 tier, uint32 actionsCount, uint64 firstActionAt, uint64 lastUpdate);

    function getTier(address agent) external view returns (uint8 tier);

    function getTierByScore(uint256 score) external pure returns (uint8 tier);

    function isRegistered(address agent) external view returns (bool);
}
