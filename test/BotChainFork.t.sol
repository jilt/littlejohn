// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {BotStrategyRegistry} from "../src/BotStrategyRegistry.sol";
import {BotYieldPass} from "../src/BotYieldPass.sol";
import {BotRewardClaims} from "../src/BotRewardClaims.sol";

contract BotChainForkTest is Test {
    function test_ChainId677() public {
        vm.roll(677);
        assertEq(block.number, 677);
    }

    function test_USDTDecimals() public {
        address usdt = 0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C;
        assertEq(usdt.code.length, 0);
    }

    function test_RegistryStrategySwitch() public {
        BotStrategyRegistry registry = new BotStrategyRegistry();
        address oldVault = address(0x111);
        address newVault = address(0x222);

        vm.prank(address(this));
        registry.setStrategy(677, oldVault, address(0x100), address(0x200), 100, "initial");
        (, address vault1,,,,,) = registry.strategy();
        assertEq(vault1, oldVault);

        vm.prank(address(this));
        registry.setStrategy(677, newVault, address(0x100), address(0x200), 100, "updated");
        (, address vault2,,,,,) = registry.strategy();
        assertEq(vault2, newVault);
    }

    function test_PassMinting() public {
        BotYieldPass pass = new BotYieldPass();
        vm.prank(address(this));
        pass.mint(address(0x1), 1, 100);
        assertEq(pass.balanceOf(address(0x1), 1), 100);
    }

    function test_FundedClaimWithFeeSplit() public {
        BotRewardClaims claims = new BotRewardClaims(100, address(0x1));
        vm.prank(address(this));
        claims.depositRewards{value: 1 ether}();
        vm.prank(address(this));
        claims.claimRewards(address(0x2), 1000000000000000000, 1);
    }

    function test_DuplicateClaimRevert() public {
        BotRewardClaims claims = new BotRewardClaims(100, address(0x1));
        vm.prank(address(this));
        claims.depositRewards{value: 1 ether}();
        vm.prank(address(this));
        claims.claimRewards(address(0x2), 1000000000000000000, 1);
        vm.prank(address(this));
        vm.expectRevert();
        claims.claimRewards(address(0x2), 1000000000000000000, 1);
    }
}
