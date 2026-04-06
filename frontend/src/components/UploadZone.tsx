import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { ethers } from 'ethers';
import type { UploadState } from '../types';
import { BACKEND_URL } from '../types';
import { computeFileHash, polygonscanUrl } from '../utils';
import { useContract } from '../hooks/useContract';
import {
    DOCUMENT_SECTION_OPTIONS,
    getDocumentSectionLabel,
    type DocumentSection,
} from '../utils/documentSections';

const MAX_SIZE = 20 * 1024 * 1024;

interface UploadZoneProps {
    signer: ethers.Signer | null;
    provider: any;
    isConnected: boolean;
    onUploadSuccess: () => void;
}

export function UploadZone({ signer, provider, isConnected, onUploadSuccess }: UploadZoneProps) {
    const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' });
    const [documentSection, setDocumentSection] = useState<DocumentSection>('property-paper');
    const { addDocument } = useContract(signer, provider);

    const processFile = useCallback(async (file: File) => {
        let reservationId: string | undefined;

        if (!isConnected) {
            toast.error('Please connect your wallet first!');
            return;
        }

        try {
            const owner = await signer!.getAddress();

            // 1. Hash the file client-side
            setUploadState({ status: 'hashing' });
            toast.info('⚙️ Computing SHA-256 hash...');
            const hash = await computeFileHash(file);

            // 2. Upload to IPFS via backend
            setUploadState({ status: 'uploading-ipfs' });
            toast.info('📤 Uploading to IPFS...');

            const formData = new FormData();
            formData.append('file', file);
            formData.append('owner', owner);
            formData.append('documentSection', documentSection);

            const res = await fetch(`${BACKEND_URL}/upload`, { method: 'POST', body: formData });
            const data = await res.json().catch(() => ({ success: false, error: 'Upload service returned an invalid response' }));

            if (!res.ok) {
                throw new Error(data.error || `Upload failed with status ${res.status}`);
            }

            if (!data.success) throw new Error(data.error || 'Upload failed');

            reservationId = data.reservationId;
            const { cid, pinataUrl } = data;
            toast.success(`📌 Pinned to IPFS: ${cid.slice(0, 10)}...`);

            // 3. Call smart contract
            setUploadState({ status: 'pending-tx', hash, cid });
            toast.info('🦊 Confirm transaction in MetaMask...');

            const tx = await addDocument(hash, cid);
            setUploadState({ status: 'confirming-tx', txHash: tx.hash, hash, cid });
            toast.info(`⏳ Transaction submitted: ${tx.hash.slice(0, 10)}...`);

            await tx.wait();

            if (reservationId) {
                const finalizeRes = await fetch(`${BACKEND_URL}/upload/finalize`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        reservationId,
                        txHash: tx.hash,
                        cid,
                        owner,
                        fileHash: hash,
                        filename: file.name,
                        fileType: file.type || 'application/octet-stream',
                        fileSizeBytes: file.size,
                        documentSection,
                        pinataUrl,
                        ipfsUrl: data.ipfsUrl,
                    }),
                });
                const finalizeData = await finalizeRes.json().catch(() => ({ success: false, error: 'Failed to finalize duplicate protection record' }));
                if (!finalizeRes.ok || !finalizeData.success) {
                    toast.warning(finalizeData.error || 'Stored on-chain, but duplicate protection was not finalized');
                }
            }

            setUploadState({ status: 'success', txHash: tx.hash, hash, cid, pinataUrl, documentSection });
            toast.success('✅ Document stored on blockchain!');
            onUploadSuccess();
        } catch (err: any) {
            if (reservationId) {
                await fetch(`${BACKEND_URL}/upload/rollback`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reservationId }),
                }).catch(() => null);
            }

            const msg =
                err instanceof TypeError && err.message === 'Failed to fetch'
                    ? 'Upload service is unreachable. Start the backend on http://localhost:5001 and try again.'
                    : err?.reason || err?.message || 'Unknown error';
            setUploadState({ status: 'error', error: msg });
            toast.error(`❌ ${msg}`);
        }
    }, [addDocument, documentSection, isConnected, onUploadSuccess, signer]);

    const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
        onDrop: (accepted, rejected) => {
            if (rejected.length > 0) {
                const reason = rejected[0].errors[0]?.message || 'Invalid file';
                toast.error(`❌ ${reason}`);
                return;
            }
            if (accepted.length > 0) processFile(accepted[0]);
        },
        accept: { 'application/pdf': ['.pdf'], 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/webp': ['.webp'] },
        maxSize: MAX_SIZE,
        multiple: false,
        disabled: uploadState.status !== 'idle' && uploadState.status !== 'error',
    });

    const isProcessing = ['hashing', 'uploading-ipfs', 'pending-tx', 'confirming-tx'].includes(uploadState.status);

    return (
        <div>
            <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
                    <div>
                        <span className="vault-kicker" style={{ marginBottom: '0.7rem' }}>Document Section</span>
                        <p style={{ fontSize: '0.9rem', margin: 0 }}>
                            Choose the section where this record should live inside the vault index.
                        </p>
                    </div>
                    <span className="badge badge-cyan">{getDocumentSectionLabel(documentSection)}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                    {DOCUMENT_SECTION_OPTIONS.map((option) => {
                        const isSelected = documentSection === option.value;

                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setDocumentSection(option.value)}
                                disabled={isProcessing}
                                className="glass-card"
                                style={{
                                    padding: '1rem',
                                    textAlign: 'left',
                                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                                    border: isSelected
                                        ? '1px solid rgba(102, 233, 255, 0.48)'
                                        : '1px solid rgba(113, 183, 255, 0.12)',
                                    background: isSelected
                                        ? 'linear-gradient(135deg, rgba(91, 214, 255, 0.14), rgba(100, 106, 255, 0.14))'
                                        : undefined,
                                    boxShadow: isSelected ? 'var(--glow-primary)' : 'none',
                                }}
                            >
                                <div style={{ fontSize: '1.2rem', marginBottom: '0.55rem' }}>{option.icon}</div>
                                <div style={{ color: 'var(--clr-text-primary)', fontWeight: 700, marginBottom: '0.3rem' }}>
                                    {option.label}
                                </div>
                                <p style={{ fontSize: '0.82rem', lineHeight: 1.5, margin: 0 }}>
                                    {option.description}
                                </p>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Drop Zone */}
            <motion.div
                {...(getRootProps() as any)}
                whileHover={!isProcessing ? { scale: 1.01 } : {}}
                style={{
                    border: `2px dashed ${isDragActive ? 'var(--clr-primary)' : isDragReject ? 'var(--clr-error)' : 'var(--clr-border)'}`,
                    borderRadius: 'var(--radius-xl)',
                    padding: '3rem 2rem',
                    textAlign: 'center',
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    background: isDragActive ? 'rgba(139,92,246,0.08)' : 'var(--clr-surface)',
                    transition: 'all 0.25s ease',
                    boxShadow: isDragActive ? 'var(--glow-primary)' : 'none',
                }}
            >
                <input {...getInputProps()} />

                <AnimatePresence mode="wait">
                    {isProcessing ? (
                        <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                                {uploadState.status === 'hashing' && '🔒'}
                                {uploadState.status === 'uploading-ipfs' && '📡'}
                                {(uploadState.status as string) === 'pending-tx' && '🦊'}
                                {(uploadState.status as string) === 'confirming-tx' && '⛓️'}
                            </div>
                            <p style={{ color: 'var(--clr-primary-light)', fontWeight: 600, marginBottom: '0.5rem' }}>
                                {uploadState.status === 'hashing' && 'Computing SHA-256 hash...'}
                                {uploadState.status === 'uploading-ipfs' && 'Uploading to IPFS...'}
                                {(uploadState.status as string) === 'pending-tx' && 'Waiting for MetaMask confirmation...'}
                                {(uploadState.status as string) === 'confirming-tx' && 'Confirming on Polygon...'}
                            </p>
                            <div style={{ width: '120px', height: 4, background: 'var(--clr-border)', borderRadius: 4, margin: '1rem auto 0', overflow: 'hidden' }}>
                                <motion.div
                                    animate={{ x: ['-100%', '100%'] }}
                                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                                    style={{ height: '100%', width: '60%', background: 'var(--gradient-primary)', borderRadius: 4 }}
                                />
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{isDragActive ? '📂' : '📎'}</div>
                            <p style={{ fontWeight: 600, color: 'var(--clr-text-primary)', marginBottom: '0.5rem' }}>
                                {isDragActive ? 'Drop your document here!' : 'Drag & drop a document, or click to select'}
                            </p>
                            <p style={{ fontSize: '0.875rem' }}>PDF, PNG, JPG, WEBP · Max 20 MB</p>
                            {!isConnected && (
                                <p style={{ marginTop: '1rem', color: 'var(--clr-warning)', fontSize: '0.875rem' }}>
                                    ⚠️ Connect your wallet to upload
                                </p>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Success State */}
            <AnimatePresence>
                {uploadState.status === 'success' && (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="glass-card"
                        style={{ marginTop: '1.5rem', padding: '1.5rem', border: '1px solid rgba(16,185,129,0.3)' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                            <span style={{ fontSize: '1.5rem' }}>✅</span>
                            <div>
                                <h3 style={{ color: 'var(--clr-success)', fontSize: '1rem', marginBottom: '0.2rem' }}>Document Stored on Blockchain!</h3>
                                <span className="badge badge-primary">
                                    {getDocumentSectionLabel(uploadState.documentSection)}
                                </span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span style={{ color: 'var(--clr-text-muted)', minWidth: 70 }}>SHA-256:</span>
                                <code className="hash-text" style={{ color: 'var(--clr-primary-light)' }}>{uploadState.hash}</code>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span style={{ color: 'var(--clr-text-muted)', minWidth: 70 }}>CID:</span>
                                <code className="hash-text" style={{ color: 'var(--clr-secondary-light)' }}>{uploadState.cid}</code>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span style={{ color: 'var(--clr-text-muted)', minWidth: 70 }}>TX:</span>
                                <a
                                    href={polygonscanUrl('tx', uploadState.txHash)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hash-text"
                                    style={{ color: 'var(--clr-accent)' }}
                                >
                                    {uploadState.txHash}
                                </a>
                            </div>
                        </div>
                        <button
                            className="btn btn-ghost btn-sm"
                            style={{ marginTop: '1rem' }}
                            onClick={() => setUploadState({ status: 'idle' })}
                        >
                            Upload Another Document
                        </button>
                    </motion.div>
                )}

                {uploadState.status === 'error' && (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        style={{ marginTop: '1rem', padding: '1rem 1.5rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                    >
                        <span>❌</span>
                        <p style={{ color: 'var(--clr-error)', fontSize: '0.9375rem', margin: 0 }}>{uploadState.error}</p>
                        <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setUploadState({ status: 'idle' })}>Retry</button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
