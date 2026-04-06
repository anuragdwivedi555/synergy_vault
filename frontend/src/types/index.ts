import type { DocumentSection } from '../utils/documentSections';

// TypeScript types for SynergyVault

export interface Document {
    hash: string;
    cid: string;
    owner: string;
    timestamp: string | number;
    timestampISO?: string;
    exists?: boolean;
    filename?: string;
    fileType?: string;
    fileSizeBytes?: number;
    pinataUrl?: string;
    ipfsUrl?: string;
    txHash?: string;
    documentSection?: DocumentSection | string;
}

export interface UploadResponse {
    success: boolean;
    hash: string;
    cid: string;
    pinataUrl: string;
    ipfsUrl: string;
    filename: string;
    fileType: string;
    fileSizeBytes: number;
    reservationId?: string;
    contentHash?: string;
    fingerprintMethod?: string;
    documentSection?: DocumentSection | string;
    error?: string;
}

export interface VerifyResponse {
    success: boolean;
    match: boolean;
    valid: boolean;
    hash: string;
    cid?: string;
    owner?: string;
    timestamp?: string;
    timestampISO?: string;
    message?: string;
    error?: string;
}

export interface DocumentsResponse {
    success: boolean;
    source: 'cache' | 'blockchain' | 'none';
    address: string;
    count: number;
    documents: Document[];
}

export interface AccessGrant {
    id: string;
    owner_wallet: string;
    grantee_wallet: string;
    scope: string;
    status: 'active' | 'revoked';
    grant_message: string;
    grant_signature: string;
    expires_at: string;
    revoked_at?: string | null;
    created_at: string;
    updated_at: string;
}

export type WalletState = {
    address: string | null;
    chainId: number | null;
    isConnected: boolean;
    isConnecting: boolean;
    error: string | null;
};

export type UploadState =
    | { status: 'idle' }
    | { status: 'hashing' }
    | { status: 'uploading-ipfs' }
    | { status: 'pending-tx'; hash: string; cid: string }
    | { status: 'confirming-tx'; txHash: string; hash: string; cid: string }
    | { status: 'success'; txHash: string; hash: string; cid: string; pinataUrl: string; documentSection?: DocumentSection | string }
    | { status: 'error'; error: string };

export type VerifyState =
    | { status: 'idle' }
    | { status: 'hashing' }
    | { status: 'checking' }
    | { status: 'verified'; data: VerifyResponse }
    | { status: 'mismatch'; hash: string }
    | { status: 'not-found'; hash: string }
    | { status: 'error'; error: string };

const rawBackendUrl = import.meta.env.VITE_BACKEND_URL?.trim() || '';

// In Vite dev, use the local proxy so frontend port changes do not break CORS.
export const BACKEND_URL = import.meta.env.DEV ? '' : rawBackendUrl.replace(/\/$/, '');

export const SUPPORTED_CHAIN_ID = Number(import.meta.env.VITE_NETWORK_CHAIN_ID || 80002);
export const POLYGONSCAN_URL = import.meta.env.VITE_POLYGONSCAN_URL || 'https://amoy.polygonscan.com';
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '';
export const IPFS_GATEWAY = import.meta.env.VITE_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';
