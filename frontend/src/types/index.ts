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
    | { status: 'success'; txHash: string; hash: string; cid: string; pinataUrl: string }
    | { status: 'error'; error: string };

export type VerifyState =
    | { status: 'idle' }
    | { status: 'hashing' }
    | { status: 'checking' }
    | { status: 'verified'; data: VerifyResponse }
    | { status: 'mismatch'; hash: string }
    | { status: 'not-found'; hash: string }
    | { status: 'error'; error: string };

export const SUPPORTED_CHAIN_ID = Number(import.meta.env.VITE_NETWORK_CHAIN_ID || 80001);
export const POLYGONSCAN_URL = import.meta.env.VITE_POLYGONSCAN_URL || 'https://mumbai.polygonscan.com';
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '';
export const IPFS_GATEWAY = import.meta.env.VITE_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';
