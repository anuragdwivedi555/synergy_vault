import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import type { Document } from '../types';
import { BACKEND_URL } from '../types';
import { UploadZone } from '../components/UploadZone';
import { DocumentList } from '../components/DocumentList';
import { VerifySection } from '../components/VerifySection';
import { AccessManager } from '../components/AccessManager';
import { getAccessToken, readApiResponse } from '../utils/access';

interface DashboardProps {
    address: string | null;
    chainId: number | null;
    isConnected: boolean;
    signer: ethers.Signer | null;
    provider: ethers.BrowserProvider | null;
    onConnectWallet: () => void;
    onAddAmoyNetwork: () => void;
    isWrongNetwork: boolean;
    switchToAmoy: () => void;
}

type Tab = 'upload' | 'documents' | 'verify' | 'access';

export function Dashboard({
    address, chainId, isConnected, signer, provider, onConnectWallet, onAddAmoyNetwork, isWrongNetwork, switchToAmoy,
}: DashboardProps) {
    const [activeTab, setActiveTab] = useState<Tab>('upload');
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoadingDocs, setIsLoadingDocs] = useState(false);

    const fetchDocuments = useCallback(async () => {
        if (!address) return;
        setIsLoadingDocs(true);
        try {
            const res = await fetch(`${BACKEND_URL}/documents/${address}`);
            const data = await res.json();
            if (data.success) setDocuments(data.documents || []);
        } catch {
            // Silently fail while the chain/backend are unavailable.
        } finally {
            setIsLoadingDocs(false);
        }
    }, [address]);

    useEffect(() => {
        if (isConnected && address) fetchDocuments();
    }, [isConnected, address, fetchDocuments]);

    const handleUploadSuccess = () => {
        fetchDocuments();
        setTimeout(() => setActiveTab('documents'), 1200);
    };

    const handleDeleteDocument = useCallback(async (document: Document) => {
        if (!signer) {
            throw new Error('Connect your wallet before deleting a vault entry.');
        }

        const token = await getAccessToken(signer);
        const res = await fetch(`${BACKEND_URL}/documents/delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ hash: document.hash }),
        });

        const data = await readApiResponse<{
            success?: boolean;
            error?: string;
            message?: string;
        }>(res, 'Delete request returned an invalid response');

        if (!res.ok || !data.success) {
            const message = data.error || 'Failed to delete the document from the vault index';
            toast.error(`❌ ${message}`);
            throw new Error(message);
        }

        toast.success(data.message || 'Document removed from the vault index.');
        await fetchDocuments();
    }, [fetchDocuments, signer]);

    const tabs: { id: Tab; label: string; code: string }[] = [
        { id: 'upload', label: 'Ingress', code: 'UP' },
        { id: 'documents', label: 'Vault Index', code: 'DX' },
        { id: 'verify', label: 'Integrity Scan', code: 'VR' },
        { id: 'access', label: 'Permit Tunnel', code: 'AC' },
    ];

    const chainLabel = chainId === 80002 ? 'Polygon Amoy' : chainId ? `Chain ${chainId}` : 'Awaiting network';

    return (
        <main className="vault-shell vault-page">
            <section className="vault-section">
                <div className="glass-card vault-header-board">
                    <div className="vault-header-grid">
                        <div className="vault-heading-copy">
                            <span className="vault-kicker">Live user vault</span>
                            <div>
                                <h2>Operate the secure chamber without losing visibility.</h2>
                                <p>
                                    Upload, verify, review stored records, and manage authority access from one command surface.
                                    The design stays focused on trust signals, not just forms.
                                </p>
                            </div>

                            <div className="vault-quick-grid">
                                <div className="vault-quick-card">
                                    <span>Network</span>
                                    <strong>{chainLabel}</strong>
                                    <p>{isWrongNetwork ? 'Switch to Amoy before committing new records.' : 'Vault controls are aligned with the active chain.'}</p>
                                </div>
                                <div className="vault-quick-card">
                                    <span>Wallet</span>
                                    <strong>{isConnected && address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Disconnected'}</strong>
                                    <p>{isConnected ? 'User vault session is available.' : 'Connect MetaMask to unlock active controls.'}</p>
                                </div>
                                <div className="vault-quick-card">
                                    <span>Documents</span>
                                    <strong>{documents.length}</strong>
                                    <p>{documents.length > 0 ? 'Indexed records ready for review.' : 'No anchored records in this session yet.'}</p>
                                </div>
                                <div className="vault-quick-card">
                                    <span>Authority Mode</span>
                                    <strong>{isConnected ? 'Controlled' : 'Locked'}</strong>
                                    <p>Permits are issued and revoked directly from this vault.</p>
                                </div>
                            </div>
                        </div>

                        <div className="vault-status-board">
                            <div className="glass-card vault-note-card">
                                <div className="vault-status-line">
                                    <strong style={{ color: 'var(--clr-text-primary)' }}>Vault condition</strong>
                                    <span className={isConnected ? 'badge badge-success' : 'badge badge-warning'}>
                                        {isConnected ? 'Session live' : 'Awaiting wallet'}
                                    </span>
                                </div>
                                <p style={{ marginTop: '0.7rem' }}>
                                    {isConnected
                                        ? 'You are inside the active vault shell. Use the tabs below to ingest, inspect, verify, or delegate access.'
                                        : 'Connect MetaMask and add Polygon Amoy first. Once linked, the vault panels become fully interactive.'}
                                </p>
                            </div>

                            {isConnected && isWrongNetwork ? (
                                <div className="glass-card vault-note-card">
                                    <div className="vault-status-line">
                                        <strong style={{ color: 'var(--clr-text-primary)' }}>Network mismatch</strong>
                                        <button className="btn btn-secondary btn-sm" onClick={switchToAmoy}>
                                            Switch to Amoy
                                        </button>
                                    </div>
                                    <p style={{ marginTop: '0.7rem' }}>
                                        The wallet is connected, but the vault controls are pinned to Polygon Amoy. Switch now before uploading or granting access.
                                    </p>
                                </div>
                            ) : !isConnected ? (
                                <div className="glass-card vault-note-card">
                                    <div className="vault-status-line">
                                        <strong style={{ color: 'var(--clr-text-primary)' }}>Session unlock</strong>
                                        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                                            <button className="btn btn-primary btn-sm" onClick={onConnectWallet}>Connect Wallet</button>
                                            <button className="btn btn-secondary btn-sm" onClick={onAddAmoyNetwork}>Add Amoy</button>
                                        </div>
                                    </div>
                                    <p style={{ marginTop: '0.7rem' }}>
                                        We recommend adding the network first, then connecting the wallet so the vault opens in the correct chain context.
                                    </p>
                                </div>
                            ) : (
                                <div className="glass-card vault-note-card">
                                    <div className="vault-status-line">
                                        <strong style={{ color: 'var(--clr-text-primary)' }}>Operational note</strong>
                                        <span className="badge badge-cyan">Review ready</span>
                                    </div>
                                    <p style={{ marginTop: '0.7rem' }}>
                                        Once a record is uploaded, it moves into the indexed vault view automatically so the user can review it immediately.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="vault-tabbar">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                id={`tab-${tab.id}`}
                                className={`vault-tab ${activeTab === tab.id ? 'is-active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <span className="badge badge-cyan" style={{ padding: '0.22rem 0.45rem' }}>{tab.code}</span>
                                {tab.label}
                                {tab.id === 'documents' && documents.length > 0 && (
                                    <span className="badge badge-primary" style={{ padding: '0.18rem 0.42rem' }}>
                                        {documents.length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            <section className="vault-section vault-section-block">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.24 }}
                    className="glass-card vault-stage-panel"
                >
                    {activeTab === 'upload' && (
                        <>
                            <div className="vault-section-head">
                                <div>
                                    <span className="vault-kicker" style={{ marginBottom: '0.8rem' }}>Ingress module</span>
                                    <h3>Seal a new record into the vault.</h3>
                                    <p>Duplicate protection, IPFS storage, and on-chain anchoring all start from this module.</p>
                                </div>
                                <span className="badge badge-primary">Upload route</span>
                            </div>
                            <UploadZone
                                signer={signer}
                                provider={provider}
                                isConnected={isConnected}
                                onUploadSuccess={handleUploadSuccess}
                            />
                        </>
                    )}

                    {activeTab === 'documents' && (
                        <>
                            <div className="vault-section-head">
                                <div>
                                    <span className="vault-kicker" style={{ marginBottom: '0.8rem' }}>Vault index</span>
                                    <h3>Review everything anchored to this wallet.</h3>
                                    <p>Use the indexed view for hashes, CIDs, timestamps, QR sharing, and chain inspection.</p>
                                </div>
                                <span className="badge badge-cyan">{documents.length} indexed</span>
                            </div>
                            {isConnected ? (
                                <DocumentList
                                    documents={documents}
                                    isLoading={isLoadingDocs}
                                    onRefresh={fetchDocuments}
                                    onDeleteDocument={handleDeleteDocument}
                                />
                            ) : (
                                <div className="vault-empty">
                                    Connect your wallet to load the document index for this vault.
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'verify' && (
                        <>
                            <div className="vault-section-head">
                                <div>
                                    <span className="vault-kicker" style={{ marginBottom: '0.8rem' }}>Integrity scan</span>
                                    <h3>Check whether a document matches a known vault proof.</h3>
                                    <p>We recompute the hash and compare it against the blockchain-backed registry.</p>
                                </div>
                                <span className="badge badge-success">Read only</span>
                            </div>
                            <VerifySection isConnected={isConnected} />
                        </>
                    )}

                    {activeTab === 'access' && (
                        <>
                            <div className="vault-section-head">
                                <div>
                                    <span className="vault-kicker" style={{ marginBottom: '0.8rem' }}>Permit tunnel</span>
                                    <h3>Open controlled review access for an authority wallet.</h3>
                                    <p>Grant time-bounded access when review is needed, then revoke it as soon as the review window closes.</p>
                                </div>
                                <span className="badge badge-warning">User controlled</span>
                            </div>
                            {isConnected ? (
                                <AccessManager
                                    address={address}
                                    signer={signer}
                                    isConnected={isConnected}
                                />
                            ) : (
                                <div className="vault-empty">
                                    Connect your wallet to manage authority permits for this vault.
                                </div>
                            )}
                        </>
                    )}
                </motion.div>
            </section>
        </main>
    );
}
