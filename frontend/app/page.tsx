"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Eye,
  LockKeyhole,
  RefreshCw,
  Send,
  ShieldCheck,
  XCircle
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { formatUnits, isAddress, parseUnits, zeroHash, type Address, type Hex } from "viem";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useReadContract,
  useReadContracts,
  useSwitchChain,
  useWalletClient,
  useWriteContract
} from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import { decryptHandle, encryptUint256 } from "@/lib/nox";
import {
  CHAIN,
  escrowAbi,
  escrowAddress,
  explorerAddressUrl,
  explorerTxUrl,
  hasContractAddresses,
  tokenAbi,
  tokenAddress
} from "@/lib/contracts";
import { shortAddress } from "@/components/short-address";

type Escrow = {
  id: bigint;
  client: Address;
  contractor: Address;
  jobTitle: string;
  metadataURI: string;
  status: number;
  createdAt: bigint;
  fundedAt: bigint;
  releasedAt: bigint;
  cancelledAt: bigint;
  encryptedAmount: Hex;
};

const statusLabels = ["Created", "Funded", "Released", "Cancelled"];
const demoClient = "0x1111111111111111111111111111111111111111" as Address;
const demoContractor = "0x2222222222222222222222222222222222222222" as Address;
const demoHandle = "0x9f7d6f5a9d1e0f0b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0000" as Hex;

export default function Home() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient({ chainId: CHAIN.id });
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();

  const [jobTitle, setJobTitle] = useState("");
  const [contractor, setContractor] = useState("");
  const [amount, setAmount] = useState("");
  const [metadataURI, setMetadataURI] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [decrypted, setDecrypted] = useState<Record<string, string>>({});
  const [creationTxs, setCreationTxs] = useState<Record<string, string>>({});
  const [mockBalance, setMockBalance] = useState("0");
  const [mockAmounts, setMockAmounts] = useState<Record<string, string>>({});
  const [mockEscrows, setMockEscrows] = useState<Escrow[]>([
    {
      id: 1n,
      client: demoClient,
      contractor: demoContractor,
      jobTitle: "Landing page security review",
      metadataURI: "demo://noxpay/mock-1",
      status: 1,
      createdAt: BigInt(Math.floor(Date.now() / 1000) - 3600),
      fundedAt: BigInt(Math.floor(Date.now() / 1000) - 3500),
      releasedAt: 0n,
      cancelledAt: 0n,
      encryptedAmount: demoHandle
    }
  ]);

  const wrongNetwork = isConnected && chainId !== arbitrumSepolia.id;
  const demoMode = !hasContractAddresses;
  const activeViewer = address ?? demoClient;

  const { data: escrowCount, refetch: refetchCount } = useReadContract({
    address: escrowAddress,
    abi: escrowAbi,
    functionName: "escrowCount",
    query: { enabled: hasContractAddresses }
  });

  const ids = useMemo(() => {
    const count = Number(escrowCount ?? 0n);
    return Array.from({ length: Math.min(count, 25) }, (_, index) => BigInt(count - index));
  }, [escrowCount]);

  const { data: escrowReads, refetch: refetchEscrows } = useReadContracts({
    contracts: ids.map((id) => ({
      address: escrowAddress,
      abi: escrowAbi,
      functionName: "getEscrow",
      args: [id]
    })),
    query: { enabled: hasContractAddresses && ids.length > 0 }
  });

  const escrows = useMemo(
    () =>
      (escrowReads ?? [])
        .map((read) => (read.status === "success" ? (read.result as unknown as Escrow) : null))
        .filter((item): item is Escrow => Boolean(item)),
    [escrowReads]
  );
  const visibleEscrows = demoMode ? mockEscrows : escrows;

  const { data: isOperator, refetch: refetchOperator } = useReadContract({
    address: tokenAddress,
    abi: tokenAbi,
    functionName: "isOperator",
    args: address ? [address, escrowAddress] : undefined,
    query: { enabled: hasContractAddresses && Boolean(address) }
  });

  const { data: balanceHandle, refetch: refetchBalance } = useReadContract({
    address: tokenAddress,
    abi: tokenAbi,
    functionName: "confidentialBalanceOf",
    args: address ? [address] : undefined,
    query: { enabled: hasContractAddresses && Boolean(address) }
  });

  useEffect(() => {
    if (!publicClient || !hasContractAddresses) return;
    let cancelled = false;

    async function loadLogs() {
      const logs = await publicClient!.getLogs({
        address: escrowAddress,
        event: escrowAbi.find((item) => item.type === "event" && item.name === "EscrowCreated") as any,
        fromBlock: 0n,
        toBlock: "latest"
      });
      if (cancelled) return;
      const txs: Record<string, string> = {};
      for (const log of logs as unknown as Array<{ args?: { escrowId?: bigint }; transactionHash?: string }>) {
        const id = String(log.args?.escrowId ?? "");
        if (id && log.transactionHash) txs[id] = log.transactionHash;
      }
      setCreationTxs(txs);
    }

    loadLogs().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [publicClient, escrowCount]);

  async function ensureReady() {
    if (!walletClient || !address || !publicClient) throw new Error("Connect a wallet first.");
    if (!hasContractAddresses) throw new Error("Set deployed contract addresses in frontend/.env.local.");
    if (wrongNetwork) await switchChainAsync({ chainId: arbitrumSepolia.id });
    return { walletClient, address, publicClient };
  }

  async function wait(hash: Hex) {
    await publicClient?.waitForTransactionReceipt({ hash });
  }

  async function refresh() {
    if (demoMode) {
      setNotice({ type: "ok", text: "Demo data refreshed locally." });
      return;
    }
    await Promise.all([refetchCount(), refetchEscrows(), refetchOperator(), refetchBalance()]);
  }

  async function mintDemoTokens() {
    try {
      if (demoMode) {
        setBusy("Minting local demo balance");
        setNotice(null);
        await new Promise((resolve) => setTimeout(resolve, 350));
        setMockBalance("1000");
        setDecrypted((current) => ({ ...current, balance: "1000" }));
        setNotice({ type: "ok", text: "Demo mode: minted 1,000 mock cNOXUSD locally." });
        return;
      }
      const ctx = await ensureReady();
      setBusy("Minting confidential demo tokens");
      setNotice(null);
      const encrypted = await encryptUint256(ctx.walletClient, parseUnits("1000", 6), tokenAddress);
      const hash = await writeContractAsync({
        address: tokenAddress,
        abi: tokenAbi,
        functionName: "mintDemo",
        args: [encrypted.handle as Hex, encrypted.handleProof as Hex]
      });
      await wait(hash);
      setNotice({ type: "ok", text: "Minted 1,000 cNOXUSD confidential demo tokens." });
      await refresh();
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Mint failed." });
    } finally {
      setBusy(null);
    }
  }

  async function submitEscrow(event: FormEvent) {
    event.preventDefault();
    try {
      if (!isAddress(contractor)) throw new Error("Contractor wallet address is invalid.");
      if (!jobTitle.trim()) throw new Error("Enter a job title.");
      if (!amount || Number(amount) <= 0) throw new Error("Enter a positive amount.");

      if (demoMode) {
        setBusy("Creating local private escrow");
        setNotice(null);
        await new Promise((resolve) => setTimeout(resolve, 450));
        const id = BigInt(mockEscrows.length + 1);
        const escrow: Escrow = {
          id,
          client: activeViewer,
          contractor: contractor as Address,
          jobTitle: jobTitle.trim(),
          metadataURI: metadataURI.trim() || "demo://noxpay/local",
          status: 1,
          createdAt: BigInt(Math.floor(Date.now() / 1000)),
          fundedAt: BigInt(Math.floor(Date.now() / 1000)),
          releasedAt: 0n,
          cancelledAt: 0n,
          encryptedAmount: demoHandle
        };
        setMockEscrows((current) => [escrow, ...current]);
        setMockAmounts((current) => ({ ...current, [String(id)]: amount }));
        setCreationTxs((current) => ({ ...current, [String(id)]: "0xdemo" }));
        setJobTitle("");
        setContractor("");
        setAmount("");
        setMetadataURI("");
        setNotice({ type: "ok", text: "Demo mode: escrow created and funded locally. Amount is still hidden in the public card." });
        return;
      }

      const ctx = await ensureReady();

      setBusy("Encrypting and funding escrow");
      setNotice(null);

      if (!isOperator) {
        setBusy("Approving escrow contract as confidential token operator");
        const operatorHash = await writeContractAsync({
          address: tokenAddress,
          abi: tokenAbi,
          functionName: "setOperator",
          args: [escrowAddress, 281474976710655]
        });
        await wait(operatorHash);
      }

      setBusy("Encrypting payment amount with iExec Nox");
      const encrypted = await encryptUint256(ctx.walletClient, parseUnits(amount, 6), escrowAddress);

      setBusy("Creating funded escrow");
      const hash = await writeContractAsync({
        address: escrowAddress,
        abi: escrowAbi,
        functionName: "createAndFundEscrow",
        args: [contractor as Address, jobTitle.trim(), metadataURI.trim(), encrypted.handle as Hex, encrypted.handleProof as Hex]
      });
      await wait(hash);
      setJobTitle("");
      setContractor("");
      setAmount("");
      setMetadataURI("");
      setNotice({ type: "ok", text: "Escrow created and funded. The amount is stored only as an encrypted Nox handle." });
      await refresh();
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Escrow creation failed." });
    } finally {
      setBusy(null);
    }
  }

  async function actOnEscrow(id: bigint, action: "releaseEscrow" | "cancelEscrow") {
    try {
      if (demoMode) {
        setBusy(action === "releaseEscrow" ? "Releasing local escrow" : "Cancelling local escrow");
        setNotice(null);
        await new Promise((resolve) => setTimeout(resolve, 300));
        setMockEscrows((current) =>
          current.map((escrow) =>
            escrow.id === id
              ? {
                  ...escrow,
                  status: action === "releaseEscrow" ? 2 : 3,
                  releasedAt: action === "releaseEscrow" ? BigInt(Math.floor(Date.now() / 1000)) : escrow.releasedAt,
                  cancelledAt: action === "cancelEscrow" ? BigInt(Math.floor(Date.now() / 1000)) : escrow.cancelledAt
                }
              : escrow
          )
        );
        setNotice({ type: "ok", text: action === "releaseEscrow" ? "Demo mode: payment released locally." : "Demo mode: escrow cancelled locally." });
        return;
      }
      await ensureReady();
      setBusy(action === "releaseEscrow" ? "Releasing escrow" : "Cancelling escrow");
      setNotice(null);
      const hash = await writeContractAsync({
        address: escrowAddress,
        abi: escrowAbi,
        functionName: action,
        args: [id]
      });
      await wait(hash);
      setNotice({ type: "ok", text: action === "releaseEscrow" ? "Payment released to contractor." : "Escrow cancelled." });
      await refresh();
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Transaction failed." });
    } finally {
      setBusy(null);
    }
  }

  async function revealAmount(escrow: Escrow) {
    try {
      if (demoMode) {
        const value = mockAmounts[String(escrow.id)] ?? (escrow.id === 1n ? "750" : "Encrypted");
        setDecrypted((current) => ({ ...current, [String(escrow.id)]: value }));
        setNotice({ type: "ok", text: "Demo mode: amount revealed to an authorized viewer locally." });
        return;
      }
      const ctx = await ensureReady();
      setBusy("Decrypting private amount");
      const handle = escrow.encryptedAmount;
      if (!handle || handle === zeroHash) throw new Error("This escrow has no funded amount handle.");
      const result = await decryptHandle(ctx.walletClient, handle);
      setDecrypted((current) => ({ ...current, [String(escrow.id)]: formatUnits(BigInt(result.value as bigint), 6) }));
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Could not decrypt this handle." });
    } finally {
      setBusy(null);
    }
  }

  async function revealBalance() {
    try {
      if (demoMode) {
        setDecrypted((current) => ({ ...current, balance: mockBalance === "0" ? "1000" : mockBalance }));
        setNotice({ type: "ok", text: "Demo mode: confidential balance revealed locally." });
        return;
      }
      const ctx = await ensureReady();
      setBusy("Decrypting confidential balance");
      if (!balanceHandle || balanceHandle === zeroHash) throw new Error("No confidential balance handle yet.");
      const result = await decryptHandle(ctx.walletClient, balanceHandle as Hex);
      setDecrypted((current) => ({ ...current, balance: formatUnits(BigInt(result.value as bigint), 6) }));
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Could not decrypt balance." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="min-h-screen px-4 py-5 text-[#effaf6] sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-4 border-b border-[#244039] pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-md border border-[#48d39a]/50 bg-[#10241d]">
                <LockKeyhole size={20} className="text-[#48d39a]" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-normal">NoxPay</h1>
                <p className="text-sm text-[#9fb7af]">Private escrow payments for Web3 freelancers</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-md border border-[#244039] bg-[#0c1714] px-3 py-2 text-sm text-[#9fb7af]">
              {wrongNetwork ? "Wrong network" : "Arbitrum Sepolia"}
            </div>
            <ConnectButton />
          </div>
        </header>

        {!hasContractAddresses && (
          <Banner
            tone="busy"
            text="Demo Mode is active because contract addresses are not configured. Actions run on local mock data; deploy contracts to switch to on-chain mode."
          />
        )}
        {wrongNetwork && <Banner tone="error" text="Switch to Arbitrum Sepolia before sending transactions." />}
        {notice && <Banner tone={notice.type === "ok" ? "ok" : "error"} text={notice.text} />}
        {busy && <Banner tone="busy" text={busy} />}

        <section className="grid gap-5 lg:grid-cols-[380px_1fr]">
          <aside className="flex flex-col gap-5">
            <div className="rounded-lg border border-[#244039] bg-[#0c1714] p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Create escrow</h2>
                  <p className="text-sm text-[#9fb7af]">Amount is encrypted before the transaction.</p>
                </div>
                <ShieldCheck className="text-[#48d39a]" size={20} />
              </div>
              <form className="flex flex-col gap-3" onSubmit={submitEscrow}>
                <Field label="Job title" value={jobTitle} onChange={setJobTitle} placeholder="Frontend audit sprint" />
                <Field label="Contractor address" value={contractor} onChange={setContractor} placeholder="0x..." />
                <Field label="Private amount" value={amount} onChange={setAmount} placeholder="250.00" type="number" />
                <Field label="Metadata URI" value={metadataURI} onChange={setMetadataURI} placeholder="ipfs://... or brief note" />
                <button
                  type="submit"
                  disabled={(!isConnected && !demoMode) || Boolean(busy)}
                  className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#48d39a] px-4 font-semibold text-[#05110d] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send size={17} />
                  Create and fund
                </button>
              </form>
            </div>

            <div className="rounded-lg border border-[#244039] bg-[#0c1714] p-4">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Confidential token</h2>
                  <p className="text-sm text-[#9fb7af]">Demo cNOXUSD uses ERC-7984 handles.</p>
                </div>
                <LockKeyhole className="text-[#48d39a]" size={20} />
              </div>
              <div className="space-y-2 text-sm text-[#9fb7af]">
                <p>Token: {tokenAddress ? <AddressLink address={tokenAddress} /> : "Demo token"}</p>
                <p>Escrow: {escrowAddress ? <AddressLink address={escrowAddress} /> : "Local mock escrow"}</p>
                <p>Operator: {demoMode ? "Demo approved" : isOperator ? "Approved" : "Needs approval on first escrow"}</p>
                <p>Balance: {decrypted.balance ? `${decrypted.balance} cNOXUSD` : "Encrypted"}</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={(!isConnected && !demoMode) || Boolean(busy)}
                  onClick={mintDemoTokens}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#48d39a]/50 text-sm font-semibold text-[#48d39a] disabled:opacity-50"
                >
                  <CheckCircle2 size={16} />
                  Mint demo
                </button>
                <button
                  type="button"
                  disabled={(!isConnected && !demoMode) || Boolean(busy)}
                  onClick={revealBalance}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#244039] text-sm font-semibold text-[#effaf6] disabled:opacity-50"
                >
                  <Eye size={16} />
                  View balance
                </button>
              </div>
            </div>
          </aside>

          <section className="rounded-lg border border-[#244039] bg-[#0c1714]">
            <div className="flex flex-col gap-3 border-b border-[#244039] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold">Escrows</h2>
                <p className="text-sm text-[#9fb7af]">Public records show parties and status. Amounts stay private.</p>
              </div>
              <button
                type="button"
                onClick={refresh}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#244039] px-3 text-sm text-[#effaf6]"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>

            <div className="divide-y divide-[#244039]">
              {visibleEscrows.length === 0 ? (
                <div className="p-8 text-center text-[#9fb7af]">No escrows yet. Create the first funded private payment.</div>
              ) : (
                visibleEscrows.map((escrow) => (
                  <EscrowRow
                    key={String(escrow.id)}
                    escrow={escrow}
                    viewer={activeViewer}
                    txHash={creationTxs[String(escrow.id)]}
                    revealed={decrypted[String(escrow.id)]}
                    onRelease={() => actOnEscrow(escrow.id, "releaseEscrow")}
                    onCancel={() => actOnEscrow(escrow.id, "cancelEscrow")}
                    onReveal={() => revealAmount(escrow)}
                    disabled={Boolean(busy)}
                  />
                ))
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function Banner({ tone, text }: { tone: "ok" | "error" | "busy"; text: string }) {
  const styles =
    tone === "ok"
      ? "border-[#48d39a]/50 bg-[#0f221b] text-[#c8f8e2]"
      : tone === "busy"
        ? "border-[#f2b84b]/40 bg-[#211a0b] text-[#ffe1a4]"
        : "border-[#ef6b6b]/40 bg-[#251113] text-[#ffd1d1]";
  const Icon = tone === "ok" ? CheckCircle2 : tone === "busy" ? RefreshCw : AlertCircle;
  return (
    <div className={`flex items-center gap-3 rounded-md border px-4 py-3 text-sm ${styles}`}>
      <Icon size={17} />
      <span>{text}</span>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-[#9fb7af]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        step={type === "number" ? "0.000001" : undefined}
        className="h-11 rounded-md border border-[#244039] bg-[#07110f] px-3 text-[#effaf6] outline-none transition focus:border-[#48d39a]"
      />
    </label>
  );
}

function EscrowRow({
  escrow,
  viewer,
  txHash,
  revealed,
  onRelease,
  onCancel,
  onReveal,
  disabled
}: {
  escrow: Escrow;
  viewer?: Address;
  txHash?: string;
  revealed?: string;
  onRelease: () => void;
  onCancel: () => void;
  onReveal: () => void;
  disabled: boolean;
}) {
  const isClient = viewer?.toLowerCase() === escrow.client.toLowerCase();
  const isContractor = viewer?.toLowerCase() === escrow.contractor.toLowerCase();
  const status = statusLabels[escrow.status] ?? "Unknown";

  return (
    <article className="grid gap-4 p-4 xl:grid-cols-[1.4fr_1fr_auto] xl:items-center">
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h3 className="truncate font-semibold">{escrow.jobTitle}</h3>
          <span className="rounded-md border border-[#244039] px-2 py-1 text-xs text-[#9fb7af]">
            {status}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-[#10241d] px-2 py-1 text-xs text-[#48d39a]">
            <LockKeyhole size={12} />
            {revealed ? `${revealed} cNOXUSD` : "Private amount"}
          </span>
        </div>
        <div className="grid gap-1 text-sm text-[#9fb7af] sm:grid-cols-2">
          <p>Client: <AddressLink address={escrow.client} /></p>
          <p>Contractor: <AddressLink address={escrow.contractor} /></p>
        </div>
      </div>
      <div className="text-sm text-[#9fb7af]">
        <p>Created: {new Date(Number(escrow.createdAt) * 1000).toLocaleString()}</p>
        <p>Escrow ID: #{String(escrow.id)}</p>
        {txHash && (
          <a
            className="mt-1 inline-flex items-center gap-1 text-[#48d39a]"
            href={explorerTxUrl(txHash)}
            target="_blank"
            rel="noreferrer"
          >
            Transaction <ExternalLink size={13} />
          </a>
        )}
      </div>
      <div className="flex flex-wrap gap-2 xl:justify-end">
        {isClient && escrow.status === 1 && (
          <>
            <ActionButton onClick={onRelease} disabled={disabled} icon={<Send size={15} />} label="Release" />
            <ActionButton onClick={onCancel} disabled={disabled} icon={<XCircle size={15} />} label="Cancel" tone="danger" />
          </>
        )}
        {isClient && escrow.status === 0 && (
          <ActionButton onClick={onCancel} disabled={disabled} icon={<XCircle size={15} />} label="Cancel" tone="danger" />
        )}
        {(isClient || isContractor) && escrow.status !== 0 && escrow.status !== 3 && (
          <ActionButton onClick={onReveal} disabled={disabled} icon={<Eye size={15} />} label="View" />
        )}
      </div>
    </article>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
  disabled,
  tone = "default"
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-9 min-w-24 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold disabled:opacity-50 ${
        tone === "danger"
          ? "border-[#ef6b6b]/50 text-[#ffadad]"
          : "border-[#48d39a]/50 text-[#48d39a]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function AddressLink({ address }: { address: string }) {
  return (
    <a className="text-[#effaf6] hover:text-[#48d39a]" href={explorerAddressUrl(address)} target="_blank" rel="noreferrer">
      {shortAddress(address)}
    </a>
  );
}
