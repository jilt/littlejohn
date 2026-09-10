// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC1155} from "@openzeppelin/token/ERC1155/ERC1155.sol";
import {AccessControl} from "@openzeppelin/access/AccessControl.sol";

contract BotYieldPass is ERC1155, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 public constant ID_DEPOSITOR = 1;
    uint256 public constant ID_LOCKED_30D = 2;
    uint256 public constant ID_LOCKED_90D = 3;

    error TransfersNotSupported();
    error NotMinter();

    constructor() ERC1155("https://botyieldpass.example.com/{id}") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    function mint(address to, uint256 id, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, id, amount, "");
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _update(address from, address to, uint256[] memory ids, uint256[] memory values) internal override {
        if (from != address(0) && to != address(0)) {
            revert TransfersNotSupported();
        }
        super._update(from, to, ids, values);
    }
}
