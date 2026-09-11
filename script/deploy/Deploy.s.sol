// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/token/ERC20/IERC20.sol";
import {EthYieldVault} from "../../src/EthYieldVault.sol";
import {BotStrategyRegistry} from "../../src/BotStrategyRegistry.sol";
import {BotYieldPass} from "../../src/BotYieldPass.sol";
import {BotRewardClaims} from "../../src/BotRewardClaims.sol";
import {RobinhoodDepositAdapter} from "../../src/RobinhoodDepositAdapter.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying Little John Bot contracts...");
        console.log("Deployer:", deployer);
        console.log("");

        // ============================================
        // DEPLOY ON ETHEREUM MAINNET (Chain ID: 1)
        // ============================================
        if (block.chainid == 1) {
            console.log("Deploying on Ethereum Mainnet...");
            console.log("");

            vm.startBroadcast(deployerPrivateKey);

            address usdg = 0xe343167631d89B6Ffc58B88d6b7fB0228795491D;

            EthYieldVault vault = new EthYieldVault(
                IERC20(usdg),
                "Little John Bot",
                "LJB"
            );

            vm.stopBroadcast();

            console.log("EthYieldVault deployed:", address(vault));
            console.log("");
            console.log("Address:", address(vault));
            return;
        }

        // ============================================
        // DEPLOY ON BOT CHAIN (Chain ID: 677)
        // ============================================
        if (block.chainid == 677) {
            console.log("Deploying on BOT Chain...");
            console.log("");

            vm.startBroadcast(deployerPrivateKey);

            BotStrategyRegistry registry = new BotStrategyRegistry();
            console.log("BotStrategyRegistry deployed:", address(registry));

            BotYieldPass passes = new BotYieldPass();
            console.log("BotYieldPass deployed:", address(passes));

            address treasury = deployer;
            uint256 feeBps = 100;
            address usdtBot = 0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C;

            BotRewardClaims rewards = new BotRewardClaims(
                feeBps,
                treasury,
                usdtBot
            );
            console.log("BotRewardClaims deployed:", address(rewards));

            vm.stopBroadcast();

            console.log("");
            console.log("=== CONTRACT ADDRESSES ===");
            console.log("BotStrategyRegistry:", address(registry));
            console.log("BotYieldPass:", address(passes));
            console.log("BotRewardClaims:", address(rewards));
            return;
        }

        // ============================================
        // DEPLOY ON ROBINHOOD CHAIN (Chain ID: 4663)
        // ============================================
        if (block.chainid == 4663) {
            console.log("Deploying on Robinhood Chain...");
            console.log("");

            vm.startBroadcast(deployerPrivateKey);

            address ljbToken = 0xF0C81b03A33463272a5466AfAeD628989A030F82;
            address stable = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;
            address router = 0x8876789976dEcBfCbBbe364623C63652db8C0904;
            uint256 maxSlippage = 500;

            RobinhoodDepositAdapter adapter = new RobinhoodDepositAdapter(
                ljbToken,
                stable,
                maxSlippage,
                router
            );

            vm.stopBroadcast();

            console.log("RobinhoodDepositAdapter deployed:", address(adapter));
            console.log("");
            console.log("Address:", address(adapter));
            return;
        }

        revert("Unsupported chain. Use chain ID 1 (Ethereum), 677 (BOT), or 4663 (Robinhood)");
    }
}