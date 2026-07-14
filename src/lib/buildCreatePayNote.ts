// src/lib/buildCreatePayNote.ts
import {
  Contract,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
  Address,
  rpc,
  xdr,
} from "@stellar/stellar-sdk";

const RPC_URL = "https://soroban-testnet.stellar.org";
const CONTRACT_ID = "CAYUDIMIOMD7YPPDS76VLUY5PZFTVFTEKQXV2M7CA374TAGX2U7WPW7R";

const server = new rpc.Server(RPC_URL);

// Stellar's classic convention: 7 decimal places (1 unit = 10,000,000 stroops).
// CONFIRM WITH YOUR FRIEND that her contract's `amount: i128` uses this same scale —
// if not, this is the only line that needs to change.
//const DECIMALS = 10_000_000;

interface CreatePayNoteParams {
  creatorAddress: string;
  amount: string; // e.g. "25.50"
  asset: string; // e.g. "TESTUSD"
  description: string;
  expiresAt: number; // unix timestamp in seconds
}

export async function buildCreatePayNoteTransaction({
  creatorAddress,
  amount,
  asset,
  description,
  expiresAt,
}: CreatePayNoteParams): Promise<string> {
  const account = await server.getAccount(creatorAddress);
  const contract = new Contract(CONTRACT_ID);

 // Confirmed with backend: contract expects raw, unscaled integers (e.g. 50, 25 — not ×10,000,000)
const amountAsInt = BigInt(Math.round(parseFloat(amount)));

  const operation = contract.call(
    "create_paynote",
    new Address(creatorAddress).toScVal(),
    nativeToScVal(amountAsInt, { type: "i128" }),
    nativeToScVal(asset, { type: "symbol" }),
    nativeToScVal(description, { type: "string" }),
    nativeToScVal(expiresAt, { type: "u64" })
  );

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(operation)
    .setTimeout(60)
    .build();

  const prepared = await server.prepareTransaction(tx);
  return prepared.toXDR();
}

export async function submitCreatePayNoteTransaction(
  signedXdr: string
): Promise<string> {
  const tx = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
  const sendResult = await server.sendTransaction(tx);

  if (sendResult.status === "ERROR") {
    throw new Error("Transaction submission failed.");
  }

  const hash = sendResult.hash;

  // Poll until the transaction is confirmed
  let getResult = await server.getTransaction(hash);
  let attempts = 0;
  while (getResult.status === "NOT_FOUND" && attempts < 15) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    getResult = await server.getTransaction(hash);
    attempts++;
  }

  if (getResult.status !== "SUCCESS") {
    throw new Error(`Transaction did not succeed. Status: ${getResult.status}`);
  }

  if (!getResult.returnValue) {
    throw new Error("Transaction succeeded but returned no PayNote id.");
  }

  const newId = scValToNative(getResult.returnValue as xdr.ScVal);
  return newId.toString();
}