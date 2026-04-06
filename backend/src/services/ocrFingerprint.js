const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const vision = require("@google-cloud/vision");

const IMAGE_MIMES = new Set([
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
]);

const CRITICAL_LINE_KEYWORDS = [
    "ACCOUNT",
    "AADHAAR",
    "AMOUNT",
    "APPLICATION",
    "BILL",
    "CASE",
    "CERTIFICATE",
    "CONTRACT",
    "CUSTOMER",
    "DATE",
    "DOB",
    "DOCUMENT",
    "ID",
    "IDENTITY",
    "INVOICE",
    "LICENSE",
    "NAME",
    "NUMBER",
    "ORDER",
    "PAN",
    "PASSPORT",
    "POLICY",
    "REFERENCE",
    "REGISTRATION",
    "STATEMENT",
    "TOTAL",
];

let visionClient = null;

class DuplicateProtectionConfigError extends Error {
    constructor(message) {
        super(message);
        this.name = "DuplicateProtectionConfigError";
        this.status = 503;
    }
}

function createHexHash(value) {
    return crypto.createHash("sha256").update(value).digest("hex");
}

function getVisionCredentialsPath() {
    const configuredPath =
        process.env.GOOGLE_VISION_CREDENTIALS_PATH ||
        process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (configuredPath) {
        return path.resolve(configuredPath);
    }

    return path.resolve(__dirname, "../../../vision.json");
}

function getVisionClient() {
    if (visionClient) {
        return visionClient;
    }

    const credentialsPath = getVisionCredentialsPath();
    if (!fs.existsSync(credentialsPath)) {
        throw new DuplicateProtectionConfigError(
            "Google Vision credentials not found. Add vision.json or set GOOGLE_VISION_CREDENTIALS_PATH."
        );
    }

    visionClient = new vision.ImageAnnotatorClient({
        keyFilename: credentialsPath,
    });

    return visionClient;
}

async function extractTextFromImage(buffer) {
    const client = getVisionClient();
    const [result] = await client.documentTextDetection({
        image: { content: buffer },
    });

    return (
        result?.fullTextAnnotation?.text ||
        result?.textAnnotations?.[0]?.description ||
        ""
    );
}

async function extractTextFromPdf(buffer) {
    const result = await pdfParse(buffer);
    return result.text || "";
}

function normalizeText(text) {
    return text
        .normalize("NFKC")
        .replace(/\r/g, "\n")
        .split("\n")
        .map((line) => line.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .join("\n")
        .toUpperCase();
}

function collectRegexMatches(normalizedText, regex, target) {
    const matches = normalizedText.match(regex) || [];
    for (const match of matches) {
        target.add(match.trim());
    }
}

function extractCriticalSegments(normalizedText) {
    const criticalSegments = new Set();
    const lines = normalizedText.split("\n").map((line) => line.trim()).filter(Boolean);

    collectRegexMatches(normalizedText, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/g, criticalSegments);
    collectRegexMatches(normalizedText, /\b(?:\+?\d[\d\s().-]{7,}\d)\b/g, criticalSegments);
    collectRegexMatches(normalizedText, /\b\d{2,4}[/-]\d{1,2}[/-]\d{1,4}\b/g, criticalSegments);
    collectRegexMatches(normalizedText, /\b(?:RS\.?|INR|\$|EUR|GBP)\s?\d[\d,]*(?:\.\d{1,2})?\b/g, criticalSegments);
    collectRegexMatches(normalizedText, /\b[A-Z]{2,}\d[A-Z0-9-]{4,}\b/g, criticalSegments);
    collectRegexMatches(normalizedText, /\b\d{6,}\b/g, criticalSegments);

    for (const line of lines) {
        if (
            /\d/.test(line) ||
            /@/.test(line) ||
            CRITICAL_LINE_KEYWORDS.some((keyword) => line.includes(keyword))
        ) {
            criticalSegments.add(line);
        }

        if (criticalSegments.size >= 16) {
            break;
        }
    }

    const sortedSegments = Array.from(criticalSegments)
        .map((segment) => segment.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .sort();

    if (sortedSegments.length > 0) {
        return sortedSegments;
    }

    return lines.slice(0, 12);
}

async function analyzeDocumentFingerprint(buffer, mimetype) {
    let extractedText = "";
    let extractionMethod = "file-hash";

    if (mimetype === "application/pdf") {
        extractedText = await extractTextFromPdf(buffer);
        extractionMethod = extractedText.trim() ? "pdf-text" : "file-hash";
    } else if (IMAGE_MIMES.has(mimetype)) {
        extractedText = await extractTextFromImage(buffer);
        extractionMethod = extractedText.trim() ? "google-vision" : "file-hash";
    }

    const normalizedText = normalizeText(extractedText);

    if (!normalizedText) {
        return {
            contentHash: createHexHash(buffer),
            extractionMethod,
        };
    }

    const criticalSegments = extractCriticalSegments(normalizedText);
    const fingerprintText = criticalSegments.join("\n");

    return {
        contentHash: createHexHash(fingerprintText || normalizedText),
        extractionMethod,
    };
}

module.exports = {
    DuplicateProtectionConfigError,
    analyzeDocumentFingerprint,
};
