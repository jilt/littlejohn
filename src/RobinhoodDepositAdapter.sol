// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable} from "@openzeppelin/access/Ownable.sol";
import {IERC20} from "@openzeppelin/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/token/ERC20/utils/SafeERC20.sol";

contract RobinhoodDepositAdapter is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable openLaunchToken;
    IERC20 public immutable stableToken;
    address public immutable router;

    struct BridgeRequest {
        uint256 amount;
        address recipient;
        uint256 timestamp;
        uint256 nonce;
    }

    uint256 public nonce;
    mapping(address => uint256) public withdrawableUSDG;

    event BridgeRequestEmitted(
        uint256 indexed requestId,
        uint256 amount,
        address indexed recipient,
        uint256 nonce,
        uint256 timestamp
    );
    event TokenSwapped(uint256 indexed amountIn, uint256 amountOut);
    event USDGCredited(address indexed recipient, uint256 amount);
    event USDGWithdrawn(address indexed recipient, uint256 amount);
    event RouterApprovalUpdated(address indexed token, address indexed router, uint256 amount);

    error ZeroAmount();
    error InsufficientBalance();
    error InsufficientCredit();
    error ZeroAddress();
    error SwapFailed();
    error InvalidSwapReturnData();
    error InvalidAmountOutMinimum();

    constructor(
        address _openLaunchToken,
        address _stableToken,
        address _router
    ) Ownable(msg.sender) {
        if (
            _openLaunchToken == address(0) ||
            _stableToken == address(0) ||
            _router == address(0)
        ) {
            revert ZeroAddress();
        }

        openLaunchToken = IERC20(_openLaunchToken);
        stableToken = IERC20(_stableToken);
        router = _router;
    }

    function depositAndBridge(
        uint256 amount,
        uint256 amountOutMin,
        address recipient
    ) external returns (uint256 requestId, uint256 amountOut) {
        if (amount == 0 || amountOutMin == 0) {
            revert ZeroAmount();
        }
        if (recipient == address(0)) revert ZeroAddress();

        if (openLaunchToken.balanceOf(msg.sender) < amount) {
            revert InsufficientBalance();
        }

        openLaunchToken.safeTransferFrom(msg.sender, address(this), amount);
        openLaunchToken.forceApprove(router, amount);

        amountOut = _swapToStable(amount, amountOutMin);
        if (amountOut == 0) revert ZeroAmount();
        if (amountOut < amountOutMin) revert InvalidAmountOutMinimum();

        withdrawableUSDG[recipient] += amountOut;

        requestId = nonce++;

        emit USDGCredited(recipient, amountOut);
        emit BridgeRequestEmitted(
            requestId,
            amountOut,
            recipient,
            nonce,
            block.timestamp
        );
        emit TokenSwapped(amount, amountOut);
    }

    function withdrawUSDG(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();

        uint256 credit = withdrawableUSDG[msg.sender];
        if (credit < amount) revert InsufficientCredit();
        if (stableToken.balanceOf(address(this)) < amount) {
            revert InsufficientBalance();
        }

        withdrawableUSDG[msg.sender] = credit - amount;
        stableToken.safeTransfer(msg.sender, amount);

        emit USDGWithdrawn(msg.sender, amount);
    }

    function approveRouter(uint256 amount) external onlyOwner {
        openLaunchToken.forceApprove(router, amount);
        emit RouterApprovalUpdated(address(openLaunchToken), router, amount);
    }

    function _swapToStable(
        uint256 amount,
        uint256 amountOutMin
    ) internal returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = address(openLaunchToken);
        path[1] = address(stableToken);

        (bool success, bytes memory data) = router.call(
            abi.encodeWithSignature(
                "swapExactTokensForTokens(uint256,uint256,address[],address,uint256)",
                amount,
                amountOutMin,
                path,
                address(this),
                block.timestamp
            )
        );

        if (!success) revert SwapFailed();
        if (data.length == 0) revert InvalidSwapReturnData();

        uint256[] memory amounts = abi.decode(data, (uint256[]));
        if (amounts.length == 0) revert InvalidSwapReturnData();

        return amounts[amounts.length - 1];
    }
}