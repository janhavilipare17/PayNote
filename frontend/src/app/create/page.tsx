
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredWalletAddress, signWithFreighter } from "@/lib/wallet";
import {
  buildCreatePayNoteTransaction,
  submitCreatePayNoteTransaction,
} from "@/lib/buildCreatePayNote";
import { syncPayNote } from "@/lib/api";
import { Networks } from "@stellar/stellar-sdk";
import Header from "@/components/Header";

export default function CreatePayNotePage() {
  const router = useRouter();

  const [amount, setAmount] = useState("");
  const [asset, setAsset] = useState("XLM");
  const [description, setDescription] = useState("");
  const [expiry, setExpiry] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const walletAddress = getStoredWalletAddress();
    if (!walletAddress) {
      setError("No wallet connected. Please connect your wallet first.");
      return;
    }
    if (!amount || !description || !expiry) {
      setError("Please fill in all fields.");
      return;
    }

    setSubmitting(true);
    try {
      const expiresAtSeconds = Math.floor(new Date(expiry).getTime() / 1000);

      const xdrTx = await buildCreatePayNoteTransaction({
        creatorAddress: walletAddress,
        amount,
        asset,
        description,
        expiresAt: expiresAtSeconds,
      });

      const signedXdr = await signWithFreighter(xdrTx, Networks.PUBLIC);
      const newId = await submitCreatePayNoteTransaction(signedXdr);
      await syncPayNote(newId);

      router.push(`/dashboard/${walletAddress}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink relative overflow-hidden">
      <div className="absolute -top-24 -right-20 w-96 h-96 rounded-full bg-lumen/20 blur-3xl animate-float-a pointer-events-none" />
      <div className="absolute top-1/2 -left-28 w-80 h-80 rounded-full bg-mint/15 blur-3xl animate-float-b pointer-events-none" />
      <div className="absolute -bottom-28 right-1/4 w-72 h-72 rounded-full bg-amber-ink/10 blur-3xl animate-float-c pointer-events-none" />

      <div className="relative z-10">
        <Header
          right={
            <button
              onClick={() => router.back()}
              className="text-sm font-medium text-ink-text-secondary hover:text-ink-text transition"
            >
              ← Back
            </button>
          }
        />

        <main className="mx-auto max-w-lg px-6 py-10">
          <p className="font-mono text-xs tracking-widest text-lumen uppercase mb-2">
            New Entry
          </p>
          <h1 className="font-display text-2xl font-bold text-ink-text mb-6">Create PayNote</h1>

          <form
            onSubmit={handleCreate}
            className="rounded-xl bg-ink-surface/80 backdrop-blur-sm border border-ink-line p-6 space-y-5 shadow-2xl shadow-black/30"
          >
            <div>
              <label className="block text-sm font-medium text-ink-text mb-1.5">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-text-secondary font-mono text-sm pointer-events-none">
                  #
                </span>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full rounded-md border border-ink-line bg-ink pl-8 pr-4 py-2.5 text-ink-text font-mono focus:outline-none focus:border-lumen focus:ring-2 focus:ring-lumen/20 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-text mb-1.5">
                Asset
              </label>
              <select
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
                className="w-full rounded-md border border-ink-line bg-ink px-4 py-2.5 text-ink-text font-mono focus:outline-none focus:border-lumen focus:ring-2 focus:ring-lumen/20 transition"
              >
                <option value="XLM">XLM</option>
                <option value="TESTUSD">TESTUSD</option>
                <option value="TESTEUR">TESTEUR</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-text mb-1.5">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this payment for?"
                className="w-full rounded-md border border-ink-line bg-ink px-4 py-2.5 text-ink-text focus:outline-none focus:border-lumen focus:ring-2 focus:ring-lumen/20 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-text mb-1.5">
                Expires
              </label>
              <input
                type="datetime-local"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="w-full rounded-md border border-ink-line bg-ink px-4 py-2.5 text-ink-text font-mono focus:outline-none focus:border-lumen focus:ring-2 focus:ring-lumen/20 transition"
              />
            </div>

            {error && <p className="text-rust text-sm">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-lumen px-5 py-3 text-sm font-semibold text-ink hover:bg-lumen-dim transition disabled:opacity-50 shadow-lg shadow-lumen/20"
            >
              {submitting ? "Creating..." : "Create"}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
