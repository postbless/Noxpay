import { arbitrumSepolia } from "viem/chains";
import type { Abi, Address } from "viem";

export const CHAIN = arbitrumSepolia;

export const escrowAddress = (process.env.NEXT_PUBLIC_NOXPAY_ESCROW_ADDRESS ?? "") as Address;
export const tokenAddress = (process.env.NEXT_PUBLIC_NOXPAY_TOKEN_ADDRESS ?? "") as Address;

export const explorerTxUrl = (hash?: string) =>
  hash ? `${CHAIN.blockExplorers.default.url}/tx/${hash}` : undefined;

export const explorerAddressUrl = (address?: string) =>
  address ? `${CHAIN.blockExplorers.default.url}/address/${address}` : undefined;

export const hasContractAddresses =
  /^0x[a-fA-F0-9]{40}$/.test(escrowAddress) && /^0x[a-fA-F0-9]{40}$/.test(tokenAddress);

export const escrowAbi = [
  {
    type: "function",
    name: "createAndFundEscrow",
    stateMutability: "nonpayable",
    inputs: [
      { name: "contractor", type: "address" },
      { name: "jobTitle", type: "string" },
      { name: "metadataURI", type: "string" },
      { name: "encryptedAmount", type: "bytes32" },
      { name: "inputProof", type: "bytes" }
    ],
    outputs: [{ name: "escrowId", type: "uint256" }]
  },
  {
    type: "function",
    name: "releaseEscrow",
    stateMutability: "nonpayable",
    inputs: [{ name: "escrowId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "cancelEscrow",
    stateMutability: "nonpayable",
    inputs: [{ name: "escrowId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "claimEscrow",
    stateMutability: "view",
    inputs: [{ name: "escrowId", type: "uint256" }],
    outputs: [{ name: "receivedAmount", type: "bytes32" }]
  },
  {
    type: "function",
    name: "escrowCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "listEscrowIds",
    stateMutability: "view",
    inputs: [
      { name: "startInclusive", type: "uint256" },
      { name: "limit", type: "uint256" }
    ],
    outputs: [{ name: "ids", type: "uint256[]" }]
  },
  {
    type: "function",
    name: "getEscrow",
    stateMutability: "view",
    inputs: [{ name: "escrowId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "client", type: "address" },
          { name: "contractor", type: "address" },
          { name: "jobTitle", type: "string" },
          { name: "metadataURI", type: "string" },
          { name: "status", type: "uint8" },
          { name: "createdAt", type: "uint64" },
          { name: "fundedAt", type: "uint64" },
          { name: "releasedAt", type: "uint64" },
          { name: "cancelledAt", type: "uint64" },
          { name: "encryptedAmount", type: "bytes32" }
        ]
      }
    ]
  },
  {
    type: "event",
    name: "EscrowCreated",
    inputs: [
      { name: "escrowId", type: "uint256", indexed: true },
      { name: "client", type: "address", indexed: true },
      { name: "contractor", type: "address", indexed: true },
      { name: "jobTitle", type: "string", indexed: false },
      { name: "metadataURI", type: "string", indexed: false }
    ]
  }
] as const satisfies Abi;

export const tokenAbi = [
  {
    type: "function",
    name: "setOperator",
    stateMutability: "nonpayable",
    inputs: [
      { name: "operator", type: "address" },
      { name: "until", type: "uint48" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "isOperator",
    stateMutability: "view",
    inputs: [
      { name: "holder", type: "address" },
      { name: "spender", type: "address" }
    ],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    type: "function",
    name: "mintDemo",
    stateMutability: "nonpayable",
    inputs: [
      { name: "encryptedAmount", type: "bytes32" },
      { name: "inputProof", type: "bytes" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "confidentialBalanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "bytes32" }]
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }]
  }
] as const satisfies Abi;
