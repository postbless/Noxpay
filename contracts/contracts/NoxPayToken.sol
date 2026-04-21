// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC7984} from "@iexec-nox/nox-confidential-contracts/contracts/token/ERC7984.sol";
import {
    Nox,
    euint256,
    externalEuint256
} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";

/**
 * @title NoxPayToken
 * @notice Minimal ERC-7984 confidential token for hackathon demos.
 * @dev In production, NoxPay should wrap or integrate an existing payment asset.
 */
contract NoxPayToken is ERC7984 {
    address public immutable faucetAdmin;

    event DemoMint(address indexed to, euint256 indexed amount);

    constructor()
        ERC7984(
            "NoxPay Confidential Demo Token",
            "cNOXUSD",
            "ipfs://noxpay-demo-confidential-token"
        )
    {
        faucetAdmin = msg.sender;
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mintDemo(externalEuint256 encryptedAmount, bytes calldata inputProof) external {
        euint256 amount = Nox.fromExternal(encryptedAmount, inputProof);
        euint256 minted = _mint(msg.sender, amount);
        Nox.allowThis(minted);
        Nox.allow(minted, msg.sender);
        Nox.addViewer(minted, msg.sender);
        emit DemoMint(msg.sender, minted);
    }

    function mintAdmin(address to, externalEuint256 encryptedAmount, bytes calldata inputProof) external {
        require(msg.sender == faucetAdmin, "NoxPayToken: only admin");
        euint256 amount = Nox.fromExternal(encryptedAmount, inputProof);
        euint256 minted = _mint(to, amount);
        Nox.allowThis(minted);
        Nox.allow(minted, to);
        Nox.addViewer(minted, to);
        emit DemoMint(to, minted);
    }
}
