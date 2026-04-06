const express = require("express");
const router = express.Router();
const Document = require("../models/Document");
const { ethers } = require("ethers");
const { requireAccessSession } = require("../services/accessAuth");
const { upsertDocumentTombstone } = require("../services/documentTombstones");
const {
    fetchDocumentCount,
    fetchDocumentRecordByHash,
    fetchUserDocuments,
} = require("../services/userDocuments");

router.post("/delete", requireAccessSession, express.json(), async (req, res, next) => {
    try {
        const normalizedHash = String(req.body?.hash || "").trim().toLowerCase();
        if (!ethers.isHexString(normalizedHash, 32)) {
            return res.status(400).json({ success: false, error: "A valid document hash is required" });
        }

        const record = await fetchDocumentRecordByHash(normalizedHash);
        if (!record) {
            return res.status(404).json({ success: false, error: "Document not found on-chain" });
        }

        if (req.accessSession.wallet.toLowerCase() !== record.owner) {
            return res.status(403).json({
                success: false,
                error: "Only the owner of this document can delete it from the vault index",
            });
        }

        const tombstone = await upsertDocumentTombstone({
            ownerWallet: record.owner,
            fileHash: normalizedHash,
            deletedBy: req.accessSession.wallet.toLowerCase(),
        });

        if (process.env.MONGODB_URI) {
            await Document.findOneAndUpdate(
                { hash: normalizedHash },
                {
                    $set: {
                        deletedAt: new Date(),
                        deletedBy: req.accessSession.wallet.toLowerCase(),
                    },
                }
            ).catch((error) => {
                console.warn("Mongo delete tombstone update failed:", error.message);
            });
        }

        res.json({
            success: true,
            hash: normalizedHash,
            tombstone,
            message: "Document removed from the vault index. The on-chain proof remains immutable.",
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /documents/:address
 * Returns all documents for a given wallet address.
 * Tries MongoDB first (faster), falls back to on-chain query.
 */
router.get("/:address", async (req, res, next) => {
    try {
        const data = await fetchUserDocuments(req.params.address);
        res.json(data);
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
        const count = await fetchDocumentCount();
        res.json({ success: true, count });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
