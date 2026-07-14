"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { PayNote } from "@/lib/types";
import { getPayNote, getReputation, ApiError, Reputation } from "@/lib/api";
import { connectWallet, getConnectedAddress, signWithFreighter } from "@/lib/wallet";
import { buildPaymentTransaction, submitSignedTransaction } from "@/lib/buildPayment";
import { Networks } from "@stellar/stellar-sdk";
import { QRCodeSVG } from "qrcode.react";

type PageState = "loading" | "ready" | "not-found" | "error";
type PayState = "idle" | "connecting" | "building" | "signing" | "submitting" | "polling" | "done" | "failed";

export default function PayPage() {
  const params = useParams();
  const id = params.id as string;

  const [note, setNote] = useState<PayNote | null>(null);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [showSlowMessage, setShowSlowMessage] = useState(false);

  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [payState, setPayState] = useState<PayState>("idle");
  const [payError, setPayError] = useState("");
  const [copied, setCopied] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const [reputation, setReputation] = useState<Reputation | null>(null);

  const loadNote = useCallback(async () => {
    try {
      const data = await getPayNote(id);
      setNote(data);
      setPageState("ready");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setPageState("not-found");
      } else {
        setErrorMessage(
          err instanceof Error ? err.message : "Something went wrong."
        );
        setPageState("error");
      }
    }
  }, [id]);

  useEffect(() => {
    loadNote();
    const slowTimer = setTimeout(() => setShowSlowMessage(true), 4000);
    return () => clearTimeout(slowTimer);
  }, [loadNote]);

  useEffect(() => {
    getConnectedAddress().then((addr: string | null) => {
      if (addr) setWalletAddress(addr);
    });
  }, []);

  // Fetch reputation for the creator once the PayNote loads
  useEffect(() => {
    if (!note) return;
    getReputation(note.creatorAddress)
      .then(setReputation)
      .catch(() => {
        // reputation is a nice-to-have; fail silently if it errors
      });
  }, [note]);

  // Poll for payment status once we've submitted
  useEffect(() => {
    if (payState !== "polling" || !note) return;
    const interval = setInterval(async () => {
      try {
        const updated = await getPayNote(id);
        if (updated.status === "paid") {
          setNote(updated);
          setPayState("done");
          clearInterval(interval);
        }
      } catch {
        // ignore transient polling errors, keep trying
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [payState, note, id]);

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleConnect() {
    setPayError("");
    setPayState("connecting");
    try {
      const address = await connectWallet();
      setWalletAddress(address);
      setPayState("idle");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not connect wallet.";
      if (message.toLowerCase().includes("freighter")) {
        setPayError("Freighter wallet not detected. Please install the Freighter browser extension to continue.");
      } else {
        setPayError(message);
      }
      setPayState("failed");
    }
  }

  async function handlePay() {
    if (!note || !walletAddress) return;
    setPayError("");
    try {
      setPayState("building");
      const xdr = await buildPaymentTransaction({
        payerAddress: walletAddress,
        destinationAddress: note.creatorAddress,
        amount: note.amount,
        assetCode: note.asset,
        assetIssuer: note.assetIssuer,
        memoText: note.id,
      });

      setPayState("signing");
      const signedXdr = await signWithFreighter(xdr, Networks.TESTNET);

      setPayState("submitting");
      const result = await submitSignedTransaction(signedXdr);
      if (result && typeof result === "object" && "hash" in result) {
        setTxHash((result as { hash: string }).hash);
      }

      setPayState("polling");
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Payment failed.");
      setPayState("failed");
    }
  }

  if (pageState === "loading") {
    return (
      <Centered>
        <p className="text-text-secondary">Loading PayNote...</p>
        {showSlowMessage && (
          <p className="text-text-secondary text-sm mt-2 text-center max-w-xs">
            First load can take up to a minute while the server wakes up. Thanks for your patience!
          </p>
        )}
      </Centered>
    );
  }

  if (pageState === "not-found") {
    return (
      <Centered>
        <Card>
          <p className="text-error font-medium">PayNote not found</p>
          <p className="text-text-secondary text-sm mt-2">
            This link may be invalid or expired.
          </p>
        </Card>
      </Centered>
    );
  }

  if (pageState === "error") {
    return (
      <Centered>
        <Card>
          <p className="text-error font-medium">Something went wrong</p>
          <p className="text-text-secondary text-sm mt-2">{errorMessage}</p>
          <button
            onClick={() => {
              setPageState("loading");
              loadNote();
            }}
            className="mt-4 bg-navy text-white px-4 py-2 rounded-lg text-sm"
          >
            Try again
          </button>
        </Card>
      </Centered>
    );
  }

  if (!note) return null;

  const alreadyPaid = note.status === "paid" || payState === "done";
  const isExpired = note.status === "expired" && !alreadyPaid;
  const shortCreator = `${note.creatorAddress.slice(0, 4)}...${note.creatorAddress.slice(-4)}`;

  return (
    <Centered>
      <Card>
        <div className="flex items-center justify-between mb-2">
          <span className="text-text-secondary text-sm">PayNote #{note.id}</span>
          <StatusBadge status={alreadyPaid ? "paid" : note.status} />
        </div>

        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-text-secondary">To: {shortCreator}</span>
          {reputation && <ReputationBadge reputation={reputation} />}
        </div>

        <h1 className="text-3xl font-bold text-text-primary">
          {note.amount} {note.asset}
        </h1>
        <p className="text-text-secondary mt-1">{note.description}</p>

        {!isExpired && !alreadyPaid && (
          <div className="flex justify-center my-4">
            <div className="p-3 bg-white rounded-lg border border-border">
              <QRCodeSVG value={typeof window !== "undefined" ? window.location.href : ""} size={140} />
            </div>
          </div>
        )}

        <button
          onClick={handleCopyLink}
          className="text-sm font-medium text-brand hover:underline mt-3 block text-center"
        >
          {copied ? "Copied!" : "Copy Link"}
        </button>

        <div className="border-t border-border my-6" />

        {alreadyPaid ? (
          <div>
            <div className="bg-success-bg text-success rounded-lg px-4 py-3 text-sm font-medium">
              ✓ Payment received. Thank you!
            </div>
            {txHash && (
              
                <a href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-brand hover:underline mt-3 block text-center"
              >
                View transaction on Stellar Expert →
              </a>
            )}
          </div>
        ) : isExpired ? (
          <div className="bg-surface-hover border border-border text-text-secondary rounded-lg px-4 py-3 text-sm font-medium text-center">
            This PayNote has expired and can no longer be paid.
          </div>
        ) : !walletAddress ? (
          <button
            onClick={handleConnect}
            disabled={payState === "connecting"}
            className="w-full bg-navy text-white font-medium px-5 py-3 rounded-lg hover:opacity-90 transition disabled:opacity-50"
          >
            {payState === "connecting" ? "Connecting..." : "Connect Wallet to Pay"}
          </button>
        ) : (
          <button
            onClick={handlePay}
            disabled={["building", "signing", "submitting", "polling"].includes(payState)}
            className="w-full bg-navy text-white font-medium px-5 py-3 rounded-lg hover:opacity-90 transition disabled:opacity-50"
          >
            {payButtonLabel(payState)}
          </button>
        )}

        {payError && (
          <p className="text-error text-sm mt-3">{payError}</p>
        )}

        {walletAddress && !alreadyPaid && !isExpired && (
          <p className="text-text-secondary text-xs mt-4 text-center">
            Connected: {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}{" "}
            <button
              onClick={handleConnect}
              className="text-brand hover:underline font-medium"
            >
              Switch Wallet
            </button>
          </p>
        )}
      </Card>
    </Centered>
  );
}

function payButtonLabel(state: PayState) {
  switch (state) {
    case "building": return "Preparing transaction...";
    case "signing": return "Confirm in Freighter...";
    case "submitting": return "Submitting...";
    case "polling": return "Waiting for confirmation...";
    default: return "Pay Now";
  }
}

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "paid"
      ? "bg-success-bg text-success"
      : status === "expired"
      ? "bg-error-bg text-error"
      : "bg-pending-bg text-pending";
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles}`}>
      {status}
    </span>
  );
}

function ReputationBadge({ reputation }: { reputation: Reputation }) {
  return (
    <span className="text-xs font-medium text-text-secondary bg-accent-bg px-2 py-1 rounded-full">
      ★ {reputation.score}/100 ({reputation.paidCount} paid)
    </span>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      {children}
    </main>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-8 shadow-sm max-w-sm w-full">
      {children}
    </div>
  );
}