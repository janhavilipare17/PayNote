"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { connectWallet } from "@/lib/wallet";
import { getStoredWalletAddress, storeWalletAddress } from "@/lib/wallet";
import Header from "@/components/Header";

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
      <div className="min-h-screen flex items-center justify-center bg-ink">
        <p className="text-ink-text-secondary">Loading...</p>
      </div>
    );
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
            onClick={handleConnect}
            disabled={connecting}
            className="rounded-md bg-lumen px-5 py-2.5 text-sm font-semibold text-ink hover:bg-lumen-dim transition disabled:opacity-50"
          >
            {connecting ? "Connecting..." : "Connect Wallet"}
          </button>
        }
      />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-ink-surface border border-lumen/30 px-3 py-1.5 text-sm font-medium text-lumen font-mono">
              <span>✦</span> Built on Stellar Protocol
            </div>

            <h1 className="mt-5 font-display text-5xl font-bold leading-tight text-ink-text tracking-tight">
              Send and receive payments on Stellar
            </h1>

            <p className="mt-5 max-w-md text-ink-text-secondary">
              PayNote bridges traditional finance and blockchain speed. Manage assets, settle transactions instantly, and experience the future of digital liquidity with institutional-grade security.
            </p>

            <div className="mt-8 flex items-center gap-6">
              <a href="https://www.freighter.app/" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-lumen hover:underline">
                New to Stellar? Get Freighter wallet →
              </a>
            </div>

            {error && <p className="text-rust text-sm mt-3">{error}</p>}
          </div>

          {/* Right column - stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 rounded-lg bg-ink-surface/80 backdrop-blur-sm p-6 border border-ink-line shadow-xl shadow-black/20 hover:border-lumen/40 transition">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-lumen text-ink shadow-lg shadow-lumen/30">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="6" width="20" height="12" rx="2" />
                    <path d="M2 10h20" />
                  </svg>
                </div>
                <span className="rounded-full bg-mint-bg border border-mint/20 px-2.5 py-1 text-xs font-semibold text-mint font-mono">
                  +12.4%
                </span>
              </div>
              <p className="mt-4 text-sm text-ink-text-secondary">Total Assets</p>
              <p className="font-mono text-2xl font-bold text-ink-text">$24,592.00</p>
            </div>

            <div className="rounded-lg bg-ink-surface/80 backdrop-blur-sm p-5 border border-ink-line shadow-xl shadow-black/20">
              <div className="flex items-center gap-1.5 text-sm font-medium text-ink-text">
                <span className="h-2 w-2 rounded-full bg-lumen animate-pulse" />
                Active Node
              </div>
              <svg className="mt-4" width="100%" height="40" viewBox="0 0 120 40" fill="none">
                <path
                  d="M0 35 L20 28 L40 30 L60 15 L80 20 L100 5 L120 10"
                  stroke="var(--color-lumen)"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
            </div>

            <div className="flex flex-col items-center justify-center rounded-lg bg-ink-surface/60 backdrop-blur-sm border border-lumen/30 p-5 text-center shadow-xl shadow-lumen/10">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-lumen shadow-lg shadow-lumen/40">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink)" strokeWidth="2">
                  <circle cx="12" cy="12" r="2" />
                  <path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M19.1 4.9l-2.8 2.8M7.7 16.3l-2.8 2.8" />
                </svg>
              </div>
              <p className="mt-3 text-sm font-medium text-ink-text font-mono">Stellar Network Live</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why section */}
      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h2 className="font-display text-3xl font-bold text-ink-text">Why Institutional Tech?</h2>
        <p className="mt-3 text-ink-text-secondary">
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
          className="rounded-md bg-lumen px-6 py-3 text-sm font-semibold text-ink hover:bg-lumen-dim transition disabled:opacity-50"
        >
          {connecting ? "Connecting..." : "Connect Wallet"}
        </button>
      </section>
      </div>
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
    <div className="rounded-lg border border-ink-line bg-ink-surface/70 backdrop-blur-sm p-6 shadow-lg shadow-black/10 hover:border-lumen/40 hover:shadow-lumen/10 transition">
      <div className="flex h-11 w-11 items-center justify-center rounded-md bg-ink text-lumen border border-lumen/20">
        {icon}
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold text-ink-text">{title}</h3>
      <p className="mt-2 text-sm text-ink-text-secondary">{description}</p>
    </div>
  );
}