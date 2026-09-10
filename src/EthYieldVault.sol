// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20, IERC20Metadata, ERC20} from "@openzeppelin/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/utils/Pausable.sol";

interface IPositionManager {
    function balanceOf(address owner) external view returns (uint256);
}

interface IERC721 {
    function approve(address to, uint256 tokenId) external;
}

interface IKyberFarm {
    function deposit(uint256 tokenId) external;
    function stake(uint256 tokenId) external;
    function harvest(uint256 tokenId) external;
    function withdraw(uint256 tokenId) external;
    function earned(uint256 tokenId) external view returns (uint256);
}

interface IERC4626 {
    function asset() external view returns (address);
    function totalAssets() external view returns (uint256);
}

contract EthYieldVault is ERC20, Ownable, ReentrancyGuard, Pausable {
    uint256 public constant MAX_SLIPPAGE_BPS = 500;

    struct Strategy {
        uint256 ethChainId;
        address vault;
        address pool;
        address farm;
        uint256 slippage;
        uint256 version;
        string description;
    }

    Strategy public strategy;
    address public operator;
    mapping(address router => bool) public whitelistedRouters;
    mapping(uint256 => uint256) public depositedPositions;

    event StrategySet(uint256 version, address pool, address farm, uint256 slippage, string description);
    event OperatorChanged(address indexed oldOperator, address indexed newOperator);
    event RouterWhitelisted(address indexed router, bool status);
    event ZapIn(address indexed router, uint256 amount, uint256 tokenId);
    event FarmDeposited(uint256 indexed tokenId);
    event FarmStaked(uint256 indexed tokenId);
    event FarmHarvested(uint256 indexed tokenId, uint256 rewards);

    error Unauthorized();
    error InvalidRouter();
    error StrategyNotSet();
    error ZeroAddress();
    error SlippageExceeded();

    constructor(IERC20 _underlyingAsset, string memory _name, string memory _symbol)
        ERC20(_name, _symbol)
        Ownable(msg.sender)
    {
        operator = msg.sender;
    }

    function setStrategy(
        uint256 _ethChainId,
        address _vault,
        address _pool,
        address _farm,
        uint256 _slippage,
        string calldata _description
    ) external onlyOwner {
        if (_pool == address(0) || _farm == address(0)) revert ZeroAddress();
        if (_slippage > MAX_SLIPPAGE_BPS) revert SlippageExceeded();

        strategy = Strategy({
            ethChainId: _ethChainId,
            vault: _vault,
            pool: _pool,
            farm: _farm,
            slippage: _slippage,
            version: strategy.version + 1,
            description: _description
        });

        emit StrategySet(_ethChainId, _pool, _farm, _slippage, _description);
    }

    function setOperator(address _operator) external onlyOwner {
        if (_operator == address(0)) revert ZeroAddress();
        emit OperatorChanged(operator, _operator);
        operator = _operator;
    }

    function whitelistRouter(address _router, bool _status) external onlyOwner {
        whitelistedRouters[_router] = _status;
        emit RouterWhitelisted(_router, _status);
    }

    function operatorZapIn(address router, bytes calldata calldata_, uint256 deadline)
        external
        nonReentrant
        whenNotPaused
    {
        if (msg.sender != operator) revert Unauthorized();
        if (!whitelistedRouters[router]) revert InvalidRouter();
        if (block.timestamp > deadline) revert SlippageExceeded();
        if (strategy.pool == address(0)) revert StrategyNotSet();

        (bool success,) = router.call(calldata_);
        require(success, "Zap call failed");

        uint256 tokenId = _lastPositionTokenId();
        emit ZapIn(router, totalAssets(), tokenId);
    }

    function stakeIntoFarm(uint256 tokenId) external nonReentrant {
        if (strategy.farm == address(0)) revert StrategyNotSet();

        IERC721(strategy.pool).approve(strategy.farm, tokenId);
        IKyberFarm(strategy.farm).deposit(tokenId);
        emit FarmDeposited(tokenId);

        IKyberFarm(strategy.farm).stake(tokenId);
        emit FarmStaked(tokenId);
    }

    function harvest(uint256 tokenId) external nonReentrant {
        if (strategy.farm == address(0)) revert StrategyNotSet();
        IKyberFarm(strategy.farm).harvest(tokenId);
        emit FarmHarvested(tokenId, IKyberFarm(strategy.farm).earned(tokenId));
    }

    function withdrawFromFarm(uint256 tokenId) external nonReentrant {
        if (strategy.farm == address(0)) revert StrategyNotSet();
        IKyberFarm(strategy.farm).withdraw(tokenId);
    }

    function _lastPositionTokenId() internal view returns (uint256) {
        if (strategy.pool == address(0)) return 0;
        return IPositionManager(strategy.pool).balanceOf(address(this));
    }

    function totalAssets() public view returns (uint256) {
        return balanceOf(address(this));
    }

    function deposit(uint256 assets, address receiver) external returns (uint256 shares) {
        return 0;
    }

    function mint(uint256 shares, address receiver) external returns (uint256 assets) {
        return 0;
    }

    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets) {
        return 0;
    }

    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares) {
        return 0;
    }
}
