# PayNote

PayNote is an on-chain payment request platform built on the Stellar network. It allows a user to create a shareable payment request ("PayNote"), send it to a client via link, QR code, WhatsApp, or email, and receive automatic confirmation once the payment is settled on-chain.

## Live Deployment

| Component | URL |
|---|---|
| Frontend | https://pay-note-nine.vercel.app |
| Backend API | https://paynote-backend.onrender.com |
| Repository | https://github.com/janhavilipare17/PayNote |

## Smart Contract

The core PayNote logic is implemented as a Soroban smart contract and deployed on the Stellar public network (mainnet).

- **Network:** Stellar Public Network (Mainnet)
- **Contract ID:** `CAUCCQFSBSCAS6F5KEA2UDCS3UHCUNQNSKZZOYN4RQXVIQ6XZ4D6M736`
- **Explorer:** https://stellar.expert/explorer/public/contract/CAUCCQFSBSCAS6F5KEA2UDCS3UHCUNQNSKZZOYN4RQXVIQ6XZ4D6M736

The contract stores each PayNote's creator, requested amount, asset, description, expiry, and status (`Pending`, `Paid`, `Expired`), and exposes a `mark_paid` operation invoked once a matching payment is detected.

## Features

- Create a payment request specifying amount, asset, description, and expiry
- Share the request via a unique link, QR code, WhatsApp, or email
- Pay directly from a connected Freighter wallet
- Automatic on-chain payment detection through a Horizon payment stream, with backfill for payments that occur before the listener starts
- Unguessable, randomly generated public tokens for each PayNote, preventing enumeration of other users' payment requests
- Reputation score per wallet address, based on payment history
- Dashboard with live wallet balance, total requested/received, recent activity, and status filtering
- Client-side and on-chain enforcement of PayNote expiry

## Architecture

```
Browser (Freighter Wallet)
   |
   |-- signs and submits payments directly to Stellar Network
   |
Frontend (Next.js, deployed on Vercel)
   |
   |-- REST calls
   v
Backend (Express/TypeScript, deployed on Render)
   |
   |-- reads/writes cached PayNote state
   v                          |
Postgres (Neon)                |-- RPC calls (read contract state, submit mark_paid)
                                v
                          Soroban Smart Contract (Stellar Mainnet)
                                |
                                |-- streamed via Horizon API
                                v
                          Incoming Payments
```

The smart contract is the source of truth for every PayNote's state. The backend maintains a Postgres cache for fast reads and listens to the Horizon API for incoming payments matching a pending PayNote, invoking `mark_paid` on the contract once a match is confirmed.

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Blockchain | Stellar / Soroban | Sub-5-second finality and negligible fees, suitable for frequent, small payment requests |
| Smart Contract | Rust (Soroban SDK) | Native contract language for the Stellar network |
| Frontend | Next.js, React, Tailwind CSS | Fast iteration, file-based routing for dynamic payment links, straightforward deployment |
| Backend | Node.js, Express, TypeScript | A long-running process is required to maintain a persistent Horizon payment stream, which rules out serverless functions |
| Database | PostgreSQL (Neon) | Fast-read cache of on-chain state, avoiding a contract call on every page load |
| Wallet | Freighter | Keeps private keys on the user's device; the application never handles a user's secret key |
| Hosting | Vercel (frontend), Render (backend) | Git-integrated continuous deployment |

## Project Structure

```
PayNote/
├── backend/          Express API, payment listener, contract client
│   └── src/
│       ├── index.ts             API routes
│       ├── contractClient.ts    Soroban contract interaction
│       ├── paymentListener.ts   Horizon payment stream and backfill
│       ├── db.ts                Postgres access layer
│       └── types.ts             Shared types and chain-to-API mapping
├── frontend/         Next.js application
│   └── src/
│       ├── app/
│       │   ├── create/          Create PayNote form
│       │   ├── pay/[id]/        Payment page (resolved by public token)
│       │   └── dashboard/[address]/  Creator dashboard
│       └── lib/
│           ├── api.ts                Backend API client
│           ├── wallet.ts             Freighter integration
│           ├── buildPayment.ts       Payment transaction builder
│           └── buildCreatePayNote.ts Contract invocation builder
└── paynote-contract/  Soroban smart contract (Rust)
```

## Environment Variables

### Backend

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `BACKEND_STELLAR_SECRET` | Secret key of the account authorized to invoke `mark_paid` |
| `FRONTEND_URL` | Base URL of the deployed frontend, used to construct payment links |

### Frontend

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Base URL of the deployed backend API |

## Local Development

### Backend

```
cd backend
npm install
npm run dev
```

### Frontend

```
cd frontend
npm install
npm run dev
```

### Smart Contract

```
cd paynote-contract
stellar contract build
```

## Security Considerations

- PayNote links use a randomly generated, opaque token rather than the contract's sequential identifier, preventing enumeration of other users' payment requests through the public API.
- The backend's signing key is used exclusively to invoke `mark_paid`, an operation without an authorization requirement in the contract; it never has access to any user's funds or private key.
- Payer wallets sign and submit their own payment transactions directly through Freighter; the application never holds or transmits a user's private key.

## License

This project was developed for academic submission and is not licensed for production or commercial use.
