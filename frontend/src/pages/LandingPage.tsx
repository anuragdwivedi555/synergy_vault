import { motion } from 'framer-motion';


interface LandingPageProps {
    onLaunch: () => void;
    onConnect: () => void;
    isConnected: boolean;
}

const features = [
    { icon: '🔐', title: 'Tamper-Proof Storage', desc: 'SHA-256 hashes anchored on the Polygon blockchain — any modification is immediately detectable.' },
    { icon: '📁', title: 'IPFS Document Storage', desc: 'Documents stored on decentralized IPFS via Pinata. Your files are always retrievable, anywhere.' },
    { icon: '⚡', title: 'Instant Verification', desc: 'Re-upload any document to verify its authenticity against the on-chain record in seconds.' },
    { icon: '🏛️', title: 'SDG-16 Aligned', desc: 'Promoting transparent, auditable, and trustless validation of legal records for justice systems.' },
    { icon: '🌐', title: 'Decentralized & Open', desc: 'No central authority. No single point of failure. Smart contract governance on Polygon.' },
    { icon: '🔑', title: 'Self-Sovereign', desc: 'Only your MetaMask wallet can submit documents. Your documents, your keys, your control.' },
];

const stats = [
    { value: '0 ms', label: 'Verification Time' },
    { value: 'SHA-256', label: 'Hash Standard' },
    { value: 'IPFS', label: 'Immutable Storage' },
    { value: 'SDG-16', label: 'UN Goal Aligned' },
];

export function LandingPage({ onLaunch, onConnect, isConnected }: LandingPageProps) {
    return (
        <div>
            {/* ── Hero ─────────────────────────────────────────────────────── */}
            <section style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '100px clamp(1rem, 5vw, 4rem) 4rem',
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Background glow */}
                <div style={{
                    position: 'absolute',
                    top: '-20%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '800px',
                    height: '600px',
                    background: 'radial-gradient(ellipse, rgba(139,92,246,0.2) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }} />

                {/* SDG Badge */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    style={{ marginBottom: '1.5rem' }}
                >
                    <span className="badge badge-primary">
                        🌍 United Nations SDG-16 Aligned
                    </span>
                </motion.div>

                {/* Vault Icon */}
                <motion.div
                    animate={{ y: [0, -12, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ fontSize: 'clamp(4rem, 10vw, 6rem)', marginBottom: '1.5rem', lineHeight: 1 }}
                >
                    🔐
                </motion.div>

                {/* Headline */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.1 }}
                    style={{ marginBottom: '1.25rem' }}
                >
                    <span className="text-gradient">Synergy Vault</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.2 }}
                    style={{
                        fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
                        maxWidth: '680px',
                        marginBottom: '2.5rem',
                        color: 'var(--clr-text-secondary)',
                        lineHeight: 1.8,
                    }}
                >
                    A tamper-proof, blockchain-based eVault for storing and verifying legal documents on the <strong style={{ color: 'var(--clr-primary-light)' }}>Polygon Mumbai Testnet</strong>. Powered by IPFS, secured by cryptography.
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.3 }}
                    style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}
                >
                    <motion.button
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        className="btn btn-primary btn-lg animate-pulse-glow"
                        onClick={onLaunch}
                    >
                        🚀 Launch App
                    </motion.button>
                    {!isConnected && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            className="btn btn-secondary btn-lg"
                            onClick={onConnect}
                        >
                            🦊 Connect Wallet
                        </motion.button>
                    )}
                </motion.div>

                {/* Tech Stack Pills */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '2.5rem' }}
                >
                    {['Polygon', 'IPFS', 'Solidity', 'React', 'ethers.js', 'MetaMask'].map((t) => (
                        <span key={t} className="badge badge-cyan">{t}</span>
                    ))}
                </motion.div>
            </section>

            {/* ── Stats Bar ────────────────────────────────────────────────── */}
            <section style={{ padding: '2rem clamp(1rem, 5vw, 4rem)', borderTop: '1px solid var(--clr-border)', borderBottom: '1px solid var(--clr-border)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '2rem', maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
                    {stats.map((s, i) => (
                        <motion.div
                            key={s.label}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <div style={{ fontSize: '1.75rem', fontWeight: 700, fontFamily: 'var(--font-display)', background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                {s.value}
                            </div>
                            <div style={{ color: 'var(--clr-text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>{s.label}</div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ── Features Grid ────────────────────────────────────────────── */}
            <section className="section">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    style={{ textAlign: 'center', marginBottom: '3rem' }}
                >
                    <h2>Why <span className="text-gradient">Synergy Vault</span>?</h2>
                    <p style={{ marginTop: '1rem', fontSize: '1.0625rem' }}>
                        Built for transparency, designed for trust.
                    </p>
                </motion.div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {features.map((f, i) => (
                        <motion.div
                            key={f.title}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.08 }}
                            whileHover={{ y: -4, scale: 1.01 }}
                            className="glass-card"
                            style={{ padding: '2rem', transition: 'transform 0.25s ease, box-shadow 0.25s ease' }}
                        >
                            <div style={{ fontSize: '2rem', marginBottom: '0.875rem' }}>{f.icon}</div>
                            <h3 style={{ marginBottom: '0.625rem', fontSize: '1.0625rem', fontWeight: 600 }}>{f.title}</h3>
                            <p style={{ fontSize: '0.9375rem', lineHeight: 1.7 }}>{f.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ── How It Works ─────────────────────────────────────────────── */}
            <section style={{ padding: '4rem clamp(1rem, 5vw, 4rem)', background: 'var(--clr-bg-secondary)', borderTop: '1px solid var(--clr-border)', borderBottom: '1px solid var(--clr-border)' }}>
                <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                    <motion.h2
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        style={{ textAlign: 'center', marginBottom: '3rem' }}
                    >
                        How It <span className="text-gradient">Works</span>
                    </motion.h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {[
                            { step: '01', title: 'Connect Wallet', desc: 'Link your MetaMask wallet to authenticate and sign transactions.' },
                            { step: '02', title: 'Upload Document', desc: 'Drag and drop your legal document. We compute a SHA-256 hash client-side.' },
                            { step: '03', title: 'Store on IPFS', desc: 'Your document is uploaded to IPFS via Pinata and pinned for permanent access.' },
                            { step: '04', title: 'Anchor on Blockchain', desc: 'Hash + CID stored on Polygon. Immutable, timestamped, and tied to your wallet.' },
                            { step: '05', title: 'Verify Anytime', desc: 'Re-upload any document to instantly verify its authenticity against the on-chain record.' },
                        ].map((item, i) => (
                            <motion.div
                                key={item.step}
                                initial={{ opacity: 0, x: -30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}
                            >
                                <div style={{
                                    minWidth: 52, height: 52,
                                    background: 'var(--gradient-primary)',
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontFamily: 'var(--font-display)',
                                    fontWeight: 700, fontSize: '0.875rem',
                                    color: 'white',
                                    flexShrink: 0,
                                    boxShadow: 'var(--glow-primary)',
                                }}>{item.step}</div>
                                <div>
                                    <h3 style={{ fontSize: '1rem', marginBottom: '0.375rem', fontWeight: 600 }}>{item.title}</h3>
                                    <p style={{ fontSize: '0.9375rem' }}>{item.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Footer ───────────────────────────────────────────────────── */}
            <footer style={{ padding: '2rem', textAlign: 'center', color: 'var(--clr-text-muted)', fontSize: '0.875rem', borderTop: '1px solid var(--clr-border)' }}>
                <p>Built for Hackathons · Aligned with <strong>UN SDG-16</strong> · Powered by Polygon + IPFS</p>
                <p style={{ marginTop: '0.5rem', opacity: 0.6 }}>SynergyVault © 2024 — Open Source</p>
            </footer>
        </div>
    );
}
