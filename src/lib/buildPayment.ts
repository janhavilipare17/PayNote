// src/lib/buildPayment.ts
import {
  Asset,
  Horizon,
  Networks,
  Operation,
  TransactionBuilder,
  Memo,
  BASE_FEE,
} from "@stellar/stellar-sdk";

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const server = new Horizon.Server(HORIZON_URL);

// --- TEMPORARY placeholder until backend returns `assetIssuer` on the PayNote ---
// Once the API includes `assetIssuer`, delete this constant and pass
// `note.assetIssuer` straight into resolveAsset() instead — that's the only change needed.
const PLACEHOLDER_TEST_ISSUER =
  "GA2IC5WZD4TBVMPAAHDZY5DIPHY6ZVC6FHJJIDFGSMZULFVJWJ6UBVWI";

function resolveAsset(assetCode: string, issuerAddress?: string): Asset {
  if (assetCode === "XLM") {
    return Asset.native();
  }
  const issuer = issuerAddress ?? PLACEHOLDER_TEST_ISSUER;
  return new Asset(assetCode, issuer);
}

interface BuildPaymentParams {
  payerAddress: string;
  destinationAddress: string;
  amount: string;
  assetCode: string;
  assetIssuer?: string;
  memoText: string;
}

export async function buildPaymentTransaction({
  payerAddress,
  destinationAddress,
  amount,
  assetCode,
  assetIssuer,
  memoText,
}: BuildPaymentParams) {
  const account = await server.loadAccount(payerAddress);
  const asset = resolveAsset(assetCode, assetIssuer);

  if (memoText.length > 28) {
    throw new Error(
      `PayNote id "${memoText}" is longer than 28 bytes and won't fit in MEMO_TEXT.`
    );
  }

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.payment({
        destination: destinationAddress,
        asset,
        amount,
      })
    )
    .addMemo(Memo.text(memoText))
    .setTimeout(60)
    .build();

  return tx.toXDR();
}

export async function submitSignedTransaction(signedXdr: string) {
  const tx = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
  return server.submitTransaction(tx);
}