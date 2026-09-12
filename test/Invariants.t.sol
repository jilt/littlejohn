// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {BotRewardClaims} from "../src/BotRewardClaims.sol";
import {IERC20} from "@openzeppelin/token/ERC20/IERC20.sol";

contract InvariantsTest is Test {
    BotRewardClaims claims;
    MockERC20 mockToken;
    address treasury;

    function setUp() public {
        treasury = address(0x123);
        mockToken = new MockERC20();
        claims = new BotRewardClaims(100, treasury, address(mockToken));
        mockToken.approve(address(claims), type(uint256).max);
    }

    function test_TotalRewardsInvariant() public {
        mockToken.mint(address(this), 1000e6);
        claims.depositRewards(1000e6);

        claims.claimRewards(address(this), 500e6, 1);
        
        assertEq(claims.totalRewards(), 500e6);
        assertEq(claims.balances(address(this)), 495e6);
    }

    function test_FeeInvariant() public {
        mockToken.mint(address(this), 1000e6);
        claims.depositRewards(1000e6);

        claims.claimRewards(address(this), 100e6, 1);
        
        assertEq(mockToken.balanceOf(treasury), 1e6);
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