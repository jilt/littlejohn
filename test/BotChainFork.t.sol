// test/BotChainFork.t.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {BotRewardClaims} from "../src/BotRewardClaims.sol";
import {IERC20} from "@openzeppelin/token/ERC20/IERC20.sol";

contract BotChainForkTest is Test {
    BotRewardClaims claims;
    IERC20 usdtBot;

    function setUp() public {
        usdtBot = IERC20(0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C);
        claims = new BotRewardClaims(100, address(this), address(usdtBot));
        usdtBot.approve(address(claims), type(uint256).max);
    }

    function test_DepositOnFork() public {
        // On real fork, you'd already have USDT balance
        // Skip minting — just test the deposit call
        uint256 balance = usdtBot.balanceOf(address(this));
        if (balance == 0) return; // skip if no balance on fork
        
        usdtBot.transfer(address(this), 1000e6); // assume you have it
        claims.depositRewards(1000e6);
        assertEq(claims.totalRewards(), 1000e6);
    }

    function test_ClaimOnFork() public {
        uint256 balance = usdtBot.balanceOf(address(this));
        if (balance == 0) return;
        
        usdtBot.transfer(address(this), 1000e6);
        claims.depositRewards(1000e6);
        claims.claimRewards(address(this), 500e6, 1);
        assertEq(usdtBot.balanceOf(address(this)), 500e6 - 5e6);
    }
}