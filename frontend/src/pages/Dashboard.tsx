import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ethers } from 'ethers';
import type { Document } from '../types';
import { BACKEND_URL } from '../types';
import { UploadZone } from '../components/UploadZone';
import { DocumentList } from '../components/DocumentList';
import { VerifySection } from '../components/VerifySection';

interface DashboardProps {
    address: string | null;
    chainId: number | null;
    isConnected: boolean;
    signer: ethers.Signer | null;
    provider: ethers.BrowserProvider | null;
    onConnectWallet: () => void;
    isWrongNetwork: boolean;
    switchToMumbai: () => void;
}

type Tab = 'upload' | 'documents' | 'verify';

export function Dashboard({
    address, chainId, isConnected, signer, provider, onConnectWallet, isWrongNetwork, switchToMumbai
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
            // Silently fail – blockchain may not be configured yet
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

    const tabs: { id: Tab; label: string; icon: string }[] = [
        { id: 'upload', label: 'Upload', icon: '📤' },
        { id: 'documents', label: 'My Documents', icon: '📋' },
        { id: 'verify', label: 'Verify', icon: '🔍' },
    ];

    return (
        <div style={{ minHeight: '100vh', paddingTop: '90px' }}>
            {/* Header Banner */}
            <div style={{
                background: 'var(--clr-bg-secondary)',
                borderBottom: '1px solid var(--clr-border)',
                padding: '1.5rem clamp(1rem, 5vw, 3rem)',
            }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.375rem', marginBottom: '0.375rem' }}>
                            🔐 Document <span className="text-gradient">Vault</span>
                        </h2>
                        <p style={{ fontSize: '0.875rem', margin: 0 }}>
                            Secure · Immutable · Verifiable
                        </p>
                    </div>

                    {/* Wallet Status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {isConnected && isWrongNetwork && (
                            <button className="btn btn-sm" style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.4)' }} onClick={switchToMumbai}>
                                ⚠️ Switch to Mumbai
                            </button>
                        )}
                        {isConnected ? (
                            <>
                                <span className="badge badge-success">● Connected</span>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--clr-text-muted)' }}>
                                    {address?.slice(0, 6)}...{address?.slice(-4)}
                                </span>
                                <span className="badge badge-cyan">Chain {chainId}</span>
                            </>
                        ) : (
                            <button className="btn btn-primary btn-sm" onClick={onConnectWallet} id="dashboard-connect-btn">
                                🦊 Connect Wallet
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem clamp(1rem, 5vw, 3rem)' }}>
                {/* Not Connected Banner */}
                {!isConnected && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card"
                        style={{ padding: '1.5rem', marginBottom: '1.5rem', textAlign: 'center', border: '1px solid rgba(139,92,246,0.25)' }}
                    >
                        <p style={{ marginBottom: '1rem' }}>Connect your MetaMask wallet to start uploading documents.</p>
                        <button className="btn btn-primary" onClick={onConnectWallet}>🦊 Connect MetaMask</button>
                    </motion.div>
                )}

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    marginBottom: '2rem',
                    background: 'var(--clr-surface)',
                    padding: '0.375rem',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--clr-border)',
                    width: 'fit-content',
                }}>
                    {tabs.map((tab) => (
                        <motion.button
                            key={tab.id}
                            id={`tab-${tab.id}`}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                padding: '0.5rem 1.25rem',
                                borderRadius: 'var(--radius-full)',
                                border: 'none',
                                cursor: 'pointer',
                                fontFamily: 'var(--font-display)',
                                fontWeight: 600,
                                fontSize: '0.875rem',
                                transition: 'all 0.2s ease',
                                background: activeTab === tab.id ? 'var(--gradient-primary)' : 'transparent',
                                color: activeTab === tab.id ? 'white' : 'var(--clr-text-muted)',
                                boxShadow: activeTab === tab.id ? 'var(--glow-primary)' : 'none',
                                display: 'flex', alignItems: 'center', gap: '0.375rem',
                            }}
                        >
                            {tab.icon} {tab.label}
                            {tab.id === 'documents' && documents.length > 0 && (
                                <span style={{ background: 'rgba(255,255,255,0.25)', padding: '0.1rem 0.45rem', borderRadius: '99px', fontSize: '0.7rem' }}>{documents.length}</span>
                            )}
                        </motion.button>
                    ))}
                </div>

                {/* Tab Content */}
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                >
                    {activeTab === 'upload' && (
                        <div className="glass-card" style={{ padding: '2rem' }}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ marginBottom: '0.375rem' }}>Upload Legal Document</h3>
                                <p style={{ fontSize: '0.875rem' }}>Your document is hashed client-side, stored on IPFS, and anchored to Polygon.</p>
                            </div>
                            <UploadZone
                                signer={signer}
                                provider={provider}
                                isConnected={isConnected}
                                onUploadSuccess={handleUploadSuccess}
                            />
                        </div>
                    )}

                    {activeTab === 'documents' && (
                        <div className="glass-card" style={{ padding: '2rem' }}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ marginBottom: '0.375rem' }}>My Uploaded Documents</h3>
                                <p style={{ fontSize: '0.875rem' }}>All documents anchored to the blockchain from your wallet.</p>
                            </div>
                            {isConnected ? (
                                <DocumentList
                                    documents={documents}
                                    isLoading={isLoadingDocs}
                                    onRefresh={fetchDocuments}
                                />
                            ) : (
                                <p style={{ textAlign: 'center', color: 'var(--clr-text-muted)', padding: '2rem 0' }}>
                                    Connect your wallet to view your documents.
                                </p>
                            )}
                        </div>
                    )}

                    {activeTab === 'verify' && (
                        <div className="glass-card" style={{ padding: '2rem' }}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ marginBottom: '0.375rem' }}>Verify Document Integrity</h3>
                                <p style={{ fontSize: '0.875rem' }}>Re-upload any document to check if it matches its on-chain registration.</p>
                            </div>
                            <VerifySection isConnected={isConnected} />
                        </div>
                    )}
                </motion.div>

                {/* SDG-16 Badge */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}
                >
                    <div className="glass-card" style={{ padding: '0.875rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>🌍</span>
                        <div>
                            <strong style={{ color: 'var(--clr-primary-light)' }}>SDG-16</strong>
                            <span style={{ color: 'var(--clr-text-muted)' }}> · Peace, Justice, and Strong Institutions</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
