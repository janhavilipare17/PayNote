"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { PayNote } from "@/lib/types";
import { getPayNote, getReputation, ApiError, Reputation } from "@/lib/api";
import { connectWallet, getConnectedAddress, signWithFreighter } from "@/lib/wallet";
import { buildPaymentTransaction, submitSignedTransaction } from "@/lib/buildPayment";
import { Networks } from "@stellar/stellar-sdk";
import { QRCodeSVG } from "qrcode.react";
import Header from "@/components/Header";

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
        // Force a fresh on-chain check first, then read the result
        await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "https://paynote-backend.onrender.com"}/api/paynotes/${id}/recheck`, {
          method: "POST",
        });
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
  const isOwner = walletAddress === note.creatorAddress;
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

        <ShareRow note={note} copied={copied} onCopy={handleCopyLink} />

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
        ) : isOwner ? (
          <div className="bg-accent-bg text-brand rounded-lg px-4 py-3 text-sm font-medium text-center">
            This is your PayNote. Share the link or QR code with your client to get paid.
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

function ShareRow({
  note,
  copied,
  onCopy,
}: {
  note: PayNote;
  copied: boolean;
  onCopy: () => void;
}) {
  const link = typeof window !== "undefined" ? window.location.href : "";
  const message = `Payment request: ${note.amount} ${note.asset} for "${note.description}". Pay here: ${link}`;

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(message)}`;
  const emailHref = `mailto:?subject=${encodeURIComponent(
    `Payment request: ${note.amount} ${note.asset}`
  )}&body=${encodeURIComponent(message)}`;

  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
      <button
        onClick={onCopy}
        className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-primary hover:bg-surface-hover transition"
      >
        <CopyIcon />
        {copied ? "Copied!" : "Copy Link"}
      </button>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-primary hover:bg-surface-hover transition"
      >
        <WhatsAppIcon />
        WhatsApp
      </a>
      <a
        href={emailHref}
        className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-primary hover:bg-surface-hover transition"
      >
        <EmailIcon />
        Email
      </a>
    </div>
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

function WhatsAppIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2Zm0 18.11c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.27-4.34c0-4.51 3.67-8.18 8.19-8.18 4.51 0 8.18 3.67 8.18 8.18 0 4.52-3.67 8.2-8.11 8.2Zm4.48-6.13c-.25-.12-1.45-.72-1.67-.8-.22-.08-.39-.12-.55.12-.16.25-.63.8-.78.96-.14.16-.29.18-.53.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.23-1.46-1.37-1.7-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.43.06-.65.31-.22.25-.86.84-.86 2.04 0 1.2.88 2.36 1 2.52.12.16 1.72 2.62 4.16 3.68.58.25 1.04.4 1.39.51.58.19 1.11.16 1.53.1.47-.07 1.45-.59 1.65-1.17.2-.57.2-1.06.14-1.17-.06-.1-.22-.16-.47-.28Z"/>
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 6 10-6" />
    </svg>
  );
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
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center p-6">
        {children}
      </main>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-8 shadow-sm max-w-sm w-full">
      {children}
    </div>
  );
}