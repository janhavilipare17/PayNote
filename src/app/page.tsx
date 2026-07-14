"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { connectWallet } from "@/lib/wallet";
import { getStoredWalletAddress, storeWalletAddress } from "@/lib/wallet";

export default function Home() {
  const router = useRouter();
  const [checkingStorage, setCheckingStorage] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = getStoredWalletAddress();
    if (stored) {
      router.replace(`/dashboard/${stored}`);
    } else {
      setCheckingStorage(false);
    }
  }, [router]);

  async function handleConnect() {
    setError("");
    setConnecting(true);
    try {
      const address = await connectWallet();
      storeWalletAddress(address);
      router.replace(`/dashboard/${address}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect wallet.");
      setConnecting(false);
    }
  }

  if (checkingStorage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-text-secondary">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      {/* Navbar */}
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="PayNote logo" className="h-8 w-8 rounded-lg" />
            <span className="text-lg font-bold text-text-primary">PayNote</span>
          </div>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-50"
          >
            {connecting ? "Connecting..." : "Connect Wallet"}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          {/* Left column */}
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-accent-bg px-3 py-1.5 text-sm font-medium text-brand">
              <span>✦</span> Built on Stellar Protocol
            </div>

            <h1 className="mt-5 text-5xl font-bold leading-tight text-text-primary">
              Send and receive payments on Stellar
            </h1>

            <p className="mt-5 max-w-md text-text-secondary">
              PayNote bridges traditional finance and blockchain speed. Manage assets, settle transactions instantly, and experience the future of digital liquidity with institutional-grade security.
            </p>

            <div className="mt-8 flex items-center gap-6">
              <a href="https://www.freighter.app/" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand hover:underline">
                New to Stellar? Get Freighter wallet →
              </a>
            </div>

            {error && <p className="text-error text-sm mt-3">{error}</p>}
          </div>

          {/* Right column - stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 rounded-2xl bg-surface p-6 shadow-sm border border-border">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy text-white">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="6" width="20" height="12" rx="2" />
                    <path d="M2 10h20" />
                  </svg>
                </div>
                <span className="rounded-full bg-success-bg px-2.5 py-1 text-xs font-semibold text-success">
                  +12.4%
                </span>
              </div>
              <p className="mt-4 text-sm text-text-secondary">Total Assets</p>
              <p className="text-2xl font-bold text-text-primary">$24,592.00</p>
            </div>

            <div className="rounded-2xl bg-surface p-5 shadow-sm border border-border">
              <div className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
                <span className="h-2 w-2 rounded-full bg-brand" />
                Active Node
              </div>
              <svg className="mt-4" width="100%" height="40" viewBox="0 0 120 40" fill="none">
                <path
                  d="M0 35 L20 28 L40 30 L60 15 L80 20 L100 5 L120 10"
                  stroke="#2563eb"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
            </div>

            <div className="flex flex-col items-center justify-center rounded-2xl bg-navy p-5 text-center text-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="2" />
                  <path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M19.1 4.9l-2.8 2.8M7.7 16.3l-2.8 2.8" />
                </svg>
              </div>
              <p className="mt-3 text-sm font-medium">Stellar Network Live</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why section */}
      {/* Why section */}
      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h2 className="text-3xl font-bold text-text-primary">Why Institutional Tech?</h2>
        <p className="mt-3 text-text-secondary">
          We provide the infrastructure for next-generation financial services, combining the trust of traditional banks with Stellar&apos;s efficiency.
        </p>
      </section>

      {/* Feature grid */}
      <section className="mx-auto max-w-6xl px-6 pb-6">
        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard
            title="Instant Settlement"
            description="Payments confirm in seconds, not days, on the Stellar network."
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
              </svg>
            }
          />
          <FeatureCard
            title="Enterprise Security"
            description="Wallet-based signing keeps every transaction verifiable and safe."
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4z" />
              </svg>
            }
          />
          <FeatureCard
            title="Multi-Asset Support"
            description="Invoice and get paid in any asset issued on Stellar."
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M9 12h6M12 9v6" />
              </svg>
            }
          />
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-20 text-center">
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="rounded-lg bg-navy px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-50"
        >
          {connecting ? "Connecting..." : "Connect Wallet"}
        </button>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-bg text-brand">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-text-primary">{title}</h3>
      <p className="mt-2 text-sm text-text-secondary">{description}</p>
    </div>
  );
}