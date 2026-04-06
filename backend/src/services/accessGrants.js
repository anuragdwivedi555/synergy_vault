const axios = require("axios");

const TABLE_NAME = "document_access_grants";

class AccessGrantError extends Error {
    constructor(message, status = 500) {
        super(message);
        this.name = "AccessGrantError";
        this.status = status;
    }
}

function getSupabaseConfig() {
    const url = (process.env.SUPABASE_URL || "").trim();
    const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

    if (!url || !serviceRoleKey) {
        throw new AccessGrantError(
            "Supabase access-grant storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
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

function throwSupabaseAccessGrantError(error) {
    const payload = error.response?.data;

    if (payload?.code === "PGRST205") {
        throw new AccessGrantError(
            `Supabase table ${TABLE_NAME} is missing. Create it before enabling authority access.`,
            503
        );
    }

    throw new AccessGrantError(
        payload?.message || error.message || "Supabase access-grant request failed.",
        error.response?.status || 500
    );
}

async function findGrant(ownerWallet, granteeWallet) {
    const client = getClient();

    try {
        const response = await client.get("", {
            params: {
                select: "*",
                owner_wallet: `eq.${ownerWallet}`,
                grantee_wallet: `eq.${granteeWallet}`,
                scope: "eq.documents",
                limit: "1",
            },
        });

        return response.data[0] || null;
    } catch (error) {
        throwSupabaseAccessGrantError(error);
    }
}

async function upsertAccessGrant({
    ownerWallet,
    granteeWallet,
    expiresAt,
    grantMessage,
    grantSignature,
}) {
    const client = getClient();
    const existing = await findGrant(ownerWallet, granteeWallet);
    const payload = {
        owner_wallet: ownerWallet,
        grantee_wallet: granteeWallet,
        scope: "documents",
        status: "active",
        expires_at: expiresAt,
        revoked_at: null,
        grant_message: grantMessage,
        grant_signature: grantSignature,
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
        throwSupabaseAccessGrantError(error);
    }
}

async function listAccessGrants(ownerWallet) {
    const client = getClient();

    try {
        const response = await client.get("", {
            params: {
                select: "*",
                owner_wallet: `eq.${ownerWallet}`,
                order: "created_at.desc",
            },
        });

        return response.data || [];
    } catch (error) {
        throwSupabaseAccessGrantError(error);
    }
}

async function revokeAccessGrant(grantId, ownerWallet) {
    const client = getClient();

    try {
        const response = await client.patch("", {
            status: "revoked",
            revoked_at: new Date().toISOString(),
        }, {
            params: {
                id: `eq.${grantId}`,
                owner_wallet: `eq.${ownerWallet}`,
                select: "*",
            },
            headers: {
                Prefer: "return=representation",
            },
        });

        if (!response.data[0]) {
            throw new AccessGrantError("Access grant not found.", 404);
        }

        return response.data[0];
    } catch (error) {
        if (error instanceof AccessGrantError) {
            throw error;
        }
        throwSupabaseAccessGrantError(error);
    }
}

async function hasActiveAccessGrant(ownerWallet, granteeWallet) {
    const client = getClient();

    try {
        const response = await client.get("", {
            params: {
                select: "id",
                owner_wallet: `eq.${ownerWallet}`,
                grantee_wallet: `eq.${granteeWallet}`,
                scope: "eq.documents",
                status: "eq.active",
                expires_at: `gt.${new Date().toISOString()}`,
                limit: "1",
            },
        });

        return Boolean(response.data[0]);
    } catch (error) {
        throwSupabaseAccessGrantError(error);
    }
}

module.exports = {
    AccessGrantError,
    hasActiveAccessGrant,
    listAccessGrants,
    revokeAccessGrant,
    upsertAccessGrant,
};
