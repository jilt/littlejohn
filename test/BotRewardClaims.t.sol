// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {BotRewardClaims} from "../src/BotRewardClaims.sol";

contract BotRewardClaimsTest is Test {
    BotRewardClaims claims;
    address owner = address(this);
    address relayer = address(this);
    address treasury = address(1);
    address user = address(2);
    address nonRelayer = address(3);

    function setUp() public {
        claims = new BotRewardClaims(100, treasury);
    }

    function test_DepositRewards() public {
        vm.prank(owner);
        claims.depositRewards{value: 1 ether}();
        assertEq(claims.totalRewards(), 1 ether);
    }

    function test_RelayerCanClaim() public {
        vm.prank(owner);
        claims.depositRewards{value: 1 ether}();
        vm.prank(owner);
        claims.claimRewards(user, 1 ether, 1);
        assertEq(claims.balances(user), 990000000000000000);
    }

    function test_FeeMath() public {
        vm.prank(owner);
        claims.depositRewards{value: 1 ether}();
        vm.prank(owner);
        claims.claimRewards(user, 1000000000000000000, 1);
        assertEq(claims.balances(user), 990000000000000000);
    }

    function test_DuplicateClaimIdReverts() public {
        vm.prank(owner);
        claims.depositRewards{value: 1 ether}();
        vm.prank(owner);
        claims.claimRewards(user, 1000000000000000000, 1);
        vm.prank(owner);
        vm.expectRevert();
        claims.claimRewards(user, 1000000000000000000, 1);
    }

    function test_InsufficientFundingReverts() public {
        vm.prank(owner);
        claims.depositRewards{value: 1 ether}();
        vm.prank(owner);
        vm.expectRevert();
        claims.claimRewards(user, 2 ether, 1);
    }

    function test_NonRelayerCannotClaim() public {
        vm.prank(owner);
        claims.depositRewards{value: 1 ether}();
        vm.prank(nonRelayer);
        vm.expectRevert();
        claims.claimRewards(user, 1000000000000000000, 1);
    }

    function test_PauseBlocksClaims() public {
        vm.prank(owner);
        claims.depositRewards{value: 1 ether}();
        vm.prank(owner);
        claims.pause();
        vm.prank(owner);
        vm.expectRevert();
        claims.claimRewards(user, 1000000000000000000, 1);
    }

    function test_UnpauseAllowsClaims() public {
        vm.prank(owner);
        claims.depositRewards{value: 1 ether}();
        vm.prank(owner);
        claims.pause();
        vm.prank(owner);
        claims.unpause();
        vm.prank(owner);
        claims.claimRewards(user, 1000000000000000000, 1);
    }

    function test_MaxFeeCap() public {
        vm.prank(owner);
        vm.expectRevert();
        claims.setFeeBps(1001);
    }

    function test_TreasuryReceivesFee() public {
        uint256 before = treasury.balance;
        vm.prank(owner);
        claims.depositRewards{value: 1 ether}();
        vm.prank(owner);
        claims.claimRewards(user, 1000000000000000000, 1);
        assertEq(treasury.balance, before + 10000000000000000);
    }

    function test_FeeNeverExceedsCap() public {
        vm.prank(owner);
        claims.depositRewards{value: 1 ether}();
        vm.prank(owner);
        claims.claimRewards(user, 1000000000000000000, 1);
        uint256 fee = 10000000000000000;
        assertLt(fee, 1000000000000000000);
    }
}
