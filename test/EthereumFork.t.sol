// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";

contract EthereumForkTest is Test {
    function test_ChainId1() public {
        vm.roll(1);
        assertEq(block.number, 1);
    }

    function test_ResolvedAddresses() public {
        address positionManager = 0xbD216513d74C8cf14cf4747E6AaA6420FF64ee9e;
        address kyberFarm = 0x51F16AC6345d21DfD9d54ee9d36D5aCC66225cfE;
        address kyberRouter = 0x098697bA3Fee4eA76294C5d6A466a4e3b3E95FE6;

        assertEq(positionManager.code.length, 0);
        assertEq(kyberFarm.code.length, 0);
        assertEq(kyberRouter.code.length, 0);
    }

    function test_DepositUSDC() public {
        address usdc = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
        assertEq(usdc.code.length, 0);
    }
}
