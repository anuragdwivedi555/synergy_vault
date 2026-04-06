const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const router = express.Router();

const { analyzeDocumentFingerprint } = require("../services/ocrFingerprint");
const { uploadToPinata } = require("../services/pinata");
const {
    finalizeFingerprintReservation,
    reserveFingerprint,
    rollbackFingerprintReservation,
} = require("../services/supabaseFingerprints");
const Document = require("../models/Document");

const DOCUMENT_SECTIONS = new Set([
    "property-paper",
    "affidavit",
    "court-order",
    "personal-document",
]);

function normalizeDocumentSection(value) {
    const normalized = String(value || "personal-document").trim().toLowerCase();
    if (!DOCUMENT_SECTIONS.has(normalized)) {
        const error = new Error(
            "Invalid document section. Use property-paper, affidavit, court-order, or personal-document."
        );
        error.status = 400;
        throw error;
    }
    return normalized;
}

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

async function saveConfirmedDocumentMetadata({
    hash,
    cid,
    owner,
    filename,
    fileType,
    fileSizeBytes,
    documentSection,
    pinataUrl,
    ipfsUrl,
    txHash,
}) {
    if (!process.env.MONGODB_URI || !owner) {
        return;
    }

    try {
        await Document.findOneAndUpdate(
            { hash },
            {
                $set: {
                    cid,
                    owner,
                    filename,
                    fileType,
                    fileSizeBytes,
                    documentSection,
                    pinataUrl,
                    ipfsUrl,
                    txHash,
                },
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true,
            }
        );
    } catch (dbErr) {
        console.warn("DB save failed:", dbErr.message);
    }
}

/**
 * POST /upload
 * Accepts a multipart file, computes SHA-256 hash, uploads to IPFS via Pinata.
 * Returns: { success, hash, cid, pinataUrl, filename, fileType, fileSizeBytes }
 */
router.post("/", upload.single("file"), async (req, res, next) => {
    let reservationId = null;

    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: "No file provided" });
        }

        const { buffer, originalname, mimetype, size } = req.file;
        const documentSection = normalizeDocumentSection(req.body.documentSection);

        // Compute SHA-256 hash server-side (same algorithm as front-end Web Crypto API)
        const hashBuffer = crypto.createHash("sha256").update(buffer).digest();
        const hashHex = "0x" + hashBuffer.toString("hex");
        const hashBytes32 = "0x" + hashBuffer.toString("hex"); // 32 bytes = 64 hex chars

        // Analyze document text and reserve a global duplicate fingerprint.
        const fingerprint = await analyzeDocumentFingerprint(buffer, mimetype);
        const reservation = await reserveFingerprint({
            contentHash: fingerprint.contentHash,
            extractionMethod: fingerprint.extractionMethod,
            sourceMimeType: mimetype,
            fileHash: hashHex,
            fileSizeBytes: size,
            documentSection,
        });

        if (reservation.duplicate) {
            const duplicateError = new Error(
                "A document with the same extracted critical content already exists in the vault."
            );
            duplicateError.status = 409;
            throw duplicateError;
        }

        reservationId = reservation.reservation.id;

        // Upload to Pinata IPFS
        const { cid, pinataUrl, ipfsUrl } = await uploadToPinata(buffer, originalname, {
            hash: hashHex,
            fileType: mimetype,
        });

        res.json({
            success: true,
            hash: hashBytes32,
            cid,
            pinataUrl,
            ipfsUrl,
            filename: originalname,
            fileType: mimetype,
            fileSizeBytes: size,
            reservationId,
            contentHash: fingerprint.contentHash,
            fingerprintMethod: fingerprint.extractionMethod,
            documentSection,
        });
    } catch (err) {
        if (reservationId) {
            try {
                await rollbackFingerprintReservation(reservationId);
            } catch (rollbackErr) {
                console.warn("Duplicate reservation rollback failed:", rollbackErr.message);
            }
        }
        next(err);
    }
});

router.post("/finalize", express.json(), async (req, res, next) => {
    try {
        const {
            reservationId,
            txHash,
            cid,
            owner,
            fileHash,
            filename,
            fileType,
            fileSizeBytes,
            documentSection,
            pinataUrl,
            ipfsUrl,
        } = req.body;

        if (!reservationId || !txHash || !cid || !owner || !fileHash) {
            return res.status(400).json({
                success: false,
                error: "reservationId, txHash, cid, owner, and fileHash are required",
            });
        }

        const normalizedOwner = owner.toLowerCase();
        const normalizedDocumentSection = normalizeDocumentSection(documentSection);

        const fingerprintRecord = await finalizeFingerprintReservation({
            reservationId,
        });

        await saveConfirmedDocumentMetadata({
            hash: fileHash,
            cid,
            owner: normalizedOwner,
            filename,
            fileType,
            fileSizeBytes,
            documentSection: normalizedDocumentSection,
            pinataUrl,
            ipfsUrl,
            txHash,
        });

        res.json({
            success: true,
            reservationId,
            contentHash: fingerprintRecord.content_hash,
            documentSection: normalizedDocumentSection,
        });
    } catch (err) {
        next(err);
    }
});

router.post("/rollback", express.json(), async (req, res, next) => {
    try {
        const { reservationId } = req.body;
        if (!reservationId) {
            return res.status(400).json({ success: false, error: "reservationId is required" });
        }

        await rollbackFingerprintReservation(reservationId);
        res.json({ success: true, reservationId });
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
