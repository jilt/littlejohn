// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {RobinhoodDepositAdapter} from "../../src/RobinhoodDepositAdapter.sol";

// ============================================================
// DEPLOY: RobinhoodDepositAdapter on Robinhood Chain (ID: 4663)
// ============================================================
// Usage:
//   forge script script/deploy/DeployRobinhoodAdapter.s.sol \
//     --rpc-url https://rpc.mainnet.chain.robinhood.com \
//     --private-key <YOUR_PRIVATE_KEY> \
//     --chain-id 4663 \
//     --broadcast --verify
//
// Prerequisites:
//   - PRIVATE_KEY env var must be set (or pass --private-key)
//   - Wallet must have ETH on Robinhood Chain for gas
//   - Ensure you're connected to Robinhood Chain RPC
//
// Constructor Args:
//   _openLaunchToken: 0xF0C81b03A33463272a5466AfAeD628989A030F82 (LJB)
//   _stableToken:     0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168 (USDG)
//   _maxSlippageBps:  500
//   _router:          0x8876789976dEcBfCbBbe364623C63652db8C0904
//
// After deployment, copy the printed adapter address into
// ROBINHOOD_ADAPTER_ADDRESS in vite/src/config/contracts.ts
// ============================================================

contract DeployRobinhoodAdapter is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("============================================");
        console.log("Deploying RobinhoodDepositAdapter");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("============================================");
        console.log("");

        // Verify we're on Robinhood Chain
        if (block.chainid != 4663) {
            revert("Must deploy on Robinhood Chain (chain ID 4663)");
        }

        address ljbToken    = 0xF0C81b03A33463272a5466AfAeD628989A030F82;
        address stableToken = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;
        uint256 maxSlippage = 500;
        address router      = 0x8876789976dEcBfCbBbe364623C63652db8C0904;

        console.log("Parameters:");
        console.log("  LJB Token:", ljbToken);
        console.log("  Stable Token:", stableToken);
        console.log("  Max Slippage:", maxSlippage, "bps");
        console.log("  Router:", router);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        RobinhoodDepositAdapter adapter = new RobinhoodDepositAdapter(
            ljbToken,
            stableToken,
            maxSlippage,
            router
        );

        vm.stopBroadcast();

        console.log("");
        console.log("============================================");
        console.log("RobinhoodDepositAdapter deployed:", address(adapter));
        console.log("============================================");
    }
}
