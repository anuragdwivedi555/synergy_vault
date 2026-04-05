const express = require("express");
const { ethers } = require("ethers");
const router = express.Router();

const Document = require("../models/Document");

const VAULT_ABI = [
    "function getUserDocuments(address user) view returns (tuple(bytes32 hash, string cid, address owner, uint256 timestamp, bool exists)[])",
    "function getDocumentCount() view returns (uint256)",
];

function getContract() {
    const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
    return new ethers.Contract(process.env.CONTRACT_ADDRESS, VAULT_ABI, provider);
}

/**
 * GET /documents/:address
 * Returns all documents for a given wallet address.
 * Tries MongoDB first (faster), falls back to on-chain query.
 */
router.get("/:address", async (req, res, next) => {
    try {
        const { address } = req.params;

        if (!ethers.isAddress(address)) {
            return res.status(400).json({ success: false, error: "Invalid wallet address" });
        }

        const normalizedAddress = address.toLowerCase();

        // Try MongoDB cache first
        if (process.env.MONGODB_URI) {
            try {
                const cached = await Document.find({ owner: normalizedAddress })
                    .sort({ timestamp: -1 })
                    .lean();

                if (cached.length > 0) {
                    return res.json({
                        success: true,
                        source: "cache",
                        address: normalizedAddress,
                        count: cached.length,
                        documents: cached.map((d) => ({
                            hash: d.hash,
                            cid: d.cid,
                            owner: d.owner,
                            filename: d.filename,
                            fileType: d.fileType,
                            fileSizeBytes: d.fileSizeBytes,
                            timestamp: d.timestamp,
                            pinataUrl: d.pinataUrl,
                            txHash: d.txHash,
                        })),
                    });
                }
            } catch (dbErr) {
                console.warn("DB query failed, falling back to chain:", dbErr.message);
            }
        }

        // Fall back to on-chain query
        if (!process.env.CONTRACT_ADDRESS || process.env.CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
            return res.json({
                success: true,
                source: "none",
                address: normalizedAddress,
                count: 0,
                documents: [],
                message: "Contract not configured yet",
            });
        }

        const contract = getContract();
        const docs = await contract.getUserDocuments(address);

        const documents = docs.map((d) => ({
            hash: d.hash,
            cid: d.cid,
            owner: d.owner,
            timestamp: d.timestamp.toString(),
            timestampISO: new Date(Number(d.timestamp) * 1000).toISOString(),
            pinataUrl: `https://gateway.pinata.cloud/ipfs/${d.cid}`,
        }));

        res.json({
            success: true,
            source: "blockchain",
            address: normalizedAddress,
            count: documents.length,
            documents,
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /documents/count/total
 * Returns the total number of documents stored on-chain.
 */
router.get("/count/total", async (req, res, next) => {
    try {
        if (!process.env.CONTRACT_ADDRESS || process.env.CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
            return res.json({ success: true, count: 0 });
        }
        const contract = getContract();
        const count = await contract.getDocumentCount();
        res.json({ success: true, count: count.toString() });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
