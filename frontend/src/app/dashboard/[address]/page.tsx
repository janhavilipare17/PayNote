"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPayNotesForAddress, getReputation, ApiError, Reputation } from "@/lib/api";
import { PayNote } from "@/lib/types";
import Header from "@/components/Header";

type FilterStatus = "all" | "pending" | "paid" | "expired";

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const address = params.address as string;

  const [payNotes, setPayNotes] = useState<PayNote[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showSlowMessage, setShowSlowMessage] = useState(false);
  const [reputation, setReputation] = useState<Reputation | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [xlmBalance, setXlmBalance] = useState<string | null>(null);
  const [copiedRowId, setCopiedRowId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getPayNotesForAddress(address);
        if (!cancelled) setPayNotes(data);
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const slowTimer = setTimeout(() => {
      if (!cancelled) setShowSlowMessage(true);
    }, 4000);

    return () => {
      cancelled = true;
      clearTimeout(slowTimer);
    };
  }, [address]);

  useEffect(() => {
    getReputation(address)
      .then(setReputation)
      .catch(() => {});
  }, [address]);

  // Live wallet balance, straight from Horizon testnet — real on-chain data,
  // not just app-tracked totals.
  useEffect(() => {
    let cancelled = false;
    fetch(`https://horizon.stellar.org/accounts/${address}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const native = data.balances?.find((b: any) => b.asset_type === "native");
        if (native) setXlmBalance(Number(native.balance).toFixed(2));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [address]);

  function handleDisconnect() {
    localStorage.removeItem("walletAddress");
    router.replace("/");
  }

  function handleCopy() {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleCopyRow(e: React.MouseEvent, note: PayNote) {
    e.preventDefault();
    e.stopPropagation();
    const link = `${window.location.origin}/pay/${note.publicToken || note.id}`;
    navigator.clipboard.writeText(link);
    setCopiedRowId(note.id);
    setTimeout(() => setCopiedRowId(null), 1500);
  }

  const shortAddress = `${address.slice(0, 4)}...${address.slice(-4)}`;

  const filteredNotes = useMemo(() => {
    if (!payNotes) return [];
    const sorted = [...payNotes].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (filter === "all") return sorted;
    return sorted.filter((n) => n.status === filter);
  }, [payNotes, filter]);

  return (
    <div className="min-h-screen bg-ink font-sans relative overflow-hidden">
      <div className="absolute -top-24 -right-20 w-96 h-96 rounded-full bg-lumen/20 blur-3xl animate-float-a pointer-events-none" />
      <div className="absolute top-1/2 -left-28 w-80 h-80 rounded-full bg-mint/15 blur-3xl animate-float-b pointer-events-none" />
      <div className="absolute -bottom-28 right-1/4 w-72 h-72 rounded-full bg-amber-ink/10 blur-3xl animate-float-c pointer-events-none" />

      <div className="relative z-10">
      <Header
        right={
          <div className="flex items-center gap-3">
            {reputation && (
              <span className="font-mono text-xs text-mint bg-mint-bg border border-mint/20 px-2.5 py-1 rounded-md">
                {reputation.score}/100 · {reputation.paidCount} paid
              </span>
            )}
            <button
              onClick={handleCopy}
              className="font-mono flex items-center gap-2 rounded-md bg-ink-surface border border-ink-line px-3 py-2 text-xs text-ink-text hover:border-lumen/50 transition"
            >
              {copied ? "copied" : shortAddress}
            </button>
            <button
              onClick={handleDisconnect}
              className="rounded-md border border-ink-line px-3 py-2 text-xs text-ink-text-secondary hover:text-ink-text hover:bg-ink-surface transition"
            >
              Disconnect
            </button>
          </div>
        }
      />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="font-mono text-xs tracking-widest text-lumen uppercase mb-2">
              Ledger · {shortAddress}
            </p>
            <h1 className="font-display text-3xl font-semibold text-ink-text tracking-tight">
              Your PayNotes
            </h1>
          </div>
          <button
            onClick={() => router.push("/create")}
            className="rounded-md bg-lumen px-5 py-2.5 text-sm font-medium text-ink hover:bg-lumen-dim transition"
          >
            + New PayNote
          </button>
        </div>

        {!loading && !error && payNotes && payNotes.length > 0 && (
          <>
            <WalletBalanceCard balance={xlmBalance} payNotes={payNotes} />
            <LedgerSummary payNotes={payNotes} />
            <ActivitySparkline payNotes={payNotes} />
            <FilterBar filter={filter} setFilter={setFilter} payNotes={payNotes} />
          </>
        )}

        {loading && (
          <div className="border border-ink-line rounded-lg p-8 bg-ink-surface">
            <p className="text-ink-text-secondary text-sm">Reading the chain...</p>
            {showSlowMessage && (
              <p className="text-ink-text-secondary text-xs mt-2">
                First load can take up to a minute while the server wakes up.
              </p>
            )}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg bg-ink-surface border border-rust/30 p-8">
            <h2 className="font-display text-lg font-semibold text-rust">Something went wrong</h2>
            <p className="mt-2 text-sm text-ink-text-secondary">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-md bg-lumen px-4 py-2 text-sm font-medium text-ink hover:bg-lumen-dim transition"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && (!payNotes || payNotes.length === 0) && (
          <div className="rounded-lg bg-ink-surface border border-ink-line border-dashed p-10 text-center">
            <h2 className="font-display text-lg font-semibold text-ink-text">
              The ledger is empty
            </h2>
            <p className="mt-2 text-sm text-ink-text-secondary">
              Create your first PayNote to start getting paid on-chain.
            </p>
          </div>
        )}

        {!loading && !error && payNotes && payNotes.length > 0 && (
          <div className="relative border-l border-ink-line pl-6 mt-6">
            {filteredNotes.length === 0 ? (
              <p className="text-ink-text-secondary text-sm py-6">
                No PayNotes match this filter.
              </p>
            ) : (
              filteredNotes.map((note) => (
                <LedgerRow
                  key={note.id}
                  note={note}
                  copied={copiedRowId === note.id}
                  onCopy={(e) => handleCopyRow(e, note)}
                />
              ))
            )}
          </div>
        )}
      </main>
      </div>
    </div>
  );
}

function WalletBalanceCard({
  balance,
  payNotes,
}: {
  balance: string | null;
  payNotes: PayNote[];
}) {
  const totalRequested = payNotes.reduce((sum, n) => sum + Number(n.amount || 0), 0);
  const totalReceived = payNotes
    .filter((n) => n.status === "paid")
    .reduce((sum, n) => sum + Number(n.paidAmount || n.amount || 0), 0);

  return (
    <div className="grid grid-cols-3 gap-3 mb-3">
      <div className="rounded-lg bg-ink-surface border border-lumen/30 p-5">
        <p className="text-xs text-ink-text-secondary uppercase tracking-wide">Wallet Balance</p>
        <p className="font-mono text-xl font-semibold text-lumen mt-1">
          {balance !== null ? `${balance} XLM` : "..."}
        </p>
      </div>
      <div className="rounded-lg bg-ink-surface border border-ink-line p-5">
        <p className="text-xs text-ink-text-secondary uppercase tracking-wide">Total Requested</p>
        <p className="font-mono text-xl font-semibold text-ink-text mt-1">
          {totalRequested.toFixed(2)}
        </p>
      </div>
      <div className="rounded-lg bg-ink-surface border border-ink-line p-5">
        <p className="text-xs text-ink-text-secondary uppercase tracking-wide">Total Received</p>
        <p className="font-mono text-xl font-semibold text-mint mt-1">
          {totalReceived.toFixed(2)}
        </p>
      </div>
    </div>
  );
}

function LedgerSummary({ payNotes }: { payNotes: PayNote[] }) {
  const paid = payNotes.filter((n) => n.status === "paid").length;
  const pending = payNotes.filter((n) => n.status === "pending").length;
  const total = payNotes.length;

  return (
    <div className="flex items-stretch rounded-lg border border-ink-line bg-ink-surface overflow-hidden mb-3">
      <SummaryCell label="Total" value={total} />
      <div className="w-px bg-ink-line" />
      <SummaryCell label="Paid" value={paid} valueClass="text-mint" />
      <div className="w-px bg-ink-line" />
      <SummaryCell label="Pending" value={pending} valueClass="text-amber-ink" />
    </div>
  );
}

function SummaryCell({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: number;
  valueClass?: string;
}) {
  return (
    <div className="flex-1 px-6 py-5">
      <p className="text-xs text-ink-text-secondary uppercase tracking-wide">{label}</p>
      <p className={`font-mono text-2xl font-semibold mt-1 ${valueClass ?? "text-ink-text"}`}>
        {value}
      </p>
    </div>
  );
}

// Simple sparkline: count of PayNotes created per day, last 7 days.
function ActivitySparkline({ payNotes }: { payNotes: PayNote[] }) {
  const days = 7;
  const counts: number[] = new Array(days).fill(0);
  const now = new Date();

  for (const note of payNotes) {
    const created = new Date(note.createdAt);
    const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays < days) {
      counts[days - 1 - diffDays]++;
    }
  }

  const max = Math.max(...counts, 1);
  const width = 280;
  const height = 40;
  const step = width / (days - 1);
  const points = counts
    .map((c, i) => `${i * step},${height - (c / max) * (height - 6) - 3}`)
    .join(" ");

  return (
    <div className="rounded-lg bg-ink-surface border border-ink-line p-5 mb-6 flex items-center justify-between">
      <div>
        <p className="text-xs text-ink-text-secondary uppercase tracking-wide">Activity, last 7 days</p>
        <p className="font-mono text-sm text-ink-text mt-1">
          {counts.reduce((a, b) => a + b, 0)} PayNotes created
        </p>
      </div>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <polyline
          points={points}
          fill="none"
          stroke="var(--color-lumen)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function FilterBar({
  filter,
  setFilter,
  payNotes,
}: {
  filter: FilterStatus;
  setFilter: (f: FilterStatus) => void;
  payNotes: PayNote[];
}) {
  const counts = {
    all: payNotes.length,
    pending: payNotes.filter((n) => n.status === "pending").length,
    paid: payNotes.filter((n) => n.status === "paid").length,
    expired: payNotes.filter((n) => n.status === "expired").length,
  };

  const options: { key: FilterStatus; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "paid", label: "Paid" },
    { key: "expired", label: "Expired" },
  ];

  return (
    <div className="flex gap-2 mb-2">
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => setFilter(opt.key)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium font-mono border transition ${
            filter === opt.key
              ? "bg-lumen text-ink border-lumen"
              : "bg-ink-surface text-ink-text-secondary border-ink-line hover:text-ink-text"
          }`}
        >
          {opt.label} ({counts[opt.key]})
        </button>
      ))}
    </div>
  );
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function LedgerRow({
  note,
  copied,
  onCopy,
}: {
  note: PayNote;
  copied: boolean;
  onCopy: (e: React.MouseEvent) => void;
}) {
  const tickColor =
    note.status === "paid" ? "bg-mint" : note.status === "expired" ? "bg-rust" : "bg-amber-ink";

  return (
    <a
      href={"/pay/" + (note.publicToken || note.id)}
      title={new Date(note.createdAt).toLocaleString()}
      className="relative block py-5 border-b border-ink-line last:border-b-0 group"
    >
      <span
        className={`absolute -left-[27px] top-6 w-2 h-2 rounded-full ${tickColor} ${
          note.status === "pending" ? "animate-pulse" : ""
        }`}
      />
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-ink-text font-medium truncate">{note.description}</p>
          <p className="font-mono text-sm text-ink-text-secondary mt-1">
            {note.amount} {note.asset} · #{note.id} · {timeAgo(note.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onCopy}
            className="rounded-md border border-ink-line px-2 py-1.5 text-ink-text-secondary hover:text-ink-text hover:border-lumen/50 transition"
            title="Copy payment link"
          >
            {copied ? (
              <span className="text-[10px] font-mono px-1">copied</span>
            ) : (
              <CopyIcon />
            )}
          </button>
          <Stamp status={note.status} />
        </div>
      </div>
    </a>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function Stamp({ status }: { status: PayNote["status"] }) {
  const config = {
    paid: { label: "PAID", color: "text-mint", border: "border-mint" },
    pending: { label: "PENDING", color: "text-amber-ink", border: "border-amber-ink" },
    expired: { label: "EXPIRED", color: "text-rust", border: "border-rust" },
  }[status];

  return (
    <span
      className={`font-mono text-[10px] tracking-widest font-bold px-2.5 py-1 rounded border-2 border-double -rotate-3 ${config.color} ${config.border} shrink-0`}
    >
      {config.label}
    </span>
  );
}