import { useCallback, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import type { AccessGrant } from '../types';
import { BACKEND_URL } from '../types';
import { copyToClipboard, formatTimestamp, shortenHash } from '../utils';
import { buildGrantMessage, getAccessToken, readApiResponse } from '../utils/access';

interface AccessManagerProps {
    address: string | null;
    signer: ethers.Signer | null;
    isConnected: boolean;
}

const DURATION_OPTIONS = [
    { label: '1 hour', hours: 1 },
    { label: '24 hours', hours: 24 },
    { label: '7 days', hours: 24 * 7 },
    { label: '30 days', hours: 24 * 30 },
];

export function AccessManager({ address, signer, isConnected }: AccessManagerProps) {
    const [grantee, setGrantee] = useState('');
    const [durationHours, setDurationHours] = useState<number>(24);
    const [grants, setGrants] = useState<AccessGrant[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadGrants = useCallback(async () => {
        if (!address || !signer) {
            setGrants([]);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const token = await getAccessToken(signer);
            const res = await fetch(`${BACKEND_URL}/access/grants/${address}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await readApiResponse<{
                success?: boolean;
                error?: string;
                grants?: AccessGrant[];
            }>(res, 'Access grants request returned an invalid response');

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to load access grants');
            }

            setGrants(data.grants || []);
        } catch (err: any) {
            setError(err?.message || 'Failed to load access grants');
        } finally {
            setIsLoading(false);
        }
    }, [address, signer]);

    useEffect(() => {
        if (isConnected && address && signer) {
            loadGrants();
        }
    }, [isConnected, address, signer, loadGrants]);

    const handleGrantAccess = useCallback(async () => {
        if (!address || !signer) {
            toast.error('Connect your wallet to manage authority access.');
            return;
        }

        if (!ethers.isAddress(grantee)) {
            toast.error('Enter a valid authority wallet address.');
            return;
        }

        const ownerWallet = ethers.getAddress(address);
        const granteeWallet = ethers.getAddress(grantee);
        if (ownerWallet.toLowerCase() === granteeWallet.toLowerCase()) {
            toast.error('You already have access to your own vault.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const token = await getAccessToken(signer);
            const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
            const message = buildGrantMessage({ ownerWallet, granteeWallet, expiresAt });
            const signature = await signer.signMessage(message);

            const res = await fetch(`${BACKEND_URL}/access/grants`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    owner: ownerWallet,
                    grantee: granteeWallet,
                    expiresAt,
                    signature,
                }),
            });
            const data = await readApiResponse<{
                success?: boolean;
                error?: string;
            }>(res, 'Grant access request returned an invalid response');

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to grant authority access');
            }

            toast.success('Authority access granted.');
            setGrantee('');
            await loadGrants();
        } catch (err: any) {
            setError(err?.message || 'Failed to grant access');
            toast.error(`❌ ${err?.message || 'Failed to grant access'}`);
        } finally {
            setIsSubmitting(false);
        }
    }, [address, durationHours, grantee, loadGrants, signer]);

    const handleRevoke = useCallback(async (grantId: string) => {
        if (!signer) return;

        try {
            const token = await getAccessToken(signer);
            const res = await fetch(`${BACKEND_URL}/access/grants/revoke`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ grantId }),
            });
            const data = await readApiResponse<{
                success?: boolean;
                error?: string;
            }>(res, 'Revoke access request returned an invalid response');

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to revoke access');
            }

            toast.success('Authority access revoked.');
            await loadGrants();
        } catch (err: any) {
            toast.error(`❌ ${err?.message || 'Failed to revoke access'}`);
        }
    }, [loadGrants, signer]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                    <span className="vault-kicker" style={{ marginBottom: '0.8rem' }}>Grant tunnel</span>
                    <h3 style={{ marginBottom: '0.5rem' }}>Authorize a review wallet.</h3>
                    <p style={{ fontSize: '0.92rem', marginBottom: 0 }}>
                        Create a controlled access window so an authority wallet can inspect the vault through the verification portal.
                    </p>
                </div>
                <div style={{ display: 'grid', gap: '0.875rem' }}>
                    <label style={{ display: 'grid', gap: '0.375rem' }}>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--clr-text-muted)' }}>Authority Wallet</span>
                        <input
                            value={grantee}
                            onChange={(event) => setGrantee(event.target.value)}
                            placeholder="0x..."
                            className="input"
                        />
                    </label>
                    <label style={{ display: 'grid', gap: '0.375rem' }}>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--clr-text-muted)' }}>Access Window</span>
                        <select
                            value={durationHours}
                            onChange={(event) => setDurationHours(Number(event.target.value))}
                            className="input"
                        >
                            {DURATION_OPTIONS.map((option) => (
                                <option key={option.hours} value={option.hours} style={{ background: '#071626' }}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button className="btn btn-primary" onClick={handleGrantAccess} disabled={isSubmitting || !isConnected}>
                            {isSubmitting ? 'Granting' : 'Grant Access'}
                        </button>
                        <button className="btn btn-ghost" onClick={loadGrants} disabled={isLoading || !isConnected}>
                            Refresh Grants
                        </button>
                    </div>
                </div>
                {error && <p style={{ marginTop: '1rem', color: 'var(--clr-warning)' }}>⚠️ {error}</p>}
            </div>

            <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    <div>
                        <span className="vault-kicker" style={{ marginBottom: '0.8rem' }}>Active tunnel</span>
                        <h3 style={{ marginBottom: '0.25rem' }}>Authority sessions permitted by this user.</h3>
                        <p style={{ fontSize: '0.92rem', margin: 0 }}>
                            These wallets can use the authority portal while the permit remains valid.
                        </p>
                    </div>
                    <span className="badge badge-cyan">{grants.length} Permit{grants.length === 1 ? '' : 's'}</span>
                </div>

                {isLoading ? (
                    <p style={{ color: 'var(--clr-text-muted)' }}>Loading access grants...</p>
                ) : grants.length === 0 ? (
                    <p style={{ color: 'var(--clr-text-muted)' }}>No authority permits created yet.</p>
                ) : (
                    <div style={{ display: 'grid', gap: '0.875rem' }}>
                        {grants.map((grant) => {
                            const isExpired = new Date(grant.expires_at).getTime() <= Date.now();
                            const isRevoked = grant.status === 'revoked';

                            return (
                                <motion.div
                                    key={grant.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="glass-card"
                                    style={{ padding: '1rem 1.25rem', border: '1px solid var(--clr-border)' }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.375rem' }}>
                                                <strong>Authority</strong>
                                                <code className="hash-text">{shortenHash(grant.grantee_wallet, 6)}</code>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    style={{ padding: '0.125rem 0.5rem', fontSize: '0.75rem' }}
                                                    onClick={() => { copyToClipboard(grant.grantee_wallet); toast.success('Wallet copied!'); }}
                                                >
                                                    📋
                                                </button>
                                            </div>
                                            <div style={{ fontSize: '0.8125rem', color: 'var(--clr-text-muted)' }}>
                                                Expires: {formatTimestamp(Math.floor(new Date(grant.expires_at).getTime() / 1000))}
                                            </div>
                                            <div style={{ fontSize: '0.8125rem', color: 'var(--clr-text-muted)' }}>
                                                Status: {isRevoked ? 'Revoked' : isExpired ? 'Expired' : 'Active'}
                                            </div>
                                        </div>
                                        {!isRevoked && (
                                            <button className="btn btn-ghost btn-sm" onClick={() => handleRevoke(grant.id)}>
                                                Revoke
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
