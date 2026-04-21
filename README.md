# NoxPay

NoxPay is a private escrow payment dApp for Web3 freelancers. A client creates and funds an escrow for a contractor, the dashboard shows the public job metadata and status, and the payment amount stays confidential on-chain as an iExec Nox handle.

This is a hackathon MVP for the iExec Vibe Coding Challenge. It favors a reliable 4-minute demo path over a broad production feature set.

## Why Confidential Escrow Matters

Freelance payments reveal sensitive commercial information: rates, project budgets, client spend, and contractor income. Traditional on-chain escrow exposes all of that. NoxPay keeps the escrow lifecycle public and auditable while storing the payment amount as an encrypted iExec Nox Confidential Token value.

## How iExec Nox Is Used

- `NoxPayToken` extends iExec Nox `ERC7984`, the confidential fungible token implementation.
- The frontend uses `@iexec-nox/handle` to encrypt a `uint256` amount before sending a transaction.
- `NoxPayEscrow.createAndFundEscrow(...)` receives the encrypted handle/proof and transfers confidential ERC-7984 tokens from the client into escrow.
- The public escrow struct stores an opaque `euint256 encryptedAmount` handle, never a plaintext payment amount.
- `releaseEscrow(...)` sends the stored confidential token amount to the contractor.
- Client and contractor are registered as Nox viewers for the encrypted amount so the frontend can attempt private decryption with the Nox SDK.

Relevant packages:

- `@iexec-nox/nox-protocol-contracts`
- `@iexec-nox/nox-confidential-contracts`
- `@iexec-nox/handle`

## Repository

```text
contracts/   Hardhat 3 Solidity project
frontend/    Next.js + TypeScript + Tailwind dApp
README.md
feedback.md
.env.example
```

## Contracts

- `NoxPayToken`: demo ERC-7984 confidential token named `cNOXUSD`.
- `NoxPayEscrow`: private escrow lifecycle contract.

Main escrow functions:

- `createEscrow(contractor, jobTitle, metadataURI)`
- `createAndFundEscrow(contractor, jobTitle, metadataURI, encryptedAmount, inputProof)`
- `fundEscrow(escrowId, encryptedAmount, inputProof)`
- `releaseEscrow(escrowId)`
- `cancelEscrow(escrowId)`
- `claimEscrow(escrowId)`
- `getEscrow(escrowId)`
- `listEscrowsByClient(client)`
- `listEscrowsByContractor(contractor)`
- `listEscrowIds(startInclusive, limit)`

Public status values:

- `0`: Created
- `1`: Funded
- `2`: Released
- `3`: Cancelled

## Contract Addresses

Not deployed from this workspace yet.

After deployment, paste the addresses here and into `.env` / `frontend/.env.local`:

```text
Arbitrum Sepolia
NoxPayToken:
NoxPayEscrow:
```

## Setup

Use Node.js 20 or newer.

```bash
npm install
cp .env.example .env
```

Fill `.env`:

```text
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
PRIVATE_KEY=your_arbitrum_sepolia_deployer_private_key
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

## Compile And Test

```bash
npm run compile
npm test
npm run typecheck --workspace frontend
npm run build --workspace frontend
```

## Deploy To Arbitrum Sepolia

Fund the deployer wallet with Arbitrum Sepolia ETH, then run:

```bash
npm run deploy:arbitrum-sepolia --workspace contracts
```

The script writes deployment output to:

```text
contracts/deployments/arbitrumSepolia.json
```

Copy the addresses into `.env` and `frontend/.env.local`:

```text
NEXT_PUBLIC_NOXPAY_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_NOXPAY_ESCROW_ADDRESS=0x...
```

## Run Locally

```bash
npm run dev
```

Open the local Next.js URL shown in the terminal, usually:

```text
http://localhost:3000
```

## Judge Demo Flow

1. Connect a wallet on Arbitrum Sepolia.
2. Click **Mint demo** to mint `1,000 cNOXUSD` as confidential ERC-7984 demo tokens.
3. Enter a job title, contractor address, and amount.
4. Click **Create and fund**.
5. Confirm the operator approval if prompted, then confirm the escrow creation transaction.
6. Show the dashboard:
   - job title is public
   - client and contractor are public
   - status is public
   - amount is shown only as **Private amount**
   - transaction link opens the Arbitrum Sepolia explorer
7. As the client, click **Release**.
8. As the contractor, connect the contractor wallet and click **View** to decrypt the received amount if Nox viewer ACL/decryption is available for the handle.

## What Works Now

- Solidity contracts compile with Hardhat 3 and Solidity `0.8.28`.
- The escrow contract uses real iExec Nox ERC-7984 interfaces and encrypted handle types.
- The frontend encrypts amounts with `@iexec-nox/handle`.
- The frontend supports wallet connection, network status, demo mint, create/fund, release, cancel, transaction links, and private amount reveal attempts.
- Public dashboard data intentionally excludes plaintext amount fields.

## What Still Needs Live Deployment

- Arbitrum Sepolia deployment keys and gas.
- Deployed contract addresses added to env files.
- A live run against the current iExec Nox gateway/subgraph on Arbitrum Sepolia.
- Faucet ETH for all demo wallets.

## Notes

`NoxPayToken` is a demo confidential token to prove the confidential token flow end-to-end. A production version should wrap a real settlement asset with the iExec ERC-20 to ERC-7984 wrapper or integrate a deployed confidential payment token.
