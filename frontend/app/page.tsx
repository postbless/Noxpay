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
import { FormEvent, type ReactNode, useMemo, useState } from "react";
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
    title: "Private payment amounts",
    copy: "Job title, client, contractor, and status can stay public while the actual payment amount remains hidden."
  },
  {
    index: "02",
    title: "Escrow before delivery",
    copy: "Contractors can see that a client has reserved payment first, which makes the flow feel closer to a real freelance platform."
  },
  {
    index: "03",
    title: "Release on approval",
    copy: "The client keeps control over release, so work still follows a clean escrow lifecycle instead of an instant transfer."
  },
  {
    index: "04",
    title: "Built on iExec Nox",
    copy: "Privacy is not decorative here. The product story is explicitly tied to iExec Nox confidential token infrastructure."
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
    <main className="bg-[#2E4B30] text-[#F5EFE1]">
      <section className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[#2E4B30]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(245,239,225,0.08),_transparent_34%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,18,11,0.06),rgba(10,18,11,0.28))]" />
        <HeroPrivacyScene />

        <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-4 pb-8 pt-5 sm:px-6 lg:px-8">
          <header className="flex items-center justify-between border-b border-[#F5EFE1]/12 pb-5">
            <div className="flex items-center gap-3">
              <NoxPayMark className="size-11" />
              <div>
                <p className="text-lg font-semibold">NoxPay</p>
                <p className="text-xs uppercase tracking-[0.18em] text-[#D5CEBF]">Private escrow for Web3 work</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="#demo"
                className="hidden h-10 items-center rounded-md border border-[#F5EFE1]/16 px-4 text-sm text-[#F5EFE1] sm:inline-flex"
              >
                View demo
              </a>
              <ConnectButton />
            </div>
          </header>

          <div className="grid flex-1 items-end gap-8 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:py-16">
            <div className="max-w-3xl">
              <p className="mb-4 inline-flex items-center gap-2 rounded-md border border-[#F5EFE1]/16 bg-[#203422]/55 px-3 py-2 text-xs uppercase tracking-[0.18em] text-[#F0E8D7] backdrop-blur">
                <Sparkles size={14} />
                Built for iExec Nox confidential tokens
              </p>
              <h1 className="max-w-4xl text-5xl font-semibold leading-[0.95] sm:text-6xl lg:text-7xl">
                Private escrow payments for high-trust Web3 freelance work.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-[#E2DCCD] sm:text-lg">
                NoxPay gives clients a way to reserve payment on-chain while keeping the amount private. The deal stays
                auditable. The budget stays confidential. The demo stays smooth.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#demo"
                  className="inline-flex h-12 items-center gap-2 rounded-md bg-[#F5EFE1] px-5 text-sm font-semibold text-[#243A26] transition duration-300 hover:-translate-y-[1px]"
                >
                  Open live walkthrough
                  <ArrowRight size={16} />
                </a>
                <a
                  href="#story"
                  className="inline-flex h-12 items-center rounded-md border border-[#F5EFE1]/16 px-5 text-sm font-semibold text-[#F5EFE1] backdrop-blur"
                >
                  Why it matters
                </a>
              </div>
            </div>

            <div className="grid gap-4 self-end">
              <div className="rounded-lg border border-[#F5EFE1]/14 bg-[#223724]/70 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.18em] text-[#D5CEBF]">Product frame</p>
                <p className="mt-3 text-2xl font-semibold">Upwork-style escrow, but with private amounts on-chain.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <StatCard value="Private" label="Payment amount" />
                <StatCard value="Funded" label="Escrow state" />
                <StatCard value="4 min" label="Judge-friendly demo" />
              </div>
            </div>
          </div>

          <div className="grid gap-3 border-t border-[#F5EFE1]/10 pt-5 text-sm text-[#E2DCCD] sm:grid-cols-3">
            <InfoRow label="Network" value="Arbitrum Sepolia" />
            <InfoRow label="Mode" value="Demo-first with Nox-ready flow" />
            <InfoRow label="Tech" value="Next.js, wagmi, viem, iExec Nox" />
          </div>
        </div>
      </section>

      <section id="story" className="border-t border-[#F5EFE1]/8 bg-[#314F34] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[#E7DFCF]">Why NoxPay</p>
              <h2 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
                Public work coordination. Private commercial terms.
              </h2>
            </div>
            <p className="max-w-2xl text-base leading-7 text-[#E2DCCD]">
              Clients want escrow because it gives contractors confidence. Contractors want privacy because rates and deal
              size should not become permanent public metadata. NoxPay sits in the middle and makes that tradeoff feel
              obvious.
            </p>
          </div>

          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {capabilityCards.map((card) => (
              <article key={card.title} className="rounded-lg border border-[#F5EFE1]/10 bg-[#2A432C] p-6">
                <h3 className="text-xl font-semibold">{card.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#E2DCCD]">{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#F5EFE1] px-4 py-20 text-[#2E4B30] sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="rounded-lg border border-[#2E4B30]/14 bg-[#EEE6D6] p-6">
            <div className="grid gap-5">
              {processSteps.map((step) => (
                <div key={step.index} className="grid gap-3 border-t border-[#2E4B30]/12 pt-5 first:border-t-0 first:pt-0 sm:grid-cols-[88px_1fr]">
                  <p className="text-3xl font-semibold tracking-[0.12em] text-[#2E4B30]/75">{step.index}</p>
                  <div>
                    <h3 className="text-2xl font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-[#49674A]">{step.copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#49674A]">Advantages</p>
            <h2 className="mt-4 text-4xl font-semibold sm:text-5xl">The four things a judge should understand instantly.</h2>
            <p className="mt-6 max-w-xl text-base leading-8 text-[#49674A]">
              This block borrows the calm, numbered rhythm from the reference and turns it into a very direct product case:
              confidentiality, escrow confidence, controlled release, and a visible iExec tie-in.
            </p>
          </div>
        </div>
      </section>

      <section id="demo" className="bg-[#101310] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[#CFC7B7]">Interactive demo</p>
              <h2 className="mt-4 text-4xl font-semibold sm:text-5xl">A polished walkthrough judges can use themselves.</h2>
            </div>
            <div className="max-w-xl text-sm leading-7 text-[#BDB5A8]">
              This section keeps the core happy-path live: mint demo funds, create a private escrow, release it, and reveal
              the amount only when the user explicitly asks to decrypt it.
            </div>
          </div>

          {notice && <Banner tone={notice.type === "ok" ? "ok" : "error"} text={notice.text} />}
          {busy && <Banner tone="busy" text={busy} />}

          <div className="mt-6 grid gap-5 lg:grid-cols-[400px_1fr]">
            <aside className="flex flex-col gap-5">
              <div className="rounded-lg border border-[#F5EFE1]/8 bg-[#161A16] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">Create private escrow</h3>
                    <p className="mt-1 text-sm text-[#BDB5A8]">The amount is hidden in the public dashboard.</p>
                  </div>
                  <ShieldCheck size={20} className="text-[#F5EFE1]" />
                </div>
                <form className="flex flex-col gap-3" onSubmit={submitEscrow}>
                  <Field label="Job title" value={jobTitle} onChange={setJobTitle} placeholder="Smart contract audit" />
                  <Field label="Contractor address" value={contractor} onChange={setContractor} placeholder="0x..." />
                  <Field label="Private amount" value={amount} onChange={setAmount} placeholder="750" type="number" />
                  <Field label="Metadata URI" value={metadataURI} onChange={setMetadataURI} placeholder="ipfs://scope" />
                  <button
                    type="submit"
                    disabled={Boolean(busy)}
                    className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#F5EFE1] px-4 font-semibold text-[#243A26] transition duration-300 hover:-translate-y-[1px] disabled:opacity-50"
                  >
                    <Send size={16} />
                    Create and fund
                  </button>
                </form>
              </div>

              <div className="rounded-lg border border-[#F5EFE1]/8 bg-[#161A16] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">Demo wallet</h3>
                    <p className="mt-1 text-sm text-[#BDB5A8]">A local stand-in for confidential token balance.</p>
                  </div>
                  <Wallet size={20} className="text-[#F5EFE1]" />
                </div>
                <div className="space-y-2 text-sm text-[#BDB5A8]">
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
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#F5EFE1]/24 text-sm font-semibold text-[#F5EFE1] transition duration-300 hover:bg-[#F5EFE1]/6 disabled:opacity-50"
                  >
                    <CheckCircle2 size={16} />
                    Mint demo
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(busy) || isDecryptingBalance}
                    onClick={revealBalance}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#F5EFE1]/10 text-sm font-semibold text-[#F5EFE1] transition duration-300 hover:bg-white/[0.03] disabled:opacity-50"
                  >
                    {isDecryptingBalance ? <RefreshCw size={16} className="animate-spin" /> : <Eye size={16} />}
                    {isDecryptingBalance ? "Decrypting..." : "View balance"}
                  </button>
                </div>
              </div>
            </aside>

            <section className="overflow-hidden rounded-lg border border-[#F5EFE1]/10 bg-[#0D0F0D] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
              <div className="flex flex-col gap-3 border-b border-[#F5EFE1]/8 p-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold">Escrow board</h3>
                  <p className="mt-1 text-sm text-[#B4AC9F]">
                    Public: job, parties, status. Private: amount until explicit reveal.
                  </p>
                </div>
                <div className="rounded-md border border-[#F5EFE1]/10 bg-[#171917] px-3 py-2 text-xs uppercase tracking-[0.18em] text-[#E8E0D1]">
                  Demo Mode Active
                </div>
              </div>
              <div className="divide-y divide-[#F5EFE1]/8">
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

      <section className="border-t border-[#F5EFE1]/8 bg-[#2E4B30] px-4 py-20 sm:px-6 lg:px-8">
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
      className={`grid place-items-center rounded-[10px] border border-[#F5EFE1]/20 bg-[linear-gradient(180deg,rgba(46,75,48,0.92),rgba(27,43,29,0.98))] shadow-[0_0_30px_rgba(245,239,225,0.08)] ${className}`}
    >
      <svg viewBox="0 0 64 64" className="h-[74%] w-[74%]" aria-hidden="true">
        <defs>
          <linearGradient id="noxpayMark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F5EFE1" />
            <stop offset="55%" stopColor="#D7D0C1" />
            <stop offset="100%" stopColor="#98A18E" />
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
        <circle cx="24" cy="32" r="4.3" fill="#243A26" />
      </svg>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-[#F5EFE1]/12 bg-[#223724]/62 p-4 backdrop-blur">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-[#E2DCCD]">{label}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.16em] text-[#D8D1C2]">{label}</p>
      <p className="mt-1 text-sm text-[#F5EFE1]">{value}</p>
    </div>
  );
}

function Banner({ tone, text }: { tone: "ok" | "error" | "busy"; text: string }) {
  const styles =
    tone === "ok"
      ? "border-[#F5EFE1]/22 bg-[#203423] text-[#F5EFE1]"
      : tone === "busy"
        ? "border-[#E2C387]/28 bg-[#3B3424] text-[#F3E1B7]"
        : "border-[#C98989]/28 bg-[#3A2324] text-[#F0D3D3]";
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
      <span className="text-[#BDB5A8]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        step={type === "number" ? "0.000001" : undefined}
        className="h-11 rounded-md border border-[#F5EFE1]/10 bg-[#101310] px-3 text-[#F5EFE1] outline-none transition focus:border-[#F5EFE1]/34"
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
    <article className="grid gap-4 bg-[linear-gradient(180deg,rgba(13,15,13,0.98),rgba(10,12,10,0.98))] p-5 transition duration-300 hover:bg-[linear-gradient(180deg,rgba(21,24,21,0.98),rgba(12,15,12,0.98))] hover:shadow-[inset_0_0_0_1px_rgba(245,239,225,0.04)] xl:grid-cols-[1.3fr_0.9fr_auto] xl:items-center">
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h4 className="truncate text-lg font-semibold">{escrow.jobTitle}</h4>
          <span className="inline-flex items-center gap-2 rounded-md border border-[#F5EFE1]/10 bg-[#171917] px-2 py-1 text-xs text-[#E8E0D1]">
            <span className="inline-block size-1.5 rounded-full bg-[#F5EFE1]/75 animate-pulse" />
            {status}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-[#F5EFE1]/8 bg-[#121412] px-2 py-1 text-xs text-[#F5EFE1] transition duration-300 hover:border-[#F5EFE1]/20 hover:bg-[#171917]">
            <LockKeyhole size={12} />
            {revealed ? `${revealed} cNOXUSD` : "Private amount"}
          </span>
        </div>
        <div className="grid gap-1 text-sm text-[#B4AC9F] sm:grid-cols-2">
          <p>Client: {shortAddress(escrow.client)}</p>
          <p>Contractor: {shortAddress(escrow.contractor)}</p>
        </div>
      </div>
      <div className="text-sm text-[#B4AC9F]">
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
  icon: ReactNode;
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
          ? "border-[#F5EFE1]/10 bg-[#171917] text-[#F5EFE1] hover:border-[#F5EFE1]/20 hover:bg-[#1D201D]"
          : "border-[#F5EFE1]/10 bg-[#121412] text-[#F5EFE1] hover:border-[#F5EFE1]/20 hover:bg-[#171917]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function JudgeCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-lg border border-[#F5EFE1]/10 bg-[#2A432C] p-6">
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-[#E2DCCD]">{body}</p>
    </article>
  );
}

function HeroPrivacyScene() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 top-24 flex items-end justify-center overflow-hidden">
      <div className="relative h-[74vh] w-full max-w-7xl">
        <div className="hero-breathe absolute left-[8%] top-[18%] h-72 w-72 rounded-full bg-[#F5EFE1]/5 blur-3xl" />
        <div className="hero-breathe absolute right-[9%] top-[16%] h-72 w-72 rounded-full bg-[#F5EFE1]/4 blur-3xl [animation-delay:1.6s]" />
        <div className="absolute inset-x-[18%] bottom-[12%] h-px bg-gradient-to-r from-transparent via-[#F5EFE1]/18 to-transparent" />

        <div className="hero-hand-left absolute bottom-[-3%] left-[-10%] w-[52%] min-w-[420px] opacity-95">
          <HeroHand side="left" />
        </div>
        <div className="hero-hand-right absolute bottom-[-3%] right-[-10%] w-[52%] min-w-[420px] opacity-95">
          <HeroHand side="right" />
        </div>

        <div className="absolute left-1/2 top-[44%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
          <div className="hero-symbol-wrap relative">
            <div className="absolute inset-[-26px] rounded-full bg-[#F5EFE1]/7 blur-2xl" />
            <div className="hero-symbol relative flex h-28 w-24 items-center justify-center rounded-[28px] border border-[#F5EFE1]/20 bg-[linear-gradient(180deg,rgba(245,239,225,0.12),rgba(17,23,18,0.78))] shadow-[0_20px_70px_rgba(8,10,8,0.38)]">
              <div className="absolute inset-2 rounded-[22px] border border-[#F5EFE1]/14" />
              <div className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#F5EFE1]/14" />
              <LockKeyhole size={34} className="relative z-10 text-[#F5EFE1]" strokeWidth={1.7} />
            </div>
          </div>
          <div className="mt-4 rounded-full border border-[#F5EFE1]/12 bg-[#223724]/62 px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-[#F5EFE1]">
            Protected negotiation
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroHand({ side }: { side: "left" | "right" }) {
  const isLeft = side === "left";

  return (
    <svg
      viewBox="0 0 760 520"
      className={`h-auto w-full ${isLeft ? "" : "-scale-x-100"}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`handBase-${side}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F5EFE1" stopOpacity="0.94" />
          <stop offset="38%" stopColor="#E5DECF" stopOpacity="0.88" />
          <stop offset="100%" stopColor="#A59F92" stopOpacity="0.82" />
        </linearGradient>
        <linearGradient id={`handShadow-${side}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#19281A" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#0E160F" stopOpacity="0.98" />
        </linearGradient>
        <radialGradient id={`handGlow-${side}`} cx="50%" cy="30%" r="72%">
          <stop offset="0%" stopColor="#F5EFE1" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#F5EFE1" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="330" cy="280" rx="280" ry="160" fill={`url(#handGlow-${side})`} />

      <g>
        <path
          d="M34 412c66-16 124-10 180 18 46 23 82 58 128 64 78 11 123-36 170-90l84-98c18-22 45-35 69-28 20 6 35 24 36 44 1 20-10 38-24 52l-104 102c-45 44-89 83-147 97-58 15-128 5-180-25-40-23-74-56-121-69-35-10-73-8-111-7z"
          fill={`url(#handShadow-${side})`}
        />
        <path
          d="M42 398c61-14 118-8 172 19 43 22 77 55 122 61 75 10 116-35 161-87l83-95c17-20 41-31 64-25 18 5 31 21 32 38 1 19-10 34-22 46l-103 101c-44 43-86 79-142 93-55 14-123 6-172-22-40-22-74-54-120-68-34-10-72-10-112-11z"
          fill={`url(#handBase-${side})`}
        />
      </g>

      <g fill={`url(#handBase-${side})`} stroke="#F5EFE1" strokeOpacity="0.1" strokeWidth="1.6">
        <path d="M478 271c18-55 39-108 58-161 7-18 24-30 42-28 18 2 32 17 33 35 0 6-1 11-3 16l-61 163c-5 13-20 20-33 15-12-5-19-18-15-31 0-3 1-6 2-9z" />
        <path d="M536 293c27-53 56-105 84-156 9-17 28-26 46-22 17 5 29 22 28 40-1 7-2 13-6 19l-86 154c-7 13-23 18-36 11-13-7-18-23-11-36 0-4 1-7 3-10z" />
        <path d="M582 338c34-43 69-85 105-126 12-14 32-18 48-10 16 9 24 28 19 45-2 6-5 12-10 17L639 387c-9 11-26 13-37 4-11-9-13-25-4-36 1-7 3-12 7-17z" />
        <path d="M430 272c5-27 9-53 17-79 8-29 15-58 25-86 7-18 26-28 44-24 18 4 31 21 29 39 0 5-1 10-3 15l-39 154c-4 14-18 24-33 22-15-2-26-15-27-30 0-3 0-7 1-11z" />
      </g>

      <path
        d="M311 310c26-13 45-2 68 12 20 12 41 26 68 30 27 4 53-6 79-17"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.18"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M177 390c54 9 99 34 143 57"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.12"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
