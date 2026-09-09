// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {BotStrategyRegistry} from "../src/BotStrategyRegistry.sol";

contract BotStrategyRegistryTest is Test {
    BotStrategyRegistry registry;
    address owner = address(this);
    address nonOwner = address(1);

    function setUp() public {
        registry = new BotStrategyRegistry();
    }

    function test_OwnerCanSetStrategy() public {
        vm.prank(owner);
        registry.setStrategy(1, address(0x123), address(0x456), address(0x789), 100, "test");
        (uint256 chainId,,,, uint256 slippage, uint256 version,) = registry.strategy();
        assertEq(chainId, 1);
        assertEq(slippage, 100);
        assertEq(version, 1);
    }

    function test_NonOwnerCannotSetStrategy() public {
        vm.prank(nonOwner);
        vm.expectRevert();
        registry.setStrategy(1, address(0x123), address(0x456), address(0x789), 100, "test");
    }

    function test_VersionIncrements() public {
        vm.prank(owner);
        registry.setStrategy(1, address(0x123), address(0x456), address(0x789), 100, "v1");
        (,,,,, uint256 version,) = registry.strategy();
        assertEq(version, 1);

        vm.prank(owner);
        registry.setStrategy(2, address(0x111), address(0x222), address(0x333), 200, "v2");
        (,,,,, uint256 version2,) = registry.strategy();
        assertEq(version2, 2);
    }

    function test_InvalidConfigZeroVaultReverts() public {
        vm.prank(owner);
        vm.expectRevert();
        registry.setStrategy(1, address(0), address(0x456), address(0x789), 100, "test");
    }

    function test_InvalidConfigZeroPoolReverts() public {
        vm.prank(owner);
        vm.expectRevert();
        registry.setStrategy(1, address(0x123), address(0), address(0x789), 100, "test");
    }

    function test_InvalidConfigZeroFarmReverts() public {
        vm.prank(owner);
        vm.expectRevert();
        registry.setStrategy(1, address(0x123), address(0x456), address(0), 100, "test");
    }

    function test_InvalidConfigExceedsMaxSlippageReverts() public {
        vm.prank(owner);
        vm.expectRevert();
        registry.setStrategy(1, address(0x123), address(0x456), address(0x789), 501, "test");
    }

    function test_StrategySetEventEmitted() public {
        vm.expectEmit(true, true, false, false);
        emit BotStrategyRegistry.StrategyUpdated(1, 1, address(0x123), address(0x456), address(0x789), 100, "test");
        vm.prank(owner);
        registry.setStrategy(1, address(0x123), address(0x456), address(0x789), 100, "test");
    }
}
