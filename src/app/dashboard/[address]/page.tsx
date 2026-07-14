"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPayNotesForAddress, getReputation, ApiError, Reputation } from "@/lib/api";
import { PayNote } from "@/lib/types";

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
      .catch(() => {
        // reputation is a nice-to-have; fail silently if it errors
      });
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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="PayNote logo" className="h-8 w-8 rounded-lg" />
            <span className="text-lg font-bold text-text-primary">PayNote</span>
          </div>

          <div className="flex items-center gap-4">
            {reputation && (
              <span className="text-xs font-medium text-text-secondary bg-accent-bg px-2 py-1 rounded-full">
                ★ {reputation.score}/100 ({reputation.paidCount} paid)
              </span>
            )}
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-lg bg-surface-hover border border-border px-3 py-2 text-sm font-medium text-text-primary hover:bg-border transition"
            >
              {copied ? "Copied!" : shortAddress}
            </button>
            <button
              onClick={handleDisconnect}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-hover transition"
            >
              Disconnect
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-text-primary">Your PayNotes</h1>
          <button
            onClick={() => router.push("/create")}
            className="rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition"
          >
            + Create PayNote
          </button>
        </div>

        {loading && (
          <div>
            <p className="text-text-secondary">Loading PayNotes...</p>
            {showSlowMessage && (
              <p className="text-text-secondary text-sm mt-2">
                First load can take up to a minute while the server wakes up. Thanks for your patience!
              </p>
            )}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl bg-surface border border-border p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-error">Something went wrong</h2>
            <p className="mt-2 text-sm text-text-secondary">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && (!payNotes || payNotes.length === 0) && (
          <div className="rounded-2xl bg-surface border border-border p-8 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-text-primary">No PayNotes yet</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Create your first PayNote to start getting paid.
            </p>
          </div>
        )}

        {!loading && !error && payNotes && payNotes.length > 0 && (
          <div className="space-y-4">
            {payNotes.map((note) => (
              
                <a key={note.id}
                href={"/pay/" + note.id}
                className="block rounded-2xl bg-surface border border-border p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-text-primary">{note.description}</p>
                    <p className="mt-1 text-sm text-text-secondary">
                      {note.amount} {note.asset}
                    </p>
                  </div>
                  <StatusBadge status={note.status} />
                </div>
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: PayNote["status"] }) {
  const styles: Record<PayNote["status"], string> = {
    paid: "bg-success-bg text-success",
    pending: "bg-pending-bg text-pending",
    expired: "bg-error-bg text-error",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${styles[status]}`}>
      {status}
    </span>
  );
}