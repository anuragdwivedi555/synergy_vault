const axios = require("axios");

const TABLE_NAME = "vault_document_tombstones";

class DocumentTombstoneError extends Error {
    constructor(message, status = 500) {
        super(message);
        this.name = "DocumentTombstoneError";
        this.status = status;
    }
}

function getSupabaseConfig() {
    const url = (process.env.SUPABASE_URL || "").trim();
    const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

    if (!url || !serviceRoleKey) {
        throw new DocumentTombstoneError(
            "Supabase document deletion is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
            503
        );
    }

    return { url, serviceRoleKey };
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

function normalizeFileHash(hash) {
    return String(hash || "").trim().toLowerCase();
}

function buildInFilter(values) {
    return `in.(${values.map((value) => `"${value}"`).join(",")})`;
}

function throwDocumentTombstoneError(error) {
    const payload = error.response?.data;

    if (payload?.code === "PGRST205") {
        throw new DocumentTombstoneError(
            `Supabase table ${TABLE_NAME} is missing. Create it before enabling vault deletion.`,
            503
        );
    }

    throw new DocumentTombstoneError(
        payload?.message || error.message || "Supabase document-deletion request failed.",
        error.response?.status || 500
    );
}

async function findDocumentTombstone(ownerWallet, fileHash) {
    const client = getClient();

    try {
        const response = await client.get("", {
            params: {
                select: "*",
                owner_wallet: `eq.${ownerWallet}`,
                file_hash: `eq.${normalizeFileHash(fileHash)}`,
                limit: "1",
            },
        });

        return response.data[0] || null;
    } catch (error) {
        throwDocumentTombstoneError(error);
    }
}

async function upsertDocumentTombstone({
    ownerWallet,
    fileHash,
    deletedBy,
}) {
    const client = getClient();
    const normalizedHash = normalizeFileHash(fileHash);
    const existing = await findDocumentTombstone(ownerWallet, normalizedHash);
    const payload = {
        owner_wallet: ownerWallet,
        file_hash: normalizedHash,
        deleted_by: deletedBy,
        deleted_at: new Date().toISOString(),
    };

    try {
        if (existing) {
            const response = await client.patch("", payload, {
                params: {
                    id: `eq.${existing.id}`,
                    select: "*",
                },
                headers: {
                    Prefer: "return=representation",
                },
            });
            return response.data[0];
        }

        const response = await client.post("", payload, {
            headers: {
                Prefer: "return=representation",
            },
        });
        return response.data[0];
    } catch (error) {
        throwDocumentTombstoneError(error);
    }
}

async function fetchDeletedDocumentHashes(ownerWallet, fileHashes) {
    const normalizedHashes = Array.from(
        new Set(
            (fileHashes || [])
                .map(normalizeFileHash)
                .filter(Boolean)
        )
    );

    if (normalizedHashes.length === 0) {
        return new Set();
    }

    const client = getClient();

    try {
        const response = await client.get("", {
            params: {
                select: "file_hash",
                owner_wallet: `eq.${ownerWallet}`,
                file_hash: buildInFilter(normalizedHashes),
            },
        });

        return new Set(
            (response.data || []).map((record) => normalizeFileHash(record.file_hash))
        );
    } catch (error) {
        throwDocumentTombstoneError(error);
    }
}

module.exports = {
    DocumentTombstoneError,
    fetchDeletedDocumentHashes,
    upsertDocumentTombstone,
};
