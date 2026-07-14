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

      const signedXdr = await signWithFreighter(xdrTx, Networks.TESTNET);
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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="PayNote logo" className="h-8 w-8 rounded-lg" />
            <span className="text-lg font-bold text-text-primary">PayNote</span>
          </div>
          <button
            onClick={() => router.back()}
            className="text-sm font-medium text-text-secondary hover:text-text-primary transition"
          >
            ← Back
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-6 py-10">
        <h1 className="text-2xl font-bold text-text-primary mb-6">Create PayNote</h1>

        <form
          onSubmit={handleCreate}
          className="rounded-2xl bg-surface border border-border p-6 shadow-sm space-y-5"
        >
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Amount
            </label>
            <input
                type="number"
                step="1"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 50"
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-text-primary focus:outline-none focus:border-brand transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Asset
            </label>
            <select
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-text-primary focus:outline-none focus:border-brand transition"
            >
              <option value="XLM">XLM</option>
              <option value="USDC">USDC</option>
              <option value="TESTUSD">TESTUSD</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this payment for?"
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-text-primary focus:outline-none focus:border-brand transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Expires
            </label>
            <input
              type="datetime-local"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-text-primary focus:outline-none focus:border-brand transition"
            />
          </div>

          {error && <p className="text-error text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-navy px-5 py-3 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create"}
          </button>
        </form>
      </main>
    </div>
  );
}