"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPayNotesForAddress, getReputation, ApiError, Reputation } from "@/lib/api";
import { PayNote } from "@/lib/types";
import Header from "@/components/Header";

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

  function handleDisconnect() {
    localStorage.removeItem("walletAddress");
    router.replace("/");
  }

  function handleCopy() {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const shortAddress = `${address.slice(0, 4)}...${address.slice(-4)}`;

  return (
    <div className="min-h-screen bg-ink font-sans">
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
          <LedgerSummary payNotes={payNotes} />
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
          <div className="relative border-l border-ink-line pl-6 mt-8">
            {payNotes.map((note) => (
              <LedgerRow key={note.id} note={note} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function LedgerSummary({ payNotes }: { payNotes: PayNote[] }) {
  const paid = payNotes.filter((n) => n.status === "paid").length;
  const pending = payNotes.filter((n) => n.status === "pending").length;
  const total = payNotes.length;

  return (
    <div className="flex items-stretch rounded-lg border border-ink-line bg-ink-surface overflow-hidden mb-2">
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

function LedgerRow({ note }: { note: PayNote }) {
  const tickColor =
    note.status === "paid" ? "bg-mint" : note.status === "expired" ? "bg-rust" : "bg-amber-ink";

  return (
    <a
      href={"/pay/" + note.id}
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
            {note.amount} {note.asset} · #{note.id}
          </p>
        </div>
        <Stamp status={note.status} />
      </div>
    </a>
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