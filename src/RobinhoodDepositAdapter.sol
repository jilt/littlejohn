// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {Ownable} from "@openzeppelin/access/Ownable.sol";
import {IERC20} from "@openzeppelin/token/ERC20/IERC20.sol";

contract RobinhoodDepositAdapter is Ownable {
    IERC20 public openLaunchToken;
    IERC20 public stableToken;
    uint256 public constant ZERO_FEE_BPS = 0;
    uint256 public maxSlippageBps;
    address public router;

    struct BridgeRequest {
        uint256 amount;
        address recipient;
        uint256 timestamp;
        uint256 nonce;
    }

    uint256 public nonce;

    event BridgeRequestEmitted(
        uint256 indexed requestId, uint256 amount, address indexed recipient, uint256 nonce, uint256 timestamp
    );
    event TokenSwapped(uint256 indexed amount, uint256 amountOut);
    event RouterUpdated(address indexed oldRouter, address indexed newRouter);
    event StableTokenUpdated(address indexed oldStable, address indexed newStable);

    error ZeroAmount();
    error NotOwner();
    error InsufficientBalance();
    error SlippageExceeded();
    error ZeroAddress();

    constructor(address _openLaunchToken, address _stableToken, uint256 _maxSlippageBps, address _router)
        Ownable(msg.sender)
    {
        if (_openLaunchToken == address(0) || _stableToken == address(0) || _router == address(0)) {
            revert ZeroAddress();
        }
        openLaunchToken = IERC20(_openLaunchToken);
        stableToken = IERC20(_stableToken);
        maxSlippageBps = _maxSlippageBps;
        router = _router;
    }

    function depositAndBridge(uint256 amount, address recipient) external returns (uint256 requestId) {
        if (amount == 0) revert ZeroAmount();
        if (recipient == address(0)) revert ZeroAddress();

        uint256 balance = openLaunchToken.balanceOf(msg.sender);
        if (balance < amount) revert InsufficientBalance();

        openLaunchToken.transferFrom(msg.sender, address(this), amount);
        uint256 amountOut = _swapToStable(amount);
        if (amountOut == 0) revert ZeroAmount();

        if (amountOut * 10000 < amount * (10000 - maxSlippageBps)) revert SlippageExceeded();

        requestId = nonce++;
        emit BridgeRequestEmitted(requestId, amountOut, recipient, nonce, block.timestamp);
        emit TokenSwapped(amount, amountOut);
    }

    function _swapToStable(uint256 amount) internal returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = address(openLaunchToken);
        path[1] = address(stableToken);

        (bool success, bytes memory data) = router.call{value: 0}(
            abi.encodeWithSignature(
                "swapExactTokensForTokens(uint256,uint256,address[],address,uint256)",
                amount,
                0,
                path,
                address(this),
                block.timestamp
            )
        );
        require(success, "Swap failed");

        uint256[] memory amounts = abi.decode(data, (uint256[]));
        return amounts[amounts.length - 1];
    }

    function setRouter(address _router) external onlyOwner {
        if (_router == address(0)) revert ZeroAddress();
        emit RouterUpdated(router, _router);
        router = _router;
    }

    function setStableToken(address _stable) external onlyOwner {
        if (_stable == address(0)) revert ZeroAddress();
        emit StableTokenUpdated(address(stableToken), _stable);
        stableToken = IERC20(_stable);
    }

    function setMaxSlippage(uint256 _maxSlippageBps) external onlyOwner {
        maxSlippageBps = _maxSlippageBps;
    }
}
