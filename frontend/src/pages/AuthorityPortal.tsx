import { useCallback, useState } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { BACKEND_URL, type Document } from '../types';
import { DocumentList } from '../components/DocumentList';
import { getAccessToken, readApiResponse } from '../utils/access';

interface AuthorityPortalProps {
    address: string | null;
    signer: ethers.Signer | null;
    isConnected: boolean;
    onConnectWallet: () => void;
    onAddAmoyNetwork: () => void;
    isWrongNetwork: boolean;
    switchToAmoy: () => void;
}

export function AuthorityPortal({
    address,
    signer,
    isConnected,
    onConnectWallet,
    onAddAmoyNetwork,
    isWrongNetwork,
    switchToAmoy,
}: AuthorityPortalProps) {
    const [targetAddress, setTargetAddress] = useState('');
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [accessMode, setAccessMode] = useState<string | null>(null);
    const [currentTarget, setCurrentTarget] = useState<string | null>(null);

    const fetchDocuments = useCallback(async (wallet?: string) => {
        const nextTarget = wallet || targetAddress;
        if (!signer || !nextTarget) {
            return;
        }

        if (!ethers.isAddress(nextTarget)) {
            setError('Enter a valid user wallet address.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const token = await getAccessToken(signer);
            const checksumWallet = ethers.getAddress(nextTarget);
            const res = await fetch(`${BACKEND_URL}/access/documents/${checksumWallet}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await readApiResponse<{
                success?: boolean;
                error?: string;
                documents?: Document[];
                access?: string;
            }>(res, 'Authority document lookup returned an invalid response');

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to load the requested vault');
            }

            setDocuments(data.documents || []);
            setAccessMode(data.access || null);
            setCurrentTarget(checksumWallet);
            toast.success('Authority access granted for this lookup.');
        } catch (err: any) {
            setDocuments([]);
            setCurrentTarget(null);
            setAccessMode(null);
            setError(err?.message || 'Failed to load the requested vault');
            toast.error(`❌ ${err?.message || 'Failed to load the requested vault'}`);
        } finally {
            setIsLoading(false);
        }
    }, [signer, targetAddress]);

    return (
        <main className="vault-shell vault-page">
            <section className="vault-section">
                <div className="glass-card vault-header-board">
                    <div className="vault-header-grid">
                        <div className="vault-heading-copy">
                            <span className="vault-kicker">Authority review portal</span>
                            <div>
                                <h2>Open only the vault a user has permitted you to inspect.</h2>
                                <p>
                                    This portal is for fast, controlled review. The authority wallet signs a short challenge,
                                    then the vault opens only if the user created an active permit for that wallet.
                                </p>
                            </div>

                            <div className="vault-quick-grid">
                                <div className="vault-quick-card">
                                    <span>Authority wallet</span>
                                    <strong>{isConnected && address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Disconnected'}</strong>
                                    <p>{isConnected ? 'Challenge signing is available.' : 'Connect the review wallet to continue.'}</p>
                                </div>
                                <div className="vault-quick-card">
                                    <span>Current target</span>
                                    <strong>{currentTarget ? `${currentTarget.slice(0, 6)}...${currentTarget.slice(-4)}` : 'No vault open'}</strong>
                                    <p>{currentTarget ? 'You are reviewing one user vault.' : 'Enter a user wallet to request access.'}</p>
                                </div>
                                <div className="vault-quick-card">
                                    <span>Access mode</span>
                                    <strong>{accessMode || 'Pending'}</strong>
                                    <p>{accessMode ? 'Permit check has passed for this lookup.' : 'No active vault session in review mode yet.'}</p>
                                </div>
                                <div className="vault-quick-card">
                                    <span>Records visible</span>
                                    <strong>{documents.length}</strong>
                                    <p>The index populates only after the permit check succeeds.</p>
                                </div>
                            </div>
                        </div>

                        <div className="vault-status-board">
                            {!isConnected ? (
                                <div className="glass-card vault-note-card">
                                    <div className="vault-status-line">
                                        <strong style={{ color: 'var(--clr-text-primary)' }}>Authority session</strong>
                                        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                                            <button className="btn btn-primary btn-sm" onClick={onConnectWallet}>Connect Wallet</button>
                                            <button className="btn btn-secondary btn-sm" onClick={onAddAmoyNetwork}>Add Amoy</button>
                                        </div>
                                    </div>
                                    <p style={{ marginTop: '0.7rem' }}>
                                        Connect the exact wallet that the user permitted. That wallet becomes the identity for the review challenge.
                                    </p>
                                </div>
                            ) : isWrongNetwork ? (
                                <div className="glass-card vault-note-card">
                                    <div className="vault-status-line">
                                        <strong style={{ color: 'var(--clr-text-primary)' }}>Network mismatch</strong>
                                        <button className="btn btn-secondary btn-sm" onClick={switchToAmoy}>Switch to Amoy</button>
                                    </div>
                                    <p style={{ marginTop: '0.7rem' }}>
                                        The authority wallet is connected on the wrong chain. Switch to Polygon Amoy before requesting a user vault.
                                    </p>
                                </div>
                            ) : (
                                <div className="glass-card vault-note-card">
                                    <div className="vault-status-line">
                                        <strong style={{ color: 'var(--clr-text-primary)' }}>Review control</strong>
                                        <span className="badge badge-success">Challenge ready</span>
                                    </div>
                                    <p style={{ marginTop: '0.7rem' }}>
                                        Once a permitted user address is entered, the portal will open that vault and keep the lookup isolated to the approved scope.
                                    </p>
                                </div>
                            )}

                            {error && (
                                <div className="glass-card vault-note-card" style={{ borderColor: 'rgba(255, 107, 139, 0.32)' }}>
                                    <div className="vault-status-line">
                                        <strong style={{ color: 'var(--clr-text-primary)' }}>Lookup issue</strong>
                                        <span className="badge badge-error">Needs attention</span>
                                    </div>
                                    <p style={{ marginTop: '0.7rem', color: 'var(--clr-error)' }}>{error}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section className="vault-section vault-section-block">
                <div className="glass-card vault-stage-panel">
                    <div className="vault-section-head">
                        <div>
                            <span className="vault-kicker" style={{ marginBottom: '0.8rem' }}>Target vault lookup</span>
                            <h3>Request a permitted user vault.</h3>
                            <p>Enter the user wallet address. If the permit is active for your connected wallet, the vault index will open below.</p>
                        </div>
                        <span className="badge badge-cyan">Authority flow</span>
                    </div>

                    <div className="vault-stack" style={{ gap: '0.9rem' }}>
                        <input
                            value={targetAddress}
                            onChange={(event) => setTargetAddress(event.target.value)}
                            placeholder="User wallet address"
                            className="input"
                        />
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <button className="btn btn-primary" disabled={!isConnected || isLoading} onClick={() => fetchDocuments()}>
                                {isLoading ? 'Checking permit' : 'Open User Vault'}
                            </button>
                            <button className="btn btn-ghost" disabled={!currentTarget || isLoading} onClick={() => fetchDocuments(currentTarget || undefined)}>
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="vault-section vault-section-block">
                <div className="glass-card vault-stage-panel">
                    <div className="vault-section-head">
                        <div>
                            <span className="vault-kicker" style={{ marginBottom: '0.8rem' }}>Requested index</span>
                            <h3>Documents exposed through the approved tunnel.</h3>
                            <p>{currentTarget ? `Showing records for ${currentTarget}.` : 'No user vault has been opened yet.'}</p>
                        </div>
                        {accessMode && <span className="badge badge-primary">Access {accessMode}</span>}
                    </div>

                    <DocumentList
                        documents={documents}
                        isLoading={isLoading}
                        onRefresh={() => currentTarget ? fetchDocuments(currentTarget) : undefined}
                    />
                </div>
            </section>
        </main>
    );
}
