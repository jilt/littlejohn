// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {RobinhoodDepositAdapter} from "../../src/RobinhoodDepositAdapter.sol";

// ============================================================
// DEPLOY: RobinhoodDepositAdapter on Robinhood Chain (ID: 4663)
// ============================================================
// Usage:
//   forge script script/deploy/DeployRobinhoodAdapter.s.sol:DeployRobinhoodAdapter \
//     --rpc-url https://rpc.mainnet.chain.robinhood.com \
//     --chain-id 4663 \
//     --broadcast --verify
//
// The private key is read from PRIVATE_KEY in .env and may be
// provided with or without the 0x prefix.
//
// Examples:
//   PRIVATE_KEY=abc123...
//   PRIVATE_KEY=0xabc123...
//
// After deployment, update CONTRACTS.robinhood.adapter in:
//   vite/src/config/contracts.ts
// ============================================================

contract DeployRobinhoodAdapter is Script {
    uint256 internal constant ROBINHOOD_CHAIN_ID = 4663;

    address internal constant LJB_TOKEN =
        0xF0C81b03A33463272a5466AfAeD628989A030F82;
    address internal constant USDG_TOKEN =
        0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;
    address internal constant ROUTER =
        0x8876789976dEcBfCbBbe364623C63652db8C0904;

    function run() external returns (RobinhoodDepositAdapter adapter) {
        string memory privateKeyString = vm.envString("PRIVATE_KEY");
        uint256 deployerPrivateKey = hexToUint256(privateKeyString);
        address deployer = vm.addr(deployerPrivateKey);

        if (block.chainid != ROBINHOOD_CHAIN_ID) {
            revert("Must deploy on Robinhood Chain (chain ID 4663)");
        }

        console.log("============================================");
        console.log("Deploying RobinhoodDepositAdapter");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("LJB Token:", LJB_TOKEN);
        console.log("USDG Token:", USDG_TOKEN);
        console.log("Router:", ROUTER);
        console.log("============================================");

        vm.startBroadcast(deployerPrivateKey);

        adapter = new RobinhoodDepositAdapter(
            LJB_TOKEN,
            USDG_TOKEN,
            ROUTER
        );

        vm.stopBroadcast();

        console.log("RobinhoodDepositAdapter deployed:", address(adapter));
        console.log("Owner:", adapter.owner());
        console.log("LJB Token:", address(adapter.openLaunchToken()));
        console.log("USDG Token:", address(adapter.stableToken()));
        console.log("Router:", adapter.router());
        console.log("============================================");
    }

    function hexToUint256(
        string memory value
    ) internal pure returns (uint256 result) {
        bytes memory input = bytes(value);
        uint256 start = 0;

        if (
            input.length >= 2 &&
            input[0] == bytes1("0") &&
            (input[1] == bytes1("x") || input[1] == bytes1("X"))
        ) {
            start = 2;
        }

        if (input.length - start != 64) {
            revert("Private key must contain exactly 64 hex characters");
        }

        for (uint256 i = start; i < input.length; i++) {
            result = result * 16 + hexCharToNibble(input[i]);
        }

        if (result == 0) {
            revert("Private key cannot be zero");
        }
    }

    function hexCharToNibble(
        bytes1 character
    ) internal pure returns (uint256) {
        uint8 value = uint8(character);

        if (value >= uint8(bytes1("0")) && value <= uint8(bytes1("9"))) {
            return value - uint8(bytes1("0"));
        }

        if (value >= uint8(bytes1("a")) && value <= uint8(bytes1("f"))) {
            return value - uint8(bytes1("a")) + 10;
        }

        if (value >= uint8(bytes1("A")) && value <= uint8(bytes1("F"))) {
            return value - uint8(bytes1("A")) + 10;
        }

        revert("Private key contains invalid hex");
    }
}