// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC7984} from "@iexec-nox/nox-confidential-contracts/contracts/interfaces/IERC7984.sol";
import {
    Nox,
    euint256,
    externalEuint256
} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";

contract NoxPayEscrow {
    enum Status {
        Created,
        Funded,
        Released,
        Cancelled
    }

    struct Escrow {
        uint256 id;
        address client;
        address contractor;
        string jobTitle;
        string metadataURI;
        Status status;
        uint64 createdAt;
        uint64 fundedAt;
        uint64 releasedAt;
        uint64 cancelledAt;
        euint256 encryptedAmount;
    }

    IERC7984 public immutable confidentialToken;
    uint256 public escrowCount;

    mapping(uint256 escrowId => Escrow escrow) private _escrows;
    mapping(address client => uint256[] escrowIds) private _escrowsByClient;
    mapping(address contractor => uint256[] escrowIds) private _escrowsByContractor;

    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed client,
        address indexed contractor,
        string jobTitle,
        string metadataURI
    );
    event EscrowFunded(uint256 indexed escrowId, euint256 indexed encryptedAmount);
    event EscrowReleased(uint256 indexed escrowId, address indexed contractor, euint256 indexed encryptedAmount);
    event EscrowCancelled(uint256 indexed escrowId, address indexed client, euint256 indexed encryptedAmount);

    error InvalidAddress();
    error InvalidEscrow();
    error InvalidStatus(Status current);
    error OnlyClient();
    error OnlyContractor();

    constructor(IERC7984 token) {
        if (address(token) == address(0)) revert InvalidAddress();
        confidentialToken = token;
    }

    function createEscrow(
        address contractor,
        string calldata jobTitle,
        string calldata metadataURI
    ) public returns (uint256 escrowId) {
        if (contractor == address(0) || contractor == msg.sender) revert InvalidAddress();

        escrowId = ++escrowCount;
        Escrow storage escrow = _escrows[escrowId];
        escrow.id = escrowId;
        escrow.client = msg.sender;
        escrow.contractor = contractor;
        escrow.jobTitle = jobTitle;
        escrow.metadataURI = metadataURI;
        escrow.status = Status.Created;
        escrow.createdAt = uint64(block.timestamp);

        _escrowsByClient[msg.sender].push(escrowId);
        _escrowsByContractor[contractor].push(escrowId);

        emit EscrowCreated(escrowId, msg.sender, contractor, jobTitle, metadataURI);
    }

    function createAndFundEscrow(
        address contractor,
        string calldata jobTitle,
        string calldata metadataURI,
        externalEuint256 encryptedAmount,
        bytes calldata inputProof
    ) external returns (uint256 escrowId) {
        escrowId = createEscrow(contractor, jobTitle, metadataURI);
        _fundEscrow(escrowId, encryptedAmount, inputProof);
    }

    function fundEscrow(
        uint256 escrowId,
        externalEuint256 encryptedAmount,
        bytes calldata inputProof
    ) external {
        Escrow storage escrow = _requireEscrow(escrowId);
        if (msg.sender != escrow.client) revert OnlyClient();
        _fundEscrow(escrowId, encryptedAmount, inputProof);
    }

    function releaseEscrow(uint256 escrowId) external {
        Escrow storage escrow = _requireEscrow(escrowId);
        if (msg.sender != escrow.client) revert OnlyClient();
        if (escrow.status != Status.Funded) revert InvalidStatus(escrow.status);

        euint256 releasedAmount = confidentialToken.confidentialTransfer(
            escrow.contractor,
            escrow.encryptedAmount
        );
        Nox.allowThis(releasedAmount);
        Nox.allow(releasedAmount, escrow.contractor);
        Nox.addViewer(releasedAmount, escrow.contractor);

        escrow.encryptedAmount = releasedAmount;
        escrow.status = Status.Released;
        escrow.releasedAt = uint64(block.timestamp);

        emit EscrowReleased(escrowId, escrow.contractor, releasedAmount);
    }

    function cancelEscrow(uint256 escrowId) external {
        Escrow storage escrow = _requireEscrow(escrowId);
        if (msg.sender != escrow.client) revert OnlyClient();
        if (escrow.status == Status.Released || escrow.status == Status.Cancelled) {
            revert InvalidStatus(escrow.status);
        }

        euint256 refundAmount = escrow.encryptedAmount;
        if (escrow.status == Status.Funded) {
            refundAmount = confidentialToken.confidentialTransfer(escrow.client, escrow.encryptedAmount);
            Nox.allowThis(refundAmount);
            Nox.allow(refundAmount, escrow.client);
            Nox.addViewer(refundAmount, escrow.client);
        }

        escrow.encryptedAmount = refundAmount;
        escrow.status = Status.Cancelled;
        escrow.cancelledAt = uint64(block.timestamp);

        emit EscrowCancelled(escrowId, escrow.client, refundAmount);
    }

    function claimEscrow(uint256 escrowId) external view returns (euint256 receivedAmount) {
        Escrow storage escrow = _requireEscrow(escrowId);
        if (msg.sender != escrow.contractor) revert OnlyContractor();
        if (escrow.status != Status.Released) revert InvalidStatus(escrow.status);
        return escrow.encryptedAmount;
    }

    function getEscrow(uint256 escrowId) external view returns (Escrow memory) {
        return _requireEscrow(escrowId);
    }

    function listEscrowsByClient(address client) external view returns (uint256[] memory) {
        return _escrowsByClient[client];
    }

    function listEscrowsByContractor(address contractor) external view returns (uint256[] memory) {
        return _escrowsByContractor[contractor];
    }

    function listEscrowIds(uint256 startInclusive, uint256 limit) external view returns (uint256[] memory ids) {
        if (startInclusive == 0) startInclusive = 1;
        if (startInclusive > escrowCount || limit == 0) return new uint256[](0);

        uint256 endExclusive = startInclusive + limit;
        if (endExclusive > escrowCount + 1) endExclusive = escrowCount + 1;

        ids = new uint256[](endExclusive - startInclusive);
        for (uint256 i = startInclusive; i < endExclusive; i++) {
            ids[i - startInclusive] = i;
        }
    }

    function _fundEscrow(
        uint256 escrowId,
        externalEuint256 encryptedAmount,
        bytes calldata inputProof
    ) private {
        Escrow storage escrow = _requireEscrow(escrowId);
        if (escrow.status != Status.Created) revert InvalidStatus(escrow.status);

        euint256 transferredAmount = confidentialToken.confidentialTransferFrom(
            escrow.client,
            address(this),
            encryptedAmount,
            inputProof
        );

        Nox.allowThis(transferredAmount);
        Nox.allow(transferredAmount, address(this));
        Nox.addViewer(transferredAmount, escrow.client);
        Nox.addViewer(transferredAmount, escrow.contractor);

        escrow.encryptedAmount = transferredAmount;
        escrow.status = Status.Funded;
        escrow.fundedAt = uint64(block.timestamp);

        emit EscrowFunded(escrowId, transferredAmount);
    }

    function _requireEscrow(uint256 escrowId) private view returns (Escrow storage escrow) {
        escrow = _escrows[escrowId];
        if (escrow.id == 0) revert InvalidEscrow();
    }
}
