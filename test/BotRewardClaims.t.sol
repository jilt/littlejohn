// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {BotRewardClaims} from "../src/BotRewardClaims.sol";
import {IERC20} from "@openzeppelin/token/ERC20/IERC20.sol";

contract BotRewardClaimsTest is Test {
    BotRewardClaims claims;
    MockERC20 mockToken;

    function setUp() public {
        mockToken = new MockERC20();
        claims = new BotRewardClaims(100, address(this), address(mockToken));
        mockToken.approve(address(claims), type(uint256).max);
    }

    function test_Constructor() public view {
        assertEq(claims.feeBps(), 100);
        assertEq(claims.treasury(), address(this));
        assertEq(address(claims.rewardToken()), address(mockToken));
    }

    function test_DepositRewards() public {
        mockToken.mint(address(this), 1000e6);
        claims.depositRewards(1000e6);
        assertEq(claims.totalRewards(), 1000e6);
    }

    function test_ClaimRewards() public {
        mockToken.mint(address(this), 1000e6);
        claims.depositRewards(1000e6);

        claims.claimRewards(address(this), 500e6, 1);
        assertEq(claims.balances(address(this)), 495e6);
    }

    function test_FeeExceedsCap() public {
        vm.expectRevert(BotRewardClaims.FeeExceedsCap.selector);
        new BotRewardClaims(1001, address(this), address(mockToken));
    }

    function test_ZeroAddress() public {
        vm.expectRevert(BotRewardClaims.ZeroAddress.selector);
        new BotRewardClaims(100, address(0), address(mockToken));
    }
}

contract MockERC20 {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function decimals() external pure returns (uint8) {
        return 6;
    }
}