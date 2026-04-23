"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  LockKeyhole,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Wallet,
  XCircle
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { isAddress, type Address, type Hex } from "viem";
import { useAccount } from "wagmi";
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

const iexecHeroVideo =
  "https://cdn.prod.website-files.com/6646148828eddb19c172bf2a%2F69b41173f14aa29aa074057f_Module-CToken%20%281%29_mp4.mp4";
const iexecHeroImage =
  "https://cdn.prod.website-files.com/6646148828eddb19c172bf2a/69b41cd5021febfede6d0304_Homre%20protected.webp";
const iexecModuleImage =
  "https://cdn.prod.website-files.com/6646148828eddb19c172bf2a/69b41b9d9d23aa3d51427001_Module-VAJ-iExec-HD%20(3).webp";

const statusLabels = ["Created", "Funded", "Released", "Cancelled"];
const demoClient = "0x1111111111111111111111111111111111111111" as Address;
const demoContractor = "0x2222222222222222222222222222222222222222" as Address;
const demoHandle = "0x9f7d6f5a9d1e0f0b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0000" as Hex;

const capabilityCards = [
  {
    title: "Confidential funding",
    body: "Payment amounts are treated as private values. Public viewers get status, counterparties, and timestamps, but not the commercial number."
  },
  {
    title: "Escrow with real posture",
    body: "Clients reserve payment first, release only after delivery, and contractors can point to an on-chain state instead of a promise in chat."
  },
  {
    title: "Built for sponsor fit",
    body: "The flow is framed around iExec Nox Confidential Tokens, so the demo naturally showcases privacy, escrow, and usable Web3 product design."
  }
];

const processSteps = [
  {
    index: "01",
    title: "Fund privately",
    copy: "A client creates a job, chooses the contractor wallet, and funds the escrow while the amount stays hidden from the public dashboard."
  },
  {
    index: "02",
    title: "Track progress publicly",
    copy: "Job title, counterparties, status, and timestamps stay visible, which gives transparency without leaking rates or budgets."
  },
  {
    index: "03",
    title: "Release when work lands",
    copy: "Once the contractor ships, the client releases the escrow. Authorized parties can then reveal the private amount from the secure flow."
  }
];

export default function Home() {
  const { address, isConnected } = useAccount();
  const [jobTitle, setJobTitle] = useState("");
  const [contractor, setContractor] = useState("");
  const [amount, setAmount] = useState("");
  const [metadataURI, setMetadataURI] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [decryptingId, setDecryptingId] = useState<string | null>(null);
  const [isDecryptingBalance, setIsDecryptingBalance] = useState(false);
  const [notice, setNotice] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [decrypted, setDecrypted] = useState<Record<string, string>>({});
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
  const activeViewer = address ?? demoClient;
  const escrows = useMemo(() => mockEscrows, [mockEscrows]);

  async function mintDemoTokens() {
    try {
      setBusy("Minting local demo balance");
      setNotice(null);
      await new Promise((resolve) => setTimeout(resolve, 350));
      setMockBalance("1000");
      setDecrypted((current) => ({ ...current, balance: "1000" }));
      setNotice({ type: "ok", text: "Demo mode: minted 1,000 mock cNOXUSD locally." });
    } catch {
      setNotice({ type: "error", text: "Mint failed." });
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
      setJobTitle("");
      setContractor("");
      setAmount("");
      setMetadataURI("");
      setNotice({
        type: "ok",
        text: "Demo mode: escrow created and funded locally. The amount stays hidden in the public card."
      });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Escrow creation failed." });
    } finally {
      setBusy(null);
    }
  }

  async function actOnEscrow(id: bigint, action: "releaseEscrow" | "cancelEscrow") {
    try {
      setBusy(action === "releaseEscrow" ? "Releasing local escrow" : "Cancelling local escrow");
      setNotice(null);
      await new Promise((resolve) => setTimeout(resolve, 300));
      setMockEscrows((current) =>
        current.map((escrow) =>
          escrow.id === id
            ? {
                ...escrow,
                status: action === "releaseEscrow" ? 2 : 3,
                releasedAt:
                  action === "releaseEscrow" ? BigInt(Math.floor(Date.now() / 1000)) : escrow.releasedAt,
                cancelledAt:
                  action === "cancelEscrow" ? BigInt(Math.floor(Date.now() / 1000)) : escrow.cancelledAt
              }
              : escrow
        )
      );
      setNotice({
        type: "ok",
        text: action === "releaseEscrow" ? "Demo mode: payment released locally." : "Demo mode: escrow cancelled locally."
      });
    } catch {
      setNotice({ type: "error", text: "Action failed." });
    } finally {
      setBusy(null);
    }
  }

  async function revealAmount(escrow: Escrow) {
    try {
      setDecryptingId(String(escrow.id));
      await new Promise((resolve) => setTimeout(resolve, 800));
      const value = mockAmounts[String(escrow.id)] ?? (escrow.id === 1n ? "750" : "Encrypted");
      setDecrypted((current) => ({ ...current, [String(escrow.id)]: value }));
      setNotice({ type: "ok", text: "Demo mode: amount revealed to an authorized viewer locally." });
    } catch {
      setNotice({ type: "error", text: "Could not decrypt this handle." });
    } finally {
      setDecryptingId(null);
    }
  }

  async function revealBalance() {
    try {
      setIsDecryptingBalance(true);
      await new Promise((resolve) => setTimeout(resolve, 800));
      setDecrypted((current) => ({ ...current, balance: mockBalance === "0" ? "1000" : mockBalance }));
      setNotice({ type: "ok", text: "Demo mode: confidential balance revealed locally." });
    } catch {
      setNotice({ type: "error", text: "Could not decrypt balance." });
    } finally {
      setIsDecryptingBalance(false);
    }
  }

  return (
    <main className="bg-[#06110f] text-[#effaf6]">
      <section className="relative min-h-screen overflow-hidden">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          poster={iexecHeroImage}
        >
          <source src={iexecHeroVideo} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(72,211,154,0.18),_transparent_30%)]" />

        <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-4 pb-8 pt-5 sm:px-6 lg:px-8">
          <header className="flex items-center justify-between border-b border-white/10 pb-5">
            <div className="flex items-center gap-3">
              <NoxPayMark className="size-11" />
              <div>
                <p className="text-lg font-semibold">NoxPay</p>
                <p className="text-xs uppercase tracking-[0.18em] text-[#9fb7af]">Private escrow for Web3 work</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="#demo"
                className="hidden h-10 items-center rounded-md border border-white/15 px-4 text-sm text-white/88 sm:inline-flex"
              >
                View demo
              </a>
              <ConnectButton />
            </div>
          </header>

          <div className="grid flex-1 items-end gap-8 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:py-16">
            <div className="max-w-3xl">
              <p className="mb-4 inline-flex items-center gap-2 rounded-md border border-[#48d39a]/40 bg-black/30 px-3 py-2 text-xs uppercase tracking-[0.18em] text-[#b8ead5] backdrop-blur">
                <Sparkles size={14} />
                Built for iExec Nox confidential tokens
              </p>
              <h1 className="max-w-4xl text-5xl font-semibold leading-[0.95] sm:text-6xl lg:text-7xl">
                Private escrow payments for high-trust Web3 freelance work.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-[#d1ddd8] sm:text-lg">
                NoxPay gives clients a way to reserve payment on-chain while keeping the amount private. The deal stays
                auditable. The budget stays confidential. The demo stays smooth.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#demo"
                  className="inline-flex h-12 items-center gap-2 rounded-md bg-[#48d39a] px-5 text-sm font-semibold text-[#04100d]"
                >
                  Open live walkthrough
                  <ArrowRight size={16} />
                </a>
                <a
                  href="#story"
                  className="inline-flex h-12 items-center rounded-md border border-white/15 px-5 text-sm font-semibold text-white/88 backdrop-blur"
                >
                  Why it matters
                </a>
              </div>
            </div>

            <div className="grid gap-4 self-end">
              <div className="rounded-lg border border-white/12 bg-black/35 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.18em] text-[#9fb7af]">Product frame</p>
                <p className="mt-3 text-2xl font-semibold">Upwork-style escrow, but with private amounts on-chain.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <StatCard value="Private" label="Payment amount" />
                <StatCard value="Funded" label="Escrow state" />
                <StatCard value="4 min" label="Judge-friendly demo" />
              </div>
            </div>
          </div>

          <div className="grid gap-3 border-t border-white/10 pt-5 text-sm text-[#c3d2cd] sm:grid-cols-3">
            <InfoRow label="Network" value="Arbitrum Sepolia" />
            <InfoRow label="Mode" value="Demo-first with Nox-ready flow" />
            <InfoRow label="Tech" value="Next.js, wagmi, viem, iExec Nox" />
          </div>
        </div>
      </section>

      <section id="story" className="border-t border-white/6 bg-[#081411] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[#7cbda1]">Why NoxPay</p>
              <h2 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
                Public work coordination. Private commercial terms.
              </h2>
            </div>
            <p className="max-w-2xl text-base leading-7 text-[#a8beb5]">
              Clients want escrow because it gives contractors confidence. Contractors want privacy because rates and deal
              size should not become permanent public metadata. NoxPay sits in the middle and makes that tradeoff feel
              obvious.
            </p>
          </div>

          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {capabilityCards.map((card) => (
              <article key={card.title} className="rounded-lg border border-white/8 bg-[#0b1815] p-6">
                <h3 className="text-xl font-semibold">{card.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#9fb7af]">{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#06110f] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="overflow-hidden rounded-lg border border-white/8">
            <img src={iexecModuleImage} alt="iExec Nox technology visual" className="h-full w-full object-cover" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#7cbda1]">Product flow</p>
            <h2 className="mt-4 text-4xl font-semibold sm:text-5xl">Built to tell the right story in one glance.</h2>
            <div className="mt-8 space-y-5">
              {processSteps.map((step) => (
                <div key={step.index} className="grid gap-3 border-t border-white/8 pt-5 sm:grid-cols-[70px_1fr]">
                  <p className="text-sm text-[#7cbda1]">{step.index}</p>
                  <div>
                    <h3 className="text-xl font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-[#9fb7af]">{step.copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="demo" className="bg-[#070707] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[#7cbda1]">Interactive demo</p>
              <h2 className="mt-4 text-4xl font-semibold sm:text-5xl">A polished walkthrough judges can use themselves.</h2>
            </div>
            <div className="max-w-xl text-sm leading-7 text-[#9fb7af]">
              This section keeps the core happy-path live: mint demo funds, create a private escrow, release it, and reveal
              the amount only when the user explicitly asks to decrypt it.
            </div>
          </div>

          {notice && <Banner tone={notice.type === "ok" ? "ok" : "error"} text={notice.text} />}
          {busy && <Banner tone="busy" text={busy} />}

          <div className="mt-6 grid gap-5 lg:grid-cols-[400px_1fr]">
            <aside className="flex flex-col gap-5">
              <div className="rounded-lg border border-white/8 bg-[#0b1815] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">Create private escrow</h3>
                    <p className="mt-1 text-sm text-[#9fb7af]">The amount is hidden in the public dashboard.</p>
                  </div>
                  <ShieldCheck size={20} className="text-[#48d39a]" />
                </div>
                <form className="flex flex-col gap-3" onSubmit={submitEscrow}>
                  <Field label="Job title" value={jobTitle} onChange={setJobTitle} placeholder="Smart contract audit" />
                  <Field label="Contractor address" value={contractor} onChange={setContractor} placeholder="0x..." />
                  <Field label="Private amount" value={amount} onChange={setAmount} placeholder="750" type="number" />
                  <Field label="Metadata URI" value={metadataURI} onChange={setMetadataURI} placeholder="ipfs://scope" />
                  <button
                    type="submit"
                    disabled={Boolean(busy)}
                    className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#48d39a] px-4 font-semibold text-[#05110d] disabled:opacity-50"
                  >
                    <Send size={16} />
                    Create and fund
                  </button>
                </form>
              </div>

              <div className="rounded-lg border border-white/8 bg-[#0b1815] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">Demo wallet</h3>
                    <p className="mt-1 text-sm text-[#9fb7af]">A local stand-in for confidential token balance.</p>
                  </div>
                  <Wallet size={20} className="text-[#48d39a]" />
                </div>
                <div className="space-y-2 text-sm text-[#9fb7af]">
                  <p>Mode: Demo-first landing</p>
                  <p>Token: cNOXUSD</p>
                  <p>Balance: {decrypted.balance ? `${decrypted.balance} cNOXUSD` : "Encrypted"}</p>
                  <p>Viewer: {shortAddress(activeViewer)}</p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={mintDemoTokens}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#48d39a]/50 text-sm font-semibold text-[#48d39a] disabled:opacity-50"
                  >
                    <CheckCircle2 size={16} />
                    Mint demo
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(busy) || isDecryptingBalance}
                    onClick={revealBalance}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/10 text-sm font-semibold text-[#effaf6] disabled:opacity-50"
                  >
                    {isDecryptingBalance ? <RefreshCw size={16} className="animate-spin" /> : <Eye size={16} />}
                    {isDecryptingBalance ? "Decrypting..." : "View balance"}
                  </button>
                </div>
              </div>
            </aside>

            <section className="overflow-hidden rounded-lg border border-white/10 bg-[#0d0d0d] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
              <div className="flex flex-col gap-3 border-b border-white/8 p-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold">Escrow board</h3>
                  <p className="mt-1 text-sm text-[#8f8f8f]">
                    Public: job, parties, status. Private: amount until explicit reveal.
                  </p>
                </div>
                <div className="rounded-md border border-white/10 bg-[#141414] px-3 py-2 text-xs uppercase tracking-[0.18em] text-[#d6d6d6]">
                  Demo Mode Active
                </div>
              </div>
              <div className="divide-y divide-white/8">
                {escrows.map((escrow) => (
                  <EscrowRow
                    key={String(escrow.id)}
                    escrow={escrow}
                    viewer={activeViewer}
                    revealed={decrypted[String(escrow.id)]}
                    isDecrypting={decryptingId === String(escrow.id)}
                    onRelease={() => actOnEscrow(escrow.id, "releaseEscrow")}
                    onCancel={() => actOnEscrow(escrow.id, "cancelEscrow")}
                    onReveal={() => revealAmount(escrow)}
                    disabled={Boolean(busy)}
                  />
                ))}
              </div>
            </section>
          </div>
        </div>
      </section>

      <section className="border-t border-white/6 bg-[#06110f] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-3">
          <JudgeCard
            title="4-minute fit"
            body="The page lets you show the product thesis, the sponsor tech angle, and the working happy path without changing tabs."
          />
          <JudgeCard
            title="Sponsor-friendly"
            body="The story is framed around privacy as a usable product feature, not just a protocol primitive."
          />
          <JudgeCard
            title="Demo-safe"
            body="Even without live deployment keys, the landing page still behaves like a product instead of a dead mockup."
          />
        </div>
      </section>
    </main>
  );
}

function NoxPayMark({ className = "" }: { className?: string }) {
  return (
    <div
      className={`grid place-items-center rounded-[10px] border border-[#48d39a]/55 bg-[linear-gradient(180deg,rgba(6,17,15,0.82),rgba(8,31,24,0.96))] shadow-[0_0_30px_rgba(72,211,154,0.12)] ${className}`}
    >
      <svg viewBox="0 0 64 64" className="h-[74%] w-[74%]" aria-hidden="true">
        <defs>
          <linearGradient id="noxpayMark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#90ffd0" />
            <stop offset="55%" stopColor="#48d39a" />
            <stop offset="100%" stopColor="#0d6f51" />
          </linearGradient>
        </defs>
        <path
          d="M13 16c0-2.2 1.8-4 4-4h12.2c2.4 0 4.7 1 6.3 2.8L51 31.4c1.5 1.6 1.5 4 0 5.6L35.5 53.2A8.6 8.6 0 0 1 29.2 56H17a4 4 0 0 1-4-4z"
          fill="none"
          stroke="url(#noxpayMark)"
          strokeWidth="4.5"
          strokeLinejoin="round"
        />
        <path
          d="M22 22.5h6.2c1.8 0 3.5.8 4.7 2.1l10.6 11.4-10.6 11.4a6.3 6.3 0 0 1-4.7 2.1H22z"
          fill="url(#noxpayMark)"
          opacity="0.95"
        />
        <circle cx="24" cy="32" r="4.3" fill="#04110d" />
      </svg>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/28 p-4 backdrop-blur">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-[#a8beb5]">{label}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.16em] text-[#7cbda1]">{label}</p>
      <p className="mt-1 text-sm text-[#d3ddd8]">{value}</p>
    </div>
  );
}

function Banner({ tone, text }: { tone: "ok" | "error" | "busy"; text: string }) {
  const styles =
    tone === "ok"
      ? "border-[#48d39a]/40 bg-[#0e221b] text-[#c8f8e2]"
      : tone === "busy"
        ? "border-[#f2b84b]/30 bg-[#211a0b] text-[#ffe1a4]"
        : "border-[#ef6b6b]/30 bg-[#251113] text-[#ffd1d1]";
  const Icon = tone === "ok" ? CheckCircle2 : tone === "busy" ? RefreshCw : XCircle;
  return (
    <div className={`mb-4 flex items-center gap-3 rounded-md border px-4 py-3 text-sm ${styles}`}>
      <Icon size={17} className={tone === "busy" ? "animate-spin" : ""} />
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
        className="h-11 rounded-md border border-white/10 bg-[#07110f] px-3 text-[#effaf6] outline-none transition focus:border-[#48d39a]"
      />
    </label>
  );
}

function EscrowRow({
  escrow,
  viewer,
  revealed,
  isDecrypting,
  onRelease,
  onCancel,
  onReveal,
  disabled
}: {
  escrow: Escrow;
  viewer?: Address;
  revealed?: string;
  isDecrypting?: boolean;
  onRelease: () => void;
  onCancel: () => void;
  onReveal: () => void;
  disabled: boolean;
}) {
  const isClient = viewer?.toLowerCase() === escrow.client.toLowerCase();
  const isContractor = viewer?.toLowerCase() === escrow.contractor.toLowerCase();
  const status = statusLabels[escrow.status] ?? "Unknown";

  return (
    <article className="grid gap-4 bg-[linear-gradient(180deg,rgba(13,13,13,0.98),rgba(9,9,9,0.98))] p-5 transition duration-300 hover:bg-[linear-gradient(180deg,rgba(18,18,18,0.98),rgba(12,12,12,0.98))] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] xl:grid-cols-[1.3fr_0.9fr_auto] xl:items-center">
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h4 className="truncate text-lg font-semibold">{escrow.jobTitle}</h4>
          <span className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-[#151515] px-2 py-1 text-xs text-[#d2d2d2]">
            <span className="inline-block size-1.5 rounded-full bg-white/70 animate-pulse" />
            {status}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-white/8 bg-[#111111] px-2 py-1 text-xs text-[#f2f2f2] transition duration-300 hover:border-white/20 hover:bg-[#161616]">
            <LockKeyhole size={12} />
            {revealed ? `${revealed} cNOXUSD` : "Private amount"}
          </span>
        </div>
        <div className="grid gap-1 text-sm text-[#8f8f8f] sm:grid-cols-2">
          <p>Client: {shortAddress(escrow.client)}</p>
          <p>Contractor: {shortAddress(escrow.contractor)}</p>
        </div>
      </div>
      <div className="text-sm text-[#8f8f8f]">
        <p>Created: {new Date(Number(escrow.createdAt) * 1000).toLocaleString()}</p>
        <p>Escrow ID: #{String(escrow.id)}</p>
      </div>
      <div className="flex flex-wrap gap-2 xl:justify-end">
        {isClient && escrow.status === 1 && (
          <ActionButton onClick={onRelease} disabled={disabled} icon={<Send size={15} />} label="Release" />
        )}
        {isClient && escrow.status === 0 && (
          <ActionButton onClick={onCancel} disabled={disabled} icon={<XCircle size={15} />} label="Cancel" tone="danger" />
        )}
        {(isClient || isContractor) && escrow.status !== 0 && escrow.status !== 3 && (
          <ActionButton
            onClick={onReveal}
            disabled={disabled || Boolean(isDecrypting)}
            icon={isDecrypting ? <RefreshCw size={15} className="animate-spin" /> : <Eye size={15} />}
            label={isDecrypting ? "Decrypting..." : "View"}
          />
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
      className={`inline-flex h-9 min-w-24 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition duration-300 hover:-translate-y-[1px] disabled:opacity-50 disabled:hover:translate-y-0 ${
        tone === "danger"
          ? "border-white/10 bg-[#151515] text-[#f0f0f0] hover:border-white/20 hover:bg-[#1a1a1a]"
          : "border-white/10 bg-[#111111] text-[#f5f5f5] hover:border-white/20 hover:bg-[#171717]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function JudgeCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-lg border border-white/8 bg-[#0b1815] p-6">
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-[#9fb7af]">{body}</p>
    </article>
  );
}
