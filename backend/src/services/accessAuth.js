const crypto = require("crypto");
const { ethers } = require("ethers");

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const challengeStore = new Map();
const fallbackSecret = crypto.randomBytes(32).toString("hex");

function base64UrlEncode(input) {
    return Buffer.from(input).toString("base64url");
}

function base64UrlDecode(input) {
    return Buffer.from(input, "base64url").toString("utf8");
}

function normalizeWallet(address) {
    return ethers.getAddress(address.toLowerCase());
}

function getSessionSecret() {
    return process.env.BACKEND_AUTH_SECRET || fallbackSecret;
}

function getAdminWallets() {
    return (process.env.ADMIN_WALLET_ADDRESSES || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
        .map(normalizeWallet);
}

function isAdminWallet(address) {
    try {
        return getAdminWallets().includes(normalizeWallet(address));
    } catch {
        return false;
    }
}

function createChallengeMessage({ wallet, nonce, issuedAt, expiresAt }) {
    return [
        "SynergyVault Authority Login",
        `Wallet: ${wallet}`,
        `Nonce: ${nonce}`,
        `Issued At: ${issuedAt}`,
        `Expires At: ${expiresAt}`,
    ].join("\n");
}

function issueWalletChallenge(walletAddress) {
    const wallet = normalizeWallet(walletAddress);
    const nonce = crypto.randomBytes(16).toString("hex");
    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();
    const message = createChallengeMessage({ wallet, nonce, issuedAt, expiresAt });

    challengeStore.set(wallet.toLowerCase(), {
        wallet,
        nonce,
        issuedAt,
        expiresAt,
        message,
    });

    return {
        wallet,
        message,
        expiresAt,
    };
}

function signSessionPayload(payloadJson) {
    return crypto
        .createHmac("sha256", getSessionSecret())
        .update(payloadJson)
        .digest("base64url");
}

function issueSessionToken(walletAddress) {
    const wallet = normalizeWallet(walletAddress);
    const payload = {
        wallet,
        iat: Date.now(),
        exp: Date.now() + SESSION_TTL_MS,
    };
    const payloadJson = JSON.stringify(payload);
    return `${base64UrlEncode(payloadJson)}.${signSessionPayload(payloadJson)}`;
}

function verifyWalletChallenge({ walletAddress, signature }) {
    const wallet = normalizeWallet(walletAddress);
    const challenge = challengeStore.get(wallet.toLowerCase());

    if (!challenge) {
        const error = new Error("Login challenge not found. Request a new challenge.");
        error.status = 401;
        throw error;
    }

    challengeStore.delete(wallet.toLowerCase());

    if (new Date(challenge.expiresAt).getTime() <= Date.now()) {
        const error = new Error("Login challenge expired. Request a new challenge.");
        error.status = 401;
        throw error;
    }

    const recovered = ethers.verifyMessage(challenge.message, signature);
    if (normalizeWallet(recovered) !== wallet) {
        const error = new Error("Wallet signature verification failed.");
        error.status = 401;
        throw error;
    }

    return {
        wallet,
        token: issueSessionToken(wallet),
        isAdmin: isAdminWallet(wallet),
    };
}

function parseSessionToken(token) {
    const [payloadPart, signature] = (token || "").split(".");
    if (!payloadPart || !signature) {
        const error = new Error("Invalid session token.");
        error.status = 401;
        throw error;
    }

    const payloadJson = base64UrlDecode(payloadPart);
    const expectedSignature = signSessionPayload(payloadJson);
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
        actualBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
        const error = new Error("Invalid session token signature.");
        error.status = 401;
        throw error;
    }

    const payload = JSON.parse(payloadJson);
    if (!payload.wallet || payload.exp <= Date.now()) {
        const error = new Error("Session token expired.");
        error.status = 401;
        throw error;
    }

    return {
        wallet: normalizeWallet(payload.wallet),
        exp: payload.exp,
        isAdmin: isAdminWallet(payload.wallet),
    };
}

function requireAccessSession(req, res, next) {
    try {
        const header = req.headers.authorization || "";
        const token = header.startsWith("Bearer ") ? header.slice(7) : "";
        if (!token) {
            return res.status(401).json({ success: false, error: "Authorization token is required" });
        }

        req.accessSession = parseSessionToken(token);
        next();
    } catch (error) {
        next(error);
    }
}

module.exports = {
    createChallengeMessage,
    isAdminWallet,
    issueWalletChallenge,
    normalizeWallet,
    requireAccessSession,
    verifyWalletChallenge,
};
