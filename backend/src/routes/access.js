const express = require("express");
const { ethers } = require("ethers");
const {
    hasActiveAccessGrant,
    listAccessGrants,
    revokeAccessGrant,
    upsertAccessGrant,
} = require("../services/accessGrants");
const {
    issueWalletChallenge,
    normalizeWallet,
    requireAccessSession,
    verifyWalletChallenge,
} = require("../services/accessAuth");
const { fetchUserDocuments } = require("../services/userDocuments");

const router = express.Router();

function buildGrantMessage({ ownerWallet, granteeWallet, expiresAt }) {
    return [
        "SynergyVault Document Access Grant",
        `Owner: ${ownerWallet}`,
        `Grantee: ${granteeWallet}`,
        "Scope: documents",
        `Expires At: ${expiresAt}`,
        `Chain Id: ${process.env.CHAIN_ID || 80002}`,
    ].join("\n");
}

router.post("/challenge", express.json(), async (req, res, next) => {
    try {
        const { wallet } = req.body;
        if (!wallet || !ethers.isAddress(wallet)) {
            return res.status(400).json({ success: false, error: "Valid wallet address is required" });
        }

        const challenge = issueWalletChallenge(wallet);
        res.json({ success: true, ...challenge });
    } catch (error) {
        next(error);
    }
});

router.post("/login", express.json(), async (req, res, next) => {
    try {
        const { wallet, signature } = req.body;
        if (!wallet || !signature) {
            return res.status(400).json({ success: false, error: "wallet and signature are required" });
        }

        const session = verifyWalletChallenge({ walletAddress: wallet, signature });
        res.json({ success: true, ...session });
    } catch (error) {
        next(error);
    }
});

router.get("/grants/:owner", requireAccessSession, async (req, res, next) => {
    try {
        const ownerWallet = normalizeWallet(req.params.owner);
        const sessionWallet = req.accessSession.wallet;

        if (!req.accessSession.isAdmin && sessionWallet !== ownerWallet) {
            return res.status(403).json({ success: false, error: "Only the owner can view their access grants" });
        }

        const grants = await listAccessGrants(ownerWallet.toLowerCase());
        res.json({ success: true, owner: ownerWallet.toLowerCase(), grants });
    } catch (error) {
        next(error);
    }
});

router.post("/grants", requireAccessSession, express.json(), async (req, res, next) => {
    try {
        const { owner, grantee, expiresAt, signature } = req.body;
        if (!owner || !grantee || !expiresAt || !signature) {
            return res.status(400).json({
                success: false,
                error: "owner, grantee, expiresAt, and signature are required",
            });
        }

        if (!ethers.isAddress(owner) || !ethers.isAddress(grantee)) {
            return res.status(400).json({ success: false, error: "Invalid owner or grantee wallet address" });
        }

        const ownerWallet = normalizeWallet(owner);
        const granteeWallet = normalizeWallet(grantee);
        if (!req.accessSession.isAdmin && req.accessSession.wallet !== ownerWallet) {
            return res.status(403).json({ success: false, error: "Only the owner can grant access" });
        }

        const expiresAtIso = new Date(expiresAt).toISOString();
        if (new Date(expiresAtIso).getTime() <= Date.now()) {
            return res.status(400).json({ success: false, error: "expiresAt must be in the future" });
        }

        const grantMessage = buildGrantMessage({
            ownerWallet,
            granteeWallet,
            expiresAt: expiresAtIso,
        });

        const recovered = normalizeWallet(ethers.verifyMessage(grantMessage, signature));
        if (recovered !== ownerWallet) {
            return res.status(401).json({ success: false, error: "Grant signature verification failed" });
        }

        const grant = await upsertAccessGrant({
            ownerWallet: ownerWallet.toLowerCase(),
            granteeWallet: granteeWallet.toLowerCase(),
            expiresAt: expiresAtIso,
            grantMessage,
            grantSignature: signature,
        });

        res.json({ success: true, grant });
    } catch (error) {
        next(error);
    }
});

router.post("/grants/revoke", requireAccessSession, express.json(), async (req, res, next) => {
    try {
        const { grantId } = req.body;
        if (!grantId) {
            return res.status(400).json({ success: false, error: "grantId is required" });
        }

        const grant = await revokeAccessGrant(
            grantId,
            req.accessSession.wallet.toLowerCase()
        );

        res.json({ success: true, grant });
    } catch (error) {
        next(error);
    }
});

router.get("/documents/:owner", requireAccessSession, async (req, res, next) => {
    try {
        const ownerWallet = normalizeWallet(req.params.owner);
        const requesterWallet = req.accessSession.wallet;

        const isOwner = requesterWallet === ownerWallet;
        const hasGrant = req.accessSession.isAdmin
            ? true
            : await hasActiveAccessGrant(ownerWallet.toLowerCase(), requesterWallet.toLowerCase());

        if (!isOwner && !hasGrant) {
            return res.status(403).json({
                success: false,
                error: "No active permit from this user for your wallet.",
            });
        }

        const data = await fetchUserDocuments(ownerWallet);
        res.json({
            ...data,
            viewer: requesterWallet.toLowerCase(),
            access: isOwner ? "owner" : req.accessSession.isAdmin ? "admin" : "grant",
        });
    } catch (error) {
        next(error);
    }
});

module.exports = {
    buildGrantMessage,
    router,
};
