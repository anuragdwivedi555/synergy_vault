import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import type { VerifyState } from '../types';
import { BACKEND_URL } from '../types';
import { computeFileHash, formatTimestamp } from '../utils';

interface VerifySectionProps {
    isConnected: boolean;
}

export function VerifySection(_props: VerifySectionProps) {
    const [verifyState, setVerifyState] = useState<VerifyState>({ status: 'idle' });

    const processFile = useCallback(async (file: File) => {
        try {
            setVerifyState({ status: 'hashing' });
            toast.info('⚙️ Computing hash...');
            const hash = await computeFileHash(file);

            setVerifyState({ status: 'checking' });
            toast.info('🔍 Checking blockchain...');

            const res = await fetch(`${BACKEND_URL}/verify/hash`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hash }),
            });
            const data = await res.json();

            if (!data.success) throw new Error(data.error || 'Verification failed');

            if (data.valid) {
                setVerifyState({ status: 'verified', data });
                toast.success('✅ Document verified on blockchain!');
            } else {
                setVerifyState({ status: 'not-found', hash });
                toast.warning('⚠️ Document not found in the vault');
            }
        } catch (err: any) {
            setVerifyState({ status: 'error', error: err?.message || 'Unknown error' });
            toast.error(`❌ ${err?.message || 'Verification failed'}`);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: (accepted) => { if (accepted.length > 0) processFile(accepted[0]); },
        accept: { 'application/pdf': ['.pdf'], 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/webp': ['.webp'] },
        maxSize: 20 * 1024 * 1024,
        multiple: false,
        disabled: verifyState.status === 'hashing' || verifyState.status === 'checking',
    });

    const isProcessing = verifyState.status === 'hashing' || verifyState.status === 'checking';
    const reset = () => setVerifyState({ status: 'idle' });

    return (
        <div>
            {/* Drop Zone */}
            <motion.div
                {...(getRootProps() as any)}
                whileHover={!isProcessing ? { scale: 1.01 } : {}}
                style={{
                    border: `2px dashed ${isDragActive ? 'var(--clr-secondary)' : 'var(--clr-border)'}`,
                    borderRadius: 'var(--radius-xl)',
                    padding: '2.5rem 2rem',
                    textAlign: 'center',
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    background: isDragActive ? 'rgba(6,182,212,0.06)' : 'var(--clr-surface)',
                    transition: 'all 0.25s ease',
                    boxShadow: isDragActive ? 'var(--glow-secondary)' : 'none',
                }}
            >
                <input {...getInputProps()} />
                <AnimatePresence mode="wait">
                    {isProcessing ? (
                        <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>
                                {verifyState.status === 'hashing' ? '🔒' : '🔍'}
                            </div>
                            <p style={{ color: 'var(--clr-secondary-light)', fontWeight: 600 }}>
                                {verifyState.status === 'hashing' ? 'Computing hash...' : 'Querying blockchain...'}
                            </p>
                            <div style={{ width: '120px', height: 4, background: 'var(--clr-border)', borderRadius: 4, margin: '1rem auto 0', overflow: 'hidden' }}>
                                <motion.div animate={{ x: ['-100%', '100%'] }} transition={{ duration: 1.2, repeat: Infinity }} style={{ height: '100%', width: '60%', background: 'linear-gradient(90deg, var(--clr-secondary), var(--clr-primary))', borderRadius: 4 }} />
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔍</div>
                            <p style={{ fontWeight: 600, color: 'var(--clr-text-primary)', marginBottom: '0.375rem' }}>
                                {isDragActive ? 'Drop to verify!' : 'Drop a document to verify its integrity'}
                            </p>
                            <p style={{ fontSize: '0.875rem' }}>We recompute the hash and check it against the blockchain</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Result */}
            <AnimatePresence>
                {verifyState.status === 'verified' && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="glass-card"
                        style={{ marginTop: '1.25rem', padding: '1.5rem', border: '1px solid rgba(16,185,129,0.35)', boxShadow: 'var(--glow-success)' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                            <span style={{ fontSize: '1.75rem' }}>✅</span>
                            <div>
                                <h3 style={{ color: 'var(--clr-success)', fontSize: '1rem', marginBottom: '0.125rem' }}>Document Verified!</h3>
                                <p style={{ fontSize: '0.8125rem', margin: 0 }}>This document exists on the Polygon blockchain and has not been tampered with.</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8125rem', padding: '1rem', background: 'rgba(16,185,129,0.06)', borderRadius: 'var(--radius-md)' }}>
                            <div><span style={{ color: 'var(--clr-text-muted)', marginRight: '0.5rem' }}>Hash:</span><code className="hash-text" style={{ color: 'var(--clr-primary-light)' }}>{verifyState.data.hash}</code></div>
                            {verifyState.data.cid && <div><span style={{ color: 'var(--clr-text-muted)', marginRight: '0.5rem' }}>CID:</span><code className="hash-text" style={{ color: 'var(--clr-secondary-light)' }}>{verifyState.data.cid}</code></div>}
                            {verifyState.data.owner && <div><span style={{ color: 'var(--clr-text-muted)', marginRight: '0.5rem' }}>Owner:</span><code className="hash-text">{verifyState.data.owner}</code></div>}
                            {verifyState.data.timestamp && <div><span style={{ color: 'var(--clr-text-muted)', marginRight: '0.5rem' }}>Uploaded:</span>{formatTimestamp(verifyState.data.timestamp)}</div>}
                        </div>
                        {verifyState.data.cid && (
                            <a href={`https://gateway.pinata.cloud/ipfs/${verifyState.data.cid}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ marginTop: '1rem' }}>
                                🌐 View on IPFS
                            </a>
                        )}
                        <button className="btn btn-ghost btn-sm" style={{ marginTop: '1rem', marginLeft: '0.5rem' }} onClick={reset}>Verify Another</button>
                    </motion.div>
                )}

                {verifyState.status === 'not-found' && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        style={{ marginTop: '1.25rem', padding: '1.25rem 1.5rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-xl)' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '1.5rem' }}>❌</span>
                            <h3 style={{ color: 'var(--clr-error)', fontSize: '1rem' }}>Document Not Found</h3>
                        </div>
                        <p style={{ fontSize: '0.875rem', margin: '0 0 0.5rem' }}>This document has no blockchain record. It may have been tampered with or was never uploaded.</p>
                        <code className="hash-text" style={{ color: 'var(--clr-text-muted)' }}>{verifyState.hash}</code>
                        <div style={{ marginTop: '1rem' }}>
                            <button className="btn btn-ghost btn-sm" onClick={reset}>Try Again</button>
                        </div>
                    </motion.div>
                )}

                {verifyState.status === 'error' && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        style={{ marginTop: '1.25rem', padding: '1rem 1.5rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius-md)' }}
                    >
                        <p style={{ color: 'var(--clr-warning)', fontSize: '0.9375rem', margin: '0 0 0.75rem' }}>⚠️ {verifyState.error}</p>
                        <button className="btn btn-ghost btn-sm" onClick={reset}>Retry</button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
