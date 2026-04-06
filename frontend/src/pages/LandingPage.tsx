import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface LandingPageProps {
    onLaunch: () => void;
    onConnect: () => void;
    onAddAmoyNetwork: () => void;
    isConnected: boolean;
}

const controlMetrics = [
    {
        label: 'Integrity Layer',
        value: 'SHA-256',
        detail: 'Client-side hashing before chain anchoring.',
        popup: {
            title: 'SHA-256 Integrity Layer',
            body: 'Before any document is uploaded, SynergyVault runs a SHA-256 hash on your file entirely inside your browser — your file never leaves your device unprotected. This 64-character fingerprint is what makes the entire system tamper-evident. If even a single character changes inside the document later, the hash will be completely different, exposing any tampering instantly. This hash is what gets anchored on-chain and stored in Supabase.',
            tag: 'Cryptographic Security',
        },
    },
    {
        label: 'Storage Rail',
        value: 'IPFS + Pinata',
        detail: 'Documents pinned for decentralized retrieval.',
        popup: {
            title: 'IPFS + Pinata Storage Rail',
            body: 'Your documents are stored on IPFS (InterPlanetary File System), a decentralized peer-to-peer network. Unlike a traditional server, no single owner controls your files. Pinata acts as a pinning service, ensuring your files stay permanently accessible across the IPFS network and don\'t disappear over time. Every document gets a unique CID (Content Identifier) — a hash-based address — which is stored on-chain so the file can always be retrieved and verified.',
            tag: 'Decentralized Storage',
        },
    },
    {
        label: 'Network Lock',
        value: 'Polygon Amoy',
        detail: 'Proofs and ownership tied to wallet activity.',
        popup: {
            title: 'Polygon Amoy Network Lock',
            body: 'SynergyVault is deployed on the Polygon Amoy Testnet, an Ethereum-compatible blockchain optimized for fast, low-cost transactions. Every document upload writes the SHA-256 hash, IPFS CID, and your wallet address to a Smart Contract on this chain — creating an immutable, time-stamped proof of ownership that anyone can verify. The "Network Lock" means all document proofs are permanently tied to your MetaMask wallet identity on Polygon.',
            tag: 'Blockchain Layer',
        },
    },
    {
        label: 'Metadata Sync',
        value: 'Supabase',
        detail: 'On-chain hash mirrored in DB for rapid search and indexing.',
        popup: {
            title: 'Supabase Metadata Sync',
            body: 'While the blockchain is the ultimate source of truth, querying it directly for every search would be slow and expensive. This is where Supabase comes in — it\'s a PostgreSQL-based backend that mirrors key metadata: the document hash, its IPFS CID, wallet owner, upload timestamp, and duplicate fingerprints. This gives SynergyVault instant fast queries, duplicate detection, and authority access control, all while keeping the on-chain proof as the authoritative record that can\'t be altered.',
            tag: 'Metadata & Indexing',
        },
    },
    {
        label: 'Review Tunnel',
        value: 'Permit Based',
        detail: 'Authority access opens only through user approval.',
        popup: {
            title: 'Permit-Based Review Tunnel',
            body: 'The Review Tunnel is the access control layer for legal authorities. By default, no authority can view your documents. You must explicitly grant access by approving a specific authority wallet address. Once approved, the authority can enter the Authority Portal and request review of the documents you\'ve made available. You can revoke this access at any time — putting full ownership and privacy control in your hands, not the institution\'s.',
            tag: 'Access Control',
        },
    },
];


const featureModules = [
    { code: 'M-01', title: 'Vault-grade integrity', desc: 'Each upload becomes a cryptographic proof, making unauthorized edits visible immediately.' },
    { code: 'M-02', title: 'Decentralized file custody', desc: 'The document itself lives on IPFS while the verifiable fingerprint is anchored on-chain.' },
    { code: 'M-03', title: 'Fast proof-of-authenticity', desc: 'Verification is built into the workflow, so anyone permitted can validate records without paperwork loops.' },
    { code: 'M-04', title: 'Permission tunnel for review', desc: 'Users can open and revoke authority access without losing control of the underlying vault.' },
    { code: 'M-05', title: 'Duplicate protection by fingerprint', desc: 'Critical-content hashing helps reject repeated legal records before they pollute the vault.' },
    { code: 'M-06', title: 'Operational clarity', desc: 'Wallet state, chain status, upload flow, and access control all stay visible in one secure interface.' },
];

const workflow = [
    { step: '01', title: 'Seal the wallet session', detail: 'Connect MetaMask and switch to Polygon Amoy to activate the vault controls.' },
    { step: '02', title: 'Lock the document', detail: 'We fingerprint the document, protect against duplicates, and push the file to IPFS.' },
    { step: '03', title: 'Anchor the proof', detail: 'Hash and CID are written to the smart contract so the record becomes time-stamped and verifiable.' },
    { step: '04', title: 'Permit trusted review', detail: 'The user can grant a limited authority tunnel so approved parties can inspect the vault quickly.' },
];

export function LandingPage({ onLaunch, onConnect, onAddAmoyNetwork, isConnected }: LandingPageProps) {
    const [activeMetric, setActiveMetric] = useState<typeof controlMetrics[0] | null>(null);

    return (
        <main className="vault-shell">

            {/* Metric Popup Modal */}
            <AnimatePresence>
                {activeMetric && (
                    <motion.div
                        key="metric-modal-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setActiveMetric(null)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 500,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '1.5rem',
                            background: 'rgba(2, 7, 18, 0.75)',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                        }}
                    >
                        <motion.div
                            key="metric-modal-panel"
                            initial={{ opacity: 0, scale: 0.92, y: 24 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.92, y: 24 }}
                            transition={{ duration: 0.28, ease: 'easeOut' }}
                            onClick={(e) => e.stopPropagation()}
                            className="glass-card"
                            style={{
                                maxWidth: 520,
                                width: '100%',
                                padding: '2rem',
                                position: 'relative',
                            }}
                        >
                            <button
                                onClick={() => setActiveMetric(null)}
                                style={{
                                    position: 'absolute',
                                    top: '1rem',
                                    right: '1rem',
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '50%',
                                    width: 32,
                                    height: 32,
                                    cursor: 'pointer',
                                    color: 'var(--clr-text-secondary)',
                                    fontSize: '1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    lineHeight: 1,
                                }}
                            >
                                ×
                            </button>

                            <span
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    padding: '0.3rem 0.75rem',
                                    borderRadius: '999px',
                                    background: 'rgba(95, 224, 255, 0.1)',
                                    border: '1px solid rgba(95, 224, 255, 0.28)',
                                    color: '#91f4ff',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    letterSpacing: '0.14em',
                                    textTransform: 'uppercase',
                                    marginBottom: '1rem',
                                }}
                            >
                                {activeMetric.popup.tag}
                            </span>

                            <h3 style={{ fontSize: '1.35rem', marginBottom: '1rem', color: 'var(--clr-text-primary)' }}>
                                {activeMetric.popup.title}
                            </h3>

                            <p style={{ fontSize: '0.97rem', lineHeight: 1.85, color: 'var(--clr-text-secondary)' }}>
                                {activeMetric.popup.body}
                            </p>

                            <div
                                style={{
                                    marginTop: '1.5rem',
                                    paddingTop: '1rem',
                                    borderTop: '1px solid rgba(124, 190, 255, 0.12)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.6rem',
                                }}
                            >
                                <span style={{ color: 'var(--clr-text-faint)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                                    {activeMetric.label}
                                </span>
                                <span style={{ color: 'var(--clr-primary)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem' }}>
                                    {activeMetric.value}
                                </span>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <section className="vault-hero-section">
                <div className="vault-section vault-hero-grid">
                    <motion.div
                        className="vault-copy-stack"
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.55 }}
                    >
                        <span className="vault-kicker">Vault interface for legal records</span>

                        <div>
                            <h1 className="vault-title">
                                Build trust around every document entering the vault.
                            </h1>
                            <p className="vault-subtitle">
                                SynergyVault turns upload, storage, verification, and authority review into one secure chamber.
                                The goal is simple: the record stays immutable, the owner stays in control, and verification becomes fast.
                            </p>
                        </div>

                        <div className="vault-actions">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="btn btn-primary btn-lg animate-pulse-glow"
                                onClick={onLaunch}
                            >
                                Enter Vault
                            </motion.button>
                            {!isConnected && (
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="btn btn-secondary btn-lg"
                                    onClick={onConnect}
                                >
                                    Connect Wallet
                                </motion.button>
                            )}
                        </div>

                        <div className="glass-card vault-note-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                <div>
                                    <strong>Network prep</strong>
                                    <p style={{ marginTop: '0.35rem', fontSize: '0.92rem' }}>
                                        Add Polygon Amoy to MetaMask before you enter the live vault controls.
                                    </p>
                                </div>
                                <button className="btn btn-secondary btn-sm" onClick={onAddAmoyNetwork}>
                                    Add Polygon Amoy
                                </button>
                            </div>
                        </div>

                        <div className="vault-metrics-grid">
                            {controlMetrics.map((metric, index) => (
                                <motion.div
                                    key={metric.label}
                                    className="vault-stat-card"
                                    initial={{ opacity: 0, y: 18 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.12 * index }}
                                    onClick={() => setActiveMetric(metric)}
                                    whileHover={{ scale: 1.03, borderColor: 'rgba(113, 182, 255, 0.35)' }}
                                    style={{ cursor: 'pointer' }}
                                    title="Click to learn more"
                                >
                                    <span>{metric.label}</span>
                                    <strong>{metric.value}</strong>
                                    <p>{metric.detail}</p>
                                    <div style={{
                                        marginTop: '0.6rem',
                                        fontSize: '0.7rem',
                                        color: 'var(--clr-primary)',
                                        opacity: 0.7,
                                        letterSpacing: '0.1em',
                                        textTransform: 'uppercase',
                                    }}>
                                        Tap to learn more →
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>


                    <motion.div
                        className="glass-card vault-visual-shell"
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.15 }}
                    >
                        <div className="vault-status-chip">
                            <span className="vault-status-dot" />
                            Chamber online
                        </div>

                        <div className="vault-cylinder-scene">
                            <motion.div
                                className="vault-hud-panel vault-hud-panel--left"
                                initial={{ opacity: 0, x: -16 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.25 }}
                            >
                                <span>Blockchain security</span>
                                <strong>Amoy sealing active</strong>
                                <p>Every accepted record is paired with an on-chain proof.</p>
                            </motion.div>

                            <motion.div
                                className="vault-hud-panel vault-hud-panel--right"
                                initial={{ opacity: 0, x: 16 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.35 }}
                            >
                                <span>Vault control</span>
                                <strong>Authority permits gated</strong>
                                <p>Review tunnels open only when the user grants access.</p>
                            </motion.div>

                            <div className="vault-cylinder" />
                            <div className="vault-cylinder-base" />
                            <motion.div
                                className="vault-ring vault-ring--top"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
                            />
                            <motion.div
                                className="vault-ring vault-ring--mid"
                                animate={{ rotate: -360 }}
                                transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
                            />
                            <motion.div
                                className="vault-ring vault-ring--low"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                            />

                            <div className="vault-core-column">
                                <div className="vault-core-beam" />
                                <div className="vault-cube-grid">
                                    {Array.from({ length: 9 }).map((_, index) => (
                                        <motion.div
                                            key={index}
                                            className="vault-cube"
                                            animate={{ y: [0, index % 2 === 0 ? -12 : 10, 0] }}
                                            transition={{
                                                duration: 3 + index * 0.2,
                                                repeat: Infinity,
                                                ease: 'easeInOut',
                                                delay: index * 0.08,
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <motion.div
                                className="vault-lock-token"
                                animate={{ y: [0, -6, 0] }}
                                transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
                            >
                                Vault State
                                <strong>Locked</strong>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </section>

            <section className="vault-section vault-band">
                <div className="glass-card vault-header-board">
                    <div className="vault-section-head" style={{ marginBottom: '1.2rem' }}>
                        <div>
                            <span className="vault-kicker" style={{ marginBottom: '0.9rem' }}>Security modules</span>
                            <h2 style={{ maxWidth: '12ch' }}>Designed to feel like a real secure chamber.</h2>
                        </div>
                        <span className="badge badge-cyan">Polygon + IPFS + Wallet auth</span>
                    </div>

                    <div className="vault-feature-grid">
                        {featureModules.map((feature, index) => (
                            <motion.div
                                key={feature.code}
                                className="vault-feature-card"
                                initial={{ opacity: 0, y: 24 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, amount: 0.2 }}
                                transition={{ delay: index * 0.06 }}
                            >
                                <div className="vault-feature-meta">{feature.code}</div>
                                <h3>{feature.title}</h3>
                                <p>{feature.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="vault-section vault-section-block">
                <div className="glass-card vault-header-board">
                    <div className="vault-section-head">
                        <div>
                            <span className="vault-kicker" style={{ marginBottom: '0.9rem' }}>Workflow relay</span>
                            <h2 style={{ maxWidth: '11ch' }}>How the secure vault behaves end to end.</h2>
                        </div>
                        <p style={{ maxWidth: '28rem' }}>
                            We keep the flow simple for users while preserving strong integrity guarantees in the background.
                        </p>
                    </div>

                    <div className="vault-feature-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                        {workflow.map((item, index) => (
                            <motion.div
                                key={item.step}
                                className="vault-mini-panel"
                                initial={{ opacity: 0, y: 18 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, amount: 0.25 }}
                                transition={{ delay: index * 0.08 }}
                            >
                                <div className="vault-feature-meta">Step {item.step}</div>
                                <h3 style={{ marginBottom: '0.45rem' }}>{item.title}</h3>
                                <p>{item.detail}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            <footer className="vault-section" style={{ paddingTop: '2rem' }}>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        flexWrap: 'wrap',
                        padding: '1rem 0 0.4rem',
                        borderTop: '1px solid rgba(124, 190, 255, 0.12)',
                        color: 'var(--clr-text-faint)',
                        fontSize: '0.82rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.12em',
                    }}
                >
                    <span>SynergyVault secure interface</span>
                    <span>Built for trusted legal record verification</span>
                </div>
            </footer>
        </main>
    );
}
