// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {BotStrategyRegistry} from "../src/BotStrategyRegistry.sol";
import {BotYieldPass} from "../src/BotYieldPass.sol";
import {BotRewardClaims} from "../src/BotRewardClaims.sol";
import {EthYieldVault} from "../src/EthYieldVault.sol";
import {ERC20Mock} from "@openzeppelin/mocks/token/ERC20Mock.sol";
import {IERC20} from "@openzeppelin/token/ERC20/IERC20.sol";

contract InvariantsTest is Test {
    BotStrategyRegistry registry;
    BotYieldPass pass;
    BotRewardClaims claims;
    EthYieldVault vault;
    ERC20Mock asset;
    address owner = address(this);
    address relayer = address(this);
    address treasury = address(1);
    address user = address(2);

    function setUp() public {
        registry = new BotStrategyRegistry();
        pass = new BotYieldPass();
        claims = new BotRewardClaims(100, treasury);
        asset = new ERC20Mock();
        vault = new EthYieldVault(IERC20(address(asset)), "vETH", "vETH");
    }

    function test_ClaimIdsSingleUse() public {
        vm.prank(relayer);
        claims.depositRewards{value: 1 ether}();
        vm.prank(relayer);
        claims.claimRewards(user, 1 ether, 1);
        vm.prank(relayer);
        vm.expectRevert();
        claims.claimRewards(user, 1 ether, 1);
    }

    function test_FeeNeverExceedsCap() public {
        vm.prank(relayer);
        claims.depositRewards{value: 1 ether}();
        vm.prank(relayer);
        claims.claimRewards(user, 1 ether, 1);
        assertLe(claims.totalRewards() + claims.balances(user) + (treasury.balance), 1 ether);
    }

    function test_StrategyVersionMonotonic() public {
        vm.prank(owner);
        registry.setStrategy(1, address(vault), address(0x100), address(0x200), 100, "test");
        (,,,,, uint256 v1,) = registry.strategy();
        vm.prank(owner);
        registry.setStrategy(2, address(vault), address(0x100), address(0x200), 100, "v2");
        (,,,,, uint256 v2,) = registry.strategy();
        assertGt(v2, v1);
    }

    function test_PassesNonTransferable() public {
        vm.prank(owner);
        pass.mint(user, 1, 100);
        vm.prank(user);
        vm.expectRevert();
        pass.safeTransferFrom(user, address(3), 1, 10, "");
    }

    function test_NoFeeOutsideClaims() public {
        vm.prank(owner);
        registry.setStrategy(1, address(vault), address(0x100), address(0x200), 0, "test");
        (,,,, uint256 slippage,,) = registry.strategy();
        assertEq(slippage, 0);
    }
}
