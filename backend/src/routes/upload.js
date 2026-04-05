const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const router = express.Router();

const { uploadToPinata } = require("../services/pinata");
const Document = require("../models/Document");

// Multer: memory storage, 20 MB limit, allowed MIME types
const ALLOWED_MIMES = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: MAX_SIZE_BYTES },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIMES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(
                new Error(
                    `Invalid file type: ${file.mimetype}. Allowed: PDF, PNG, JPG, WEBP`
                )
            );
        }
    },
});

/**
 * POST /upload
 * Accepts a multipart file, computes SHA-256 hash, uploads to IPFS via Pinata.
 * Returns: { success, hash, cid, pinataUrl, filename, fileType, fileSizeBytes }
 */
router.post("/", upload.single("file"), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: "No file provided" });
        }

        const { buffer, originalname, mimetype, size } = req.file;

        // Compute SHA-256 hash server-side (same algorithm as front-end Web Crypto API)
        const hashBuffer = crypto.createHash("sha256").update(buffer).digest();
        const hashHex = "0x" + hashBuffer.toString("hex");
        const hashBytes32 = "0x" + hashBuffer.toString("hex"); // 32 bytes = 64 hex chars

        // Upload to Pinata IPFS
        const { cid, pinataUrl, ipfsUrl } = await uploadToPinata(buffer, originalname, {
            hash: hashHex,
            fileType: mimetype,
        });

        // Optional: save metadata to MongoDB
        const owner = (req.body.owner || "").toLowerCase();
        if (process.env.MONGODB_URI && owner) {
            try {
                const doc = new Document({
                    hash: hashHex,
                    cid,
                    owner,
                    filename: originalname,
                    fileType: mimetype,
                    fileSizeBytes: size,
                    pinataUrl,
                    ipfsUrl,
                });
                await doc.save();
            } catch (dbErr) {
                // Non-fatal: log and continue
                console.warn("DB save failed:", dbErr.message);
            }
        }

        res.json({
            success: true,
            hash: hashBytes32,
            cid,
            pinataUrl,
            ipfsUrl,
            filename: originalname,
            fileType: mimetype,
            fileSizeBytes: size,
        });
    } catch (err) {
        next(err);
    }
});

// Multer error handler (e.g. file too large, wrong type)
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError || err.message.startsWith("Invalid file")) {
        return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
});

module.exports = router;
