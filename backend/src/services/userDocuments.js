const { ethers } = require("ethers");
const Document = require("../models/Document");
const {
    fetchDocumentSectionsByFileHashes,
    SupabaseFingerprintError,
} = require("./supabaseFingerprints");
const {
    DocumentTombstoneError,
    fetchDeletedDocumentHashes,
} = require("./documentTombstones");

const VAULT_ABI = [
    "function getUserDocuments(address user) view returns (tuple(bytes32 hash, string cid, address owner, uint256 timestamp, bool exists)[])",
    "function getDocumentCount() view returns (uint256)",
];

function getConfiguredContractAddress() {
    const rawAddress = (process.env.CONTRACT_ADDRESS || "").trim();
    if (!rawAddress || rawAddress === "0x0000000000000000000000000000000000000000") {
        return null;
    }

    return ethers.getAddress(rawAddress.toLowerCase());
}

async function getContract() {
    const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
    const contractAddress = getConfiguredContractAddress();
    if (!contractAddress) {
        return null;
    }

    const code = await provider.getCode(contractAddress);
    if (!code || code === "0x") {
        return null;
    }

    return new ethers.Contract(contractAddress, VAULT_ABI, provider);
}

function normalizeHash(hash) {
    return String(hash || "").toLowerCase();
}

async function fetchSupabaseDocumentMetadata(ownerWallet, fileHashes) {
    let sectionsByHash = new Map();
    let deletedHashes = new Set();

    try {
        sectionsByHash = await fetchDocumentSectionsByFileHashes(fileHashes);
    } catch (error) {
        if (error instanceof SupabaseFingerprintError) {
            console.warn("Supabase document-section lookup failed:", error.message);
        } else {
            throw error;
        }
    }

    try {
        deletedHashes = await fetchDeletedDocumentHashes(ownerWallet, fileHashes);
    } catch (error) {
        if (error instanceof DocumentTombstoneError) {
            console.warn("Supabase tombstone lookup failed:", error.message);
        } else {
            throw error;
        }
    }

    return { sectionsByHash, deletedHashes };
}

async function fetchUserDocuments(address) {
    if (!ethers.isAddress(address)) {
        const error = new Error("Invalid wallet address");
        error.status = 400;
        throw error;
    }

    const normalizedAddress = address.toLowerCase();

    if (process.env.MONGODB_URI) {
        try {
            const cached = await Document.find({ owner: normalizedAddress })
                .sort({ timestamp: -1 })
                .lean();

            if (cached.length > 0) {
                const { sectionsByHash, deletedHashes } = await fetchSupabaseDocumentMetadata(
                    normalizedAddress,
                    cached.map((document) => document.hash)
                );

                const visibleCachedDocuments = cached
                    .filter((document) => {
                        const normalizedHash = normalizeHash(document.hash);
                        return !deletedHashes.has(normalizedHash) && !document.deletedAt;
                    })
                    .map((d) => ({
                        hash: d.hash,
                        cid: d.cid,
                        owner: d.owner,
                        filename: d.filename,
                        fileType: d.fileType,
                        fileSizeBytes: d.fileSizeBytes,
                        documentSection: sectionsByHash.get(normalizeHash(d.hash)) || d.documentSection,
                        timestamp: d.timestamp,
                        pinataUrl: d.pinataUrl,
                        txHash: d.txHash,
                    }));

                return {
                    success: true,
                    source: "cache",
                    address: normalizedAddress,
                    count: visibleCachedDocuments.length,
                    documents: visibleCachedDocuments,
                };
            }
        } catch (dbErr) {
            console.warn("DB query failed, falling back to chain:", dbErr.message);
        }
    }

    const contractAddress = getConfiguredContractAddress();
    if (!contractAddress) {
        return {
            success: true,
            source: "none",
            address: normalizedAddress,
            count: 0,
            documents: [],
            message: "Contract not configured yet",
        };
    }

    const contract = await getContract();
    if (!contract) {
        return {
            success: true,
            source: "none",
            address: normalizedAddress,
            count: 0,
            documents: [],
            message: "Contract not deployed on the configured network yet",
        };
    }

    const docs = await contract.getUserDocuments(address);
    const documents = docs.map((d) => ({
        hash: d.hash,
        cid: d.cid,
        owner: d.owner,
        timestamp: d.timestamp.toString(),
        timestampISO: new Date(Number(d.timestamp) * 1000).toISOString(),
        pinataUrl: `https://gateway.pinata.cloud/ipfs/${d.cid}`,
    }));
    const { sectionsByHash, deletedHashes } = await fetchSupabaseDocumentMetadata(
        normalizedAddress,
        documents.map((document) => document.hash)
    );

    const enrichedDocuments = documents
        .filter((document) => !deletedHashes.has(normalizeHash(document.hash)))
        .map((document) => ({
            ...document,
            documentSection: sectionsByHash.get(normalizeHash(document.hash)),
        }));

    return {
        success: true,
        source: "blockchain",
        address: normalizedAddress,
        count: enrichedDocuments.length,
        documents: enrichedDocuments,
    };
}

async function fetchDocumentCount() {
    const contractAddress = getConfiguredContractAddress();
    if (!contractAddress) {
        return "0";
    }

    const contract = await getContract();
    if (!contract) {
        return "0";
    }

    const count = await contract.getDocumentCount();
    return count.toString();
}

async function fetchDocumentRecordByHash(hash) {
    if (!ethers.isHexString(hash, 32)) {
        const error = new Error("Invalid document hash");
        error.status = 400;
        throw error;
    }

    const contract = await getContract();
    if (!contract) {
        const error = new Error("Contract not configured on the current network");
        error.status = 503;
        throw error;
    }

    const [valid, cid, owner, timestamp] = await contract.verifyDocumentView(hash);
    if (!valid) {
        return null;
    }

    return {
        hash: normalizeHash(hash),
        cid,
        owner: owner.toLowerCase(),
        timestamp: timestamp.toString(),
    };
}

module.exports = {
    fetchDocumentCount,
    fetchDocumentRecordByHash,
    fetchUserDocuments,
    getConfiguredContractAddress,
};
