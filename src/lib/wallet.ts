// src/lib/wallet.ts
import {
  isConnected,
  isAllowed,
  setAllowed,
  requestAccess,
  getAddress,
  signTransaction,
} from "@stellar/freighter-api";

export async function isFreighterInstalled(): Promise<boolean> {
  const result = await isConnected();
  return result.isConnected;
}

export async function connectWallet(): Promise<string> {
  const installed = await isFreighterInstalled();
  if (!installed) {
    throw new Error(
      "Freighter wallet not found. Please install the Freighter browser extension."
    );
  }

  // requestAccess() itself prompts the user for permission if needed and
  // waits for their response — checking isAllowed/setAllowed separately
  // beforehand caused a race condition where the first click could fail
  // before the user had finished approving in the popup.
  const accessResult = await requestAccess();
  if (accessResult.error) {
    throw new Error(accessResult.error);
  }

  return accessResult.address;
}

export async function getConnectedAddress(): Promise<string | null> {
  const allowedCheck = await isAllowed();
  if (!allowedCheck.isAllowed) return null;

  const result = await getAddress();
  if (result.error) return null;
  return result.address;
}

export async function signWithFreighter(
  xdr: string,
  networkPassphrase: string
): Promise<string> {
  const result = await signTransaction(xdr, { networkPassphrase });
  if (result.error) {
    throw new Error(result.error);
  }
  return result.signedTxXdr;
}

// --- Wallet persistence helpers ---
const STORAGE_KEY = "walletAddress";

export function getStoredWalletAddress(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function storeWalletAddress(address: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, address);
}

export function clearStoredWalletAddress(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}