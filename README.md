# SynergyVault 🔐

> A tamper-proof, blockchain-based eVault for storing and verifying legal documents on the Polygon Amoy Testnet. Aligned with **UN SDG-16** (Peace, Justice, and Strong Institutions).

[![SDG-16](https://img.shields.io/badge/UN%20SDG-16-blue)]()
[![Polygon](https://img.shields.io/badge/Blockchain-Polygon%20Amoy-purple)]()
[![IPFS](https://img.shields.io/badge/Storage-IPFS%20%2B%20Pinata-cyan)]()

---

## Architecture

```
SynergyVault/
├── contracts/    ← Hardhat + Solidity smart contract
├── backend/      ← Node.js + Express REST API
├── frontend/     ← React + Vite + TypeScript UI
└── README.md
```

**Core Flow:**
1. User connects MetaMask wallet
2. Upload PDF/image via drag-and-drop
3. SHA-256 hash computed **client-side** (Web Crypto API)
4. File uploaded to IPFS via Pinata → get CID
5. Smart contract called: stores `hash + CID + owner + timestamp`
6. Verification: re-upload any file → recompute hash → compare on-chain

---

## Quick Start

### Prerequisites
- Node.js 18+
- MetaMask browser extension
- Pinata account (free): https://app.pinata.cloud
- Polygon Amoy MATIC (free faucet): https://faucet.polygon.technology

---

### 1. Smart Contract Setup

```bash
cd contracts
npm install
cp .env.example .env       # Fill in PRIVATE_KEY and POLYGON_AMOY_RPC_URL
```

**Compile & deploy to Polygon Amoy:**
```bash
npm run compile
npm run deploy:amoy
```

**Local development (Hardhat node):**
```bash
npm run node               # Terminal 1: start local chain
npm run deploy:local       # Terminal 2: deploy to local
```

Note the deployed contract address — you'll need it for the backend and frontend `.env` files.

---

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env`:
```env
PORT=5000
PINATA_JWT=your_pinata_jwt_token
CONTRACT_ADDRESS=0x...     # From step 1
POLYGON_RPC_URL=https://polygon-amoy.infura.io/v3/9ee8a68f33e54ef18ac51210fb67bfbd
# Optional:
MONGODB_URI=mongodb+srv://...
```

**Start the backend:**
```bash
npm run dev               # Development (nodemon)
npm start                 # Production
```

Backend runs on `http://localhost:5000`. Test health: `curl http://localhost:5000/health`

---

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
```

Edit `frontend/.env`:
```env
VITE_CONTRACT_ADDRESS=0x...    # From step 1
VITE_BACKEND_URL=http://localhost:5000
VITE_NETWORK_CHAIN_ID=80002
VITE_POLYGONSCAN_URL=https://amoy.polygonscan.com
```

**Start the frontend:**
```bash
npm run dev
```

Frontend runs on `http://localhost:5173`

---

## Smart Contract API

**DocumentVault.sol** deployed on Polygon Amoy:

| Function | Description |
|---|---|
| `addDocument(bytes32 hash, string cid)` | Store a document (reverts on duplicate) |
| `verifyDocument(bytes32 hash)` | Verify & emit event (state-changing) |
| `verifyDocumentView(bytes32 hash)` | Read-only verification (no gas) |
| `getUserDocuments(address user)` | Get all docs for a wallet |
| `getDocumentCount()` | Total documents stored |

**Events:** `DocumentAdded`, `DocumentVerified`

---

## Backend API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server health check |
| `POST` | `/upload` | Upload file → IPFS, returns hash + CID |
| `POST` | `/verify` | Upload file → compute hash → check chain |
| `POST` | `/verify/hash` | Check a raw hash against the contract |
| `GET` | `/documents/:address` | All documents for a wallet address |

---

## Deployment

### Frontend → Vercel
```bash
cd frontend && npm run build
# Push to GitHub → import in Vercel → set env vars
```

### Backend → Render / Railway
```bash
# Push backend/ to GitHub → create Web Service on Render
# Set all env vars in Render dashboard
```

### Smart Contract → Polygon Amoy
```bash
cd contracts
npm run deploy:amoy
# Verify on Polygonscan:
npx hardhat verify --network amoy <CONTRACT_ADDRESS>
```

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Blockchain** | Polygon Amoy, Solidity 0.8.19, Hardhat |
| **Storage** | IPFS via Pinata |
| **Backend** | Node.js, Express, ethers.js v6, multer, mongoose |
| **Frontend** | React 18, Vite, TypeScript, ethers.js v6, Framer Motion |
| **Wallet** | MetaMask |
| **Optional DB** | MongoDB (metadata cache) |

---

## SDG-16 Alignment

> **Goal 16: Peace, Justice, and Strong Institutions**

SynergyVault enables:
- **Transparency** — all document registrations are publicly verifiable on-chain
- **Non-repudiation** — blockchain timestamps prove when a document was submitted
- **Trustless verification** — anyone can verify document integrity without a central authority
- **Tamper-proof records** — SHA-256 hash mismatch instantly detects document alteration

---

## Demo Flow (3–5 min hackathon demo)

1. Open `http://localhost:5173` → Landing page
2. Click **Launch App** → Dashboard
3. Click **Connect Wallet** → MetaMask → approve
4. Tab: **Upload** → drag a PDF → watch the 4-step flow
5. Tab: **My Documents** → see the stored record → copy hash → QR code
6. Tab: **Verify** → drag the same file → ✅ Verified
7. Try a different file → ❌ Not Found

---

## License

MIT — Open Source
