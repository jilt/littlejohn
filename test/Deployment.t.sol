// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {BotStrategyRegistry} from "../src/BotStrategyRegistry.sol";
import {BotYieldPass} from "../src/BotYieldPass.sol";
import {BotRewardClaims} from "../src/BotRewardClaims.sol";
import {EthYieldVault} from "../src/EthYieldVault.sol";
import {RobinhoodDepositAdapter} from "../src/RobinhoodDepositAdapter.sol";
import {ERC20Mock} from "@openzeppelin/mocks/token/ERC20Mock.sol";
import {IERC20} from "@openzeppelin/token/ERC20/IERC20.sol";

contract DeploymentTest is Test {
    function test_DeployAllContracts() public {
        BotStrategyRegistry registry = new BotStrategyRegistry();
        BotYieldPass pass = new BotYieldPass();
        BotRewardClaims claims = new BotRewardClaims(100, address(0x1));
        ERC20Mock asset = new ERC20Mock();
        EthYieldVault vault = new EthYieldVault(IERC20(address(asset)), "vETH", "vETH");
        RobinhoodDepositAdapter adapter =
            new RobinhoodDepositAdapter(address(new ERC20Mock()), address(new ERC20Mock()), 500, address(0x1));

        assertEq(address(registry).balance, 0);
        assertEq(address(pass).balance, 0);
        assertEq(address(claims).balance, 0);
        assertEq(address(vault).balance, 0);
        assertEq(address(adapter).balance, 0);
    }
}
