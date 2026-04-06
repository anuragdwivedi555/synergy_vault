const axios = require("axios");

const TABLE_NAME = "ocr_document_fingerprints";
const RESERVATION_TTL_MS =
    Number(process.env.OCR_RESERVATION_TTL_MINUTES || 15) * 60 * 1000;
const SELECT_FIELDS = [
    "id",
    "content_hash",
    "extraction_method",
    "source_mime_type",
    "file_hash",
    "file_size_bytes",
    "document_section",
    "status",
    "expires_at",
    "created_at",
    "updated_at",
].join(",");

class SupabaseFingerprintError extends Error {
    constructor(message, status = 500) {
        super(message);
        this.name = "SupabaseFingerprintError";
        this.status = status;
    }
}

function getSupabaseConfig() {
    const url = (process.env.SUPABASE_URL || "").trim();
    const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

    if (!url || !serviceRoleKey) {
        throw new SupabaseFingerprintError(
            "Supabase duplicate protection is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
            503
        );
    }

    return {
        url,
        serviceRoleKey,
    };
}

function getClient() {
    const { url, serviceRoleKey } = getSupabaseConfig();

    return axios.create({
        baseURL: `${url}/rest/v1/${TABLE_NAME}`,
        headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
        },
        timeout: 15000,
    });
}

function parseSupabaseError(error) {
    const payload = error.response?.data;

    if (payload?.code === "PGRST205") {
        throw new SupabaseFingerprintError(
            `Supabase table ${TABLE_NAME} is missing. Create it before enabling OCR duplicate protection.`,
            503
        );
    }

    if (payload?.code === "23505") {
        throw new SupabaseFingerprintError("Duplicate fingerprint already exists.", 409);
    }

    if (
        payload?.code === "42703" &&
        String(payload?.message || "").includes("document_section")
    ) {
        throw new SupabaseFingerprintError(
            "Supabase document sections are not configured yet. Run the ocr_document_sections_migration.sql script first.",
            503
        );
    }

    throw new SupabaseFingerprintError(
        payload?.message || error.message || "Supabase request failed.",
        error.response?.status || 500
    );
}

function isExpiredPendingFingerprint(record) {
    return (
        record?.status === "pending" &&
        record?.expires_at &&
        new Date(record.expires_at).getTime() <= Date.now()
    );
}

function normalizeFileHash(hash) {
    return String(hash || "").toLowerCase();
}

function buildInFilter(values) {
    return `in.(${values.map((value) => `"${value}"`).join(",")})`;
}

async function fetchFingerprintByHash(contentHash) {
    const client = getClient();

    try {
        const response = await client.get("", {
            params: {
                select: SELECT_FIELDS,
                content_hash: `eq.${contentHash}`,
                limit: "1",
            },
        });
        return response.data[0] || null;
    } catch (error) {
        parseSupabaseError(error);
    }
}

async function deletePendingReservationById(id) {
    const client = getClient();

    try {
        await client.delete("", {
            params: {
                id: `eq.${id}`,
                status: "eq.pending",
            },
        });
    } catch (error) {
        parseSupabaseError(error);
    }
}

async function getActiveFingerprint(contentHash) {
    const existing = await fetchFingerprintByHash(contentHash);

    if (existing && isExpiredPendingFingerprint(existing)) {
        await deletePendingReservationById(existing.id);
        return null;
    }

    return existing;
}

async function reserveFingerprint({
    contentHash,
    extractionMethod,
    sourceMimeType,
    fileHash,
    fileSizeBytes,
    documentSection,
}) {
    const activeFingerprint = await getActiveFingerprint(contentHash);
    if (activeFingerprint) {
        return { duplicate: true, record: activeFingerprint };
    }

    const client = getClient();
    const expiresAt = new Date(Date.now() + RESERVATION_TTL_MS).toISOString();
    const payload = {
        content_hash: contentHash,
        extraction_method: extractionMethod,
        source_mime_type: sourceMimeType,
        file_hash: fileHash,
        file_size_bytes: fileSizeBytes,
        document_section: documentSection,
        status: "pending",
        expires_at: expiresAt,
    };

    try {
        const response = await client.post("", payload, {
            params: {
                select: SELECT_FIELDS,
            },
            headers: {
                Prefer: "return=representation",
            },
        });

        return {
            duplicate: false,
            reservation: response.data[0],
        };
    } catch (error) {
        const payloadError = error.response?.data;
        if (payloadError?.code === "23505") {
            const existing = await getActiveFingerprint(contentHash);
            return { duplicate: true, record: existing };
        }
        parseSupabaseError(error);
    }
}

async function finalizeFingerprintReservation({
    reservationId,
}) {
    const client = getClient();
    const payload = {
        status: "confirmed",
        expires_at: null,
    };

    try {
        const response = await client.patch("", payload, {
            params: {
                id: `eq.${reservationId}`,
                status: "eq.pending",
                select: SELECT_FIELDS,
            },
            headers: {
                Prefer: "return=representation",
            },
        });

        if (!response.data[0]) {
            throw new SupabaseFingerprintError(
                "Duplicate reservation not found or already finalized.",
                404
            );
        }

        return response.data[0];
    } catch (error) {
        if (error instanceof SupabaseFingerprintError) {
            throw error;
        }
        parseSupabaseError(error);
    }
}

async function rollbackFingerprintReservation(reservationId) {
    if (!reservationId) {
        return;
    }

    await deletePendingReservationById(reservationId);
}

async function fetchDocumentSectionsByFileHashes(fileHashes) {
    const normalizedHashes = Array.from(
        new Set(
            (fileHashes || [])
                .map(normalizeFileHash)
                .filter(Boolean)
        )
    );

    if (normalizedHashes.length === 0) {
        return new Map();
    }

    const client = getClient();

    try {
        const response = await client.get("", {
            params: {
                select: "file_hash,document_section",
                status: "eq.confirmed",
                file_hash: buildInFilter(normalizedHashes),
            },
        });

        return new Map(
            (response.data || []).map((record) => [
                normalizeFileHash(record.file_hash),
                record.document_section,
            ])
        );
    } catch (error) {
        parseSupabaseError(error);
    }
}

module.exports = {
    SupabaseFingerprintError,
    fetchDocumentSectionsByFileHashes,
    finalizeFingerprintReservation,
    reserveFingerprint,
    rollbackFingerprintReservation,
};
