// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable} from "@openzeppelin/access/Ownable.sol";
import {Pausable} from "@openzeppelin/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/utils/ReentrancyGuard.sol";

contract BotRewardClaims is Ownable, Pausable, ReentrancyGuard {
    uint256 public constant MAX_FEE_BPS = 1000;
    uint256 public feeBps;
    address public treasury;

    struct Claim {
        uint256 amount;
        uint256 claimedAt;
        bool exists;
    }

    mapping(uint256 claimId => Claim) public claims;
    mapping(address user => uint256 balance) public balances;
    uint256 public totalRewards;

    error ClaimDoesNotExist();
    error DuplicateClaim();
    error InsufficientFunding();
    error NotRelayer();
    error FeeExceedsCap();
    error ZeroAmount();

    event RewardsClaimed(
        uint256 indexed claimId,
        address indexed user,
        uint256 grossAmount,
        uint256 feeAmount,
        uint256 netAmount,
        uint256 timestamp
    );
    event RewardsDeposited(address indexed depositor, uint256 amount);
    event TreasuryChanged(address indexed oldTreasury, address indexed newTreasury);

    constructor(uint256 _feeBps, address _treasury) Ownable(msg.sender) {
        if (_feeBps > MAX_FEE_BPS) revert FeeExceedsCap();
        if (_treasury == address(0)) revert ZeroAmount();
        feeBps = _feeBps;
        treasury = _treasury;
    }

    function depositRewards() external payable {
        if (msg.value == 0) revert ZeroAmount();
        totalRewards += msg.value;
        emit RewardsDeposited(msg.sender, msg.value);
    }

    function claimRewards(address user, uint256 grossAmount, uint256 claimId)
        external
        nonReentrant
        whenNotPaused
        onlyRelayer
    {
        if (grossAmount == 0) revert ZeroAmount();
        if (claims[claimId].exists) revert DuplicateClaim();
        if (totalRewards < grossAmount) revert InsufficientFunding();

        uint256 feeAmount = (grossAmount * feeBps) / 10000;
        uint256 netAmount = grossAmount - feeAmount;

        claims[claimId] = Claim({amount: grossAmount, claimedAt: block.timestamp, exists: true});
        balances[user] += netAmount;
        totalRewards -= grossAmount;

        (bool success,) = treasury.call{value: feeAmount}("");
        require(success, "Treasury transfer failed");

        emit RewardsClaimed(claimId, user, grossAmount, feeAmount, netAmount, block.timestamp);
    }

    function setFeeBps(uint256 _feeBps) external onlyOwner {
        if (_feeBps > MAX_FEE_BPS) revert FeeExceedsCap();
        feeBps = _feeBps;
    }

    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert ZeroAmount();
        emit TreasuryChanged(treasury, _treasury);
        treasury = _treasury;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    modifier onlyRelayer() {
        if (msg.sender != owner()) revert NotRelayer();
        _;
    }
}
