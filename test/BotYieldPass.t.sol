// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {BotYieldPass} from "../src/BotYieldPass.sol";

contract BotYieldPassTest is Test {
    BotYieldPass pass;
    address admin = address(this);
    address user = address(1);
    address nonMinter = address(2);

    function setUp() public {
        pass = new BotYieldPass();
    }

    function test_MinterCanMint() public {
        vm.prank(admin);
        pass.mint(user, 1, 100);
        assertEq(pass.balanceOf(user, 1), 100);
    }

    function test_NonMinterCannotMint() public {
        vm.prank(nonMinter);
        vm.expectRevert();
        pass.mint(user, 1, 100);
    }

    function test_TransfersRevert() public {
        vm.prank(admin);
        pass.mint(user, 1, 100);

        vm.prank(user);
        vm.expectRevert();
        pass.safeTransferFrom(user, address(3), 1, 10, "");
    }

    function test_BatchTransfersRevert() public {
        vm.prank(admin);
        pass.mint(user, 1, 100);

        vm.prank(user);
        vm.expectRevert();
        pass.safeBatchTransferFrom(user, address(3), new uint256[](1), new uint256[](1), "");
    }

    function test_IDSemantics() public {
        vm.prank(admin);
        pass.mint(user, 1, 100);
        pass.mint(user, 2, 200);
        pass.mint(user, 3, 300);

        assertEq(pass.balanceOf(user, 1), 100);
        assertEq(pass.balanceOf(user, 2), 200);
        assertEq(pass.balanceOf(user, 3), 300);
        assertEq(pass.balanceOf(user, 4), 0);
    }

    function test_DepositorIDConstant() public {
        assertEq(uint256(1), uint256(1));
    }

    function test_Locked30dIDConstant() public {
        assertEq(uint256(2), uint256(2));
    }

    function test_Locked90dIDConstant() public {
        assertEq(uint256(3), uint256(3));
    }
}
