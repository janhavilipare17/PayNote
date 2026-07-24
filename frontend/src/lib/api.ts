// src/lib/api.ts
import { PayNote } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://paynote-backend.onrender.com";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function apiFetch<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`);
  } catch {
    throw new ApiError(
      "Could not reach the server. Check your connection or try again.",
      0
    );
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // response wasn't JSON, ignore
    }
    throw new ApiError(message, res.status);
  }

  return res.json() as Promise<T>;
}

export async function getPayNote(token: string): Promise<PayNote> {
  return apiFetch<PayNote>(`/api/paynotes/token/${token}`);
}

export async function getPayNotesForAddress(
  address: string
): Promise<PayNote[]> {
  return apiFetch<PayNote[]>(`/api/paynotes/user/${address}`);
}

export async function syncPayNote(id: string | number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/paynotes/sync/${id}`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new ApiError(`Failed to sync PayNote ${id} to backend.`, res.status);
  }
}

export interface Reputation {
  address: string;
  paidCount: number;
  expiredCount: number;
  pendingCount: number;
  score: number;
}

export async function getReputation(address: string): Promise<Reputation> {
  return apiFetch<Reputation>(`/api/reputation/${address}`);
}

export { ApiError };