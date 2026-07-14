// src/lib/types.ts
export interface PayNote {
  id: string;
  creatorAddress: string;
  amount: string;
  asset: string;
  assetIssuer?: string;
  description: string;
  status: "pending" | "paid" | "expired";
  createdAt: string;
  expiresAt: string;
  paidAmount?: string;
  paidAsset?: string;
  paymentLink: string;
}