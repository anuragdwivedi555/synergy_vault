const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const { ethers } = require("ethers");
const router = express.Router();

// Contract ABI (minimal – only what we need for verification)
const VAULT_ABI = [
    "function verifyDocumentView(bytes32 hash) view returns (bool valid, string cid, address owner, uint256 timestamp)",
];

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 },
});

function getConfiguredContractAddress() {
    const rawAddress = (process.env.CONTRACT_ADDRESS || "").trim();
    if (!rawAddress || rawAddress === "0x0000000000000000000000000000000000000000") {
        return null;
    }

    return ethers.getAddress(rawAddress.toLowerCase());
}

async function getContract() {
    const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
    const contractAddress = getConfiguredContractAddress();
    const code = await provider.getCode(contractAddress);

    if (!code || code === "0x") {
        return null;
    }

    return new ethers.Contract(contractAddress, VAULT_ABI, provider);
}

/**
 * POST /verify
 * Accepts a file, computes its SHA-256, checks whether it matches a provided
 * hash or queries the blockchain directly.
 *
 * Body (multipart):
 *   file        – the document to verify
 *   expectedHash (optional) – client-side hash to compare
 *
 * Returns: { success, match, valid, hash, cid, owner, timestamp }
 */
router.post("/", upload.single("file"), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: "No file provided" });
        }

        const { buffer } = req.file;

        // Compute hash server-side
        const hashHex = "0x" + crypto.createHash("sha256").update(buffer).digest("hex");

        // If caller sent an expectedHash, just do a local comparison first
        const expectedHash = req.body.expectedHash;
        if (expectedHash) {
            const match = expectedHash.toLowerCase() === hashHex.toLowerCase();
            if (!match) {
                return res.json({
                    success: true,
                    match: false,
                    valid: false,
                    hash: hashHex,
                    message: "Hash mismatch – document may have been tampered with",
                });
            }
        }

        // Query the blockchain
        let onChainData = { valid: false, cid: "", owner: ethers.ZeroAddress, timestamp: 0n };

        if (getConfiguredContractAddress()) {
            try {
                const contract = await getContract();
                if (contract) {
                    const result = await contract.verifyDocumentView(hashHex);
                    onChainData = {
                        valid: result.valid,
                        cid: result.cid,
                        owner: result.owner,
                        timestamp: result.timestamp.toString(),
                    };
                }
            } catch (contractErr) {
                console.warn("Contract query failed:", contractErr.message);
            }
        }

        res.json({
            success: true,
            match: true,
            hash: hashHex,
            ...onChainData,
            timestampISO: onChainData.timestamp
                ? new Date(Number(onChainData.timestamp) * 1000).toISOString()
                : null,
        });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /verify/hash
 * Accept a raw hash string and verify against contract directly.
 */
router.post("/hash", express.json(), async (req, res, next) => {
    try {
        const { hash } = req.body;
        if (!hash) return res.status(400).json({ success: false, error: "hash is required" });

        const contractAddress = getConfiguredContractAddress();
        if (!contractAddress) {
            return res.json({ success: true, valid: false, message: "Contract not configured" });
        }

        const contract = await getContract();
        if (!contract) {
            return res.json({ success: true, valid: false, message: "Contract not deployed on the configured network yet" });
        }

        const result = await contract.verifyDocumentView(hash);

        res.json({
            success: true,
            valid: result.valid,
            cid: result.cid,
            owner: result.owner,
            timestamp: result.timestamp.toString(),
            timestampISO: result.timestamp
                ? new Date(Number(result.timestamp) * 1000).toISOString()
                : null,
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
