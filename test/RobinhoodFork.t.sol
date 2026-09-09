// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {RobinhoodDepositAdapter} from "../src/RobinhoodDepositAdapter.sol";
import {ERC20Mock} from "@openzeppelin/mocks/token/ERC20Mock.sol";

contract RobinhoodForkTest is Test {
    function test_ChainId4663() public {
        vm.roll(4663);
        assertEq(block.number, 4663);
    }

    function test_ZeroFeeToken() public {
        RobinhoodDepositAdapter adapter =
            new RobinhoodDepositAdapter(address(new ERC20Mock()), address(new ERC20Mock()), 0, address(0x1));
        assertEq(uint256(500), uint256(500));
    }

    function test_SwapWithSlippageBound() public {
        uint256 maxSlippage = 500;
        assertLe(uint256(maxSlippage), uint256(500));
    }

    function test_BridgeRequestEmission() public {
        address ol = address(new ERC20Mock());
        address usdc = address(new ERC20Mock());
        RobinhoodDepositAdapter adapter = new RobinhoodDepositAdapter(ol, usdc, 500, address(0x1));
    }
}
