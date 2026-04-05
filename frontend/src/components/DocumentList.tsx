import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { QRCodeSVG } from 'qrcode.react';
import type { Document } from '../types';
import { IPFS_GATEWAY } from '../types';
import { formatTimestamp, shortenHash, copyToClipboard, polygonscanUrl } from '../utils';

interface DocumentListProps {
    documents: Document[];
    isLoading: boolean;
    onRefresh: () => void;
}

interface QRModalProps {
    cid: string;
    onClose: () => void;
}

function QRModal({ cid, onClose }: QRModalProps) {
    const url = `${IPFS_GATEWAY}${cid}`;
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 200, padding: '1rem',
            }}
        >
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="glass-card"
                style={{ padding: '2rem', textAlign: 'center', maxWidth: '320px', width: '100%' }}
            >
                <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>📱 Document QR Code</h3>
                <div style={{ background: 'white', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'inline-block', marginBottom: '1.25rem' }}>
                    <QRCodeSVG value={url} size={200} level="H" includeMargin={false} />
                </div>
                <p style={{ fontSize: '0.75rem', wordBreak: 'break-all', marginBottom: '1.25rem' }}>
                    {url}
                </p>
                <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => { copyToClipboard(url); toast.success('Link copied!'); }}>
                        📋 Copy Link
                    </button>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                        🔗 Open IPFS
                    </a>
                    <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
                </div>
            </motion.div>
        </motion.div>
    );
}

export function DocumentList({ documents, isLoading, onRefresh }: DocumentListProps) {
    const [qrDoc, setQrDoc] = useState<Document | null>(null);

    if (isLoading) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--clr-text-muted)' }}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} style={{ display: 'inline-block', fontSize: '2rem', marginBottom: '1rem' }}>⚙️</motion.div>
                <p>Loading documents from blockchain...</p>
            </div>
        );
    }

    if (documents.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--clr-text-muted)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                <p>No documents uploaded yet.</p>
                <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Upload your first legal document to get started.</p>
            </div>
        );
    }

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span className="badge badge-primary">{documents.length} Document{documents.length !== 1 ? 's' : ''}</span>
                <button className="btn btn-ghost btn-sm" onClick={onRefresh} id="refresh-docs-btn">🔄 Refresh</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {documents.map((doc, i) => (
                    <motion.div
                        key={doc.hash + i}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="glass-card"
                        style={{ padding: '1.25rem 1.5rem' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                {/* Filename if available */}
                                {doc.filename && (
                                    <div style={{ fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.9375rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        📄 {doc.filename}
                                    </div>
                                )}
                                {/* Hash */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                                    <span style={{ color: 'var(--clr-text-muted)', fontSize: '0.75rem', minWidth: 55 }}>Hash:</span>
                                    <code className="hash-text" style={{ color: 'var(--clr-primary-light)' }}>{shortenHash(doc.hash, 10)}</code>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        style={{ padding: '0.125rem 0.5rem', fontSize: '0.75rem' }}
                                        onClick={() => { copyToClipboard(doc.hash); toast.success('Hash copied!'); }}
                                        title="Copy full hash"
                                    >
                                        📋
                                    </button>
                                </div>
                                {/* CID */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                                    <span style={{ color: 'var(--clr-text-muted)', fontSize: '0.75rem', minWidth: 55 }}>CID:</span>
                                    <code className="hash-text" style={{ color: 'var(--clr-secondary-light)' }}>{shortenHash(doc.cid, 10)}</code>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        style={{ padding: '0.125rem 0.5rem', fontSize: '0.75rem' }}
                                        onClick={() => { copyToClipboard(doc.cid); toast.success('CID copied!'); }}
                                        title="Copy CID"
                                    >
                                        📋
                                    </button>
                                </div>
                                {/* Timestamp */}
                                <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)', marginTop: '0.25rem' }}>
                                    🕐 {formatTimestamp(doc.timestamp)}
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, flexWrap: 'wrap' }}>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setQrDoc(doc)}
                                    title="Show QR Code"
                                >
                                    📱 QR
                                </button>
                                {doc.pinataUrl && (
                                    <a
                                        href={doc.pinataUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-ghost btn-sm"
                                        title="View on IPFS"
                                    >
                                        🌐 IPFS
                                    </a>
                                )}
                                {doc.txHash && (
                                    <a
                                        href={polygonscanUrl('tx', doc.txHash)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-secondary btn-sm"
                                        title="View on Polygonscan"
                                    >
                                        ⛓️ Tx
                                    </a>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* QR Modal */}
            <AnimatePresence>
                {qrDoc && <QRModal cid={qrDoc.cid} onClose={() => setQrDoc(null)} />}
            </AnimatePresence>
        </>
    );
}
