// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {Ownable} from "@openzeppelin/access/Ownable.sol";

struct StrategyConfig {
    uint256 ethChainId;
    address ethVault;
    address pool;
    address farm;
    uint256 slippage;
    uint256 version;
    string description;
}

contract BotStrategyRegistry is Ownable {
    StrategyConfig public strategy;
    uint256 public constant MAX_SLIPPAGE_BPS = 500;

    event StrategyUpdated(
        uint256 indexed version,
        uint256 ethChainId,
        address indexed ethVault,
        address indexed pool,
        address farm,
        uint256 slippage,
        string description
    );

    error InvalidConfig();
    error NotOwner();

    constructor() Ownable(msg.sender) {}

    function setStrategy(
        uint256 _ethChainId,
        address _ethVault,
        address _pool,
        address _farm,
        uint256 _slippage,
        string calldata _description
    ) external onlyOwner {
        if (_ethVault == address(0) || _pool == address(0) || _farm == address(0)) {
            revert InvalidConfig();
        }
        if (_slippage > MAX_SLIPPAGE_BPS) {
            revert InvalidConfig();
        }

        uint256 newVersion = strategy.version + 1;
        strategy = StrategyConfig({
            ethChainId: _ethChainId,
            ethVault: _ethVault,
            pool: _pool,
            farm: _farm,
            slippage: _slippage,
            version: newVersion,
            description: _description
        });

        emit StrategyUpdated(newVersion, _ethChainId, _ethVault, _pool, _farm, _slippage, _description);
    }
}
