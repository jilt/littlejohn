// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {BotRewardClaims} from "../src/BotRewardClaims.sol";
import {IERC20} from "@openzeppelin/token/ERC20/IERC20.sol";

contract DeploymentTest is Test {
    function test_DeployBotRewardClaims() public {
        IERC20 mockToken = IERC20(address(new MockERC20()));
        BotRewardClaims claims = new BotRewardClaims(100, address(0x1), address(mockToken));
        
        assertEq(claims.feeBps(), 100);
        assertEq(claims.treasury(), address(0x1));
        assertEq(address(claims.rewardToken()), address(mockToken));
    }
}

contract MockERC20 {
    mapping(address => uint256) public balanceOf;
    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }
    function decimals() external pure returns (uint8) { return 6; }
}