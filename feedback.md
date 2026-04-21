# iExec Nox Feedback

## What Was Easy

- The `@iexec-nox/handle` SDK has a clear core flow: create a handle client, call `encryptInput`, pass `handle` and `handleProof` to Solidity, and later call `decrypt`.
- The Solidity package exposes familiar token abstractions through ERC-7984, which made it straightforward to model confidential balances as token balances rather than inventing a custom encrypted accounting system.
- Arbitrum Sepolia is built into the Nox Solidity SDK address resolution and the TypeScript handle SDK defaults, which is helpful for hackathon demos.

## What Was Confusing

- The relationship between `applicationContract`, `msg.sender`, and `Nox.fromExternal(...)` needs a prominent example. In this MVP, encrypted inputs for escrow funding must be encrypted for the escrow contract, because the escrow contract calls `confidentialTransferFrom`.
- ERC-7984 transfers can return an encrypted zero on insufficient balance instead of reverting. That is powerful, but it is surprising for escrow UX because the app cannot simply branch on a public success boolean.
- Viewer ACL versus transient allowance is easy to mix up. A compact diagram showing when to call `Nox.allow`, `Nox.allowThis`, `Nox.allowTransient`, and `Nox.addViewer` would save a lot of time.
- Hardhat 3 compatibility around plugin selection is still rough. The latest toolbox warning was confusing; using `@nomicfoundation/hardhat-viem` directly worked better.

## Docs And Examples That Helped

- `@iexec-nox/handle` README examples for `createViemHandleClient`, `encryptInput`, `decrypt`, and `viewACL`.
- `@iexec-nox/nox-confidential-contracts` ERC-7984 interfaces and implementation files.
- `@iexec-nox/nox-protocol-contracts` `Nox.sol`, especially `fromExternal`, `allow`, `addViewer`, and the Arbitrum Sepolia `NoxCompute` address.

## What Could Be Improved

- Provide a minimal end-to-end sample dApp with:
  - frontend encryption
  - ERC-7984 mint/wrap
  - contract-to-contract confidential transfer
  - viewer decryption
  - Arbitrum Sepolia deployment config
- Document the recommended production pattern for confidential escrow specifically: whether to transfer confidential tokens into escrow, hold handles, use `confidentialTransferAndCall`, or wrap an ERC-20 into ERC-7984.
- Add a troubleshooting section for common gateway/subgraph errors returned by the handle SDK.
- Clarify how judges or testers should get a compatible confidential token balance on testnet.

## Bugs Or Friction Encountered

- No Nox bug was confirmed during local implementation.
- The main friction was ecosystem freshness: package versions are new, Hardhat 3 plugin choices are not obvious, and examples for full dApp flows are still sparse.
- Live Nox gateway/subgraph behavior still needs verification after deploying this repo to Arbitrum Sepolia with funded keys.
