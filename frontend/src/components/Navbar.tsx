

import { motion } from 'framer-motion';
import type { WalletState } from '../types';

interface NavbarProps {
    wallet: WalletState & {
        connect: () => void;
        disconnect: () => void;
        switchToMumbai: () => void;
        isWrongNetwork: boolean;
        formatAddress: (a: string | null) => string;
    };
    currentPage: 'landing' | 'dashboard';
    onNavigate: (page: 'landing' | 'dashboard') => void;
}

export function Navbar({ wallet, currentPage, onNavigate }: NavbarProps) {
    return (
        <motion.nav
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{
                position: 'fixed',
                top: 0, left: 0, right: 0,
                zIndex: 'var(--z-overlay)' as any,
                padding: '0 clamp(1rem, 3vw, 2rem)',
                height: '70px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(7, 11, 20, 0.85)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderBottom: '1px solid var(--clr-border)',
            }}
        >
            {/* Logo */}
            <motion.button
                whileHover={{ scale: 1.03 }}
                onClick={() => onNavigate('landing')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.625rem' }}
            >
                <div style={{
                    width: 36, height: 36,
                    background: 'var(--gradient-primary)',
                    borderRadius: '10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.1rem',
                    boxShadow: 'var(--glow-primary)',
                }}>🔐</div>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.125rem', color: 'var(--clr-text-primary)' }}>
                    Synergy<span style={{ color: 'var(--clr-primary-light)' }}>Vault</span>
                </span>
            </motion.button>

            {/* Desktop Nav */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                {/* Wrong network warning */}
                {wallet.isConnected && wallet.isWrongNetwork && (
                    <motion.button
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="btn btn-sm"
                        onClick={wallet.switchToMumbai}
                        style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.4)' }}
                    >
                        ⚠️ Switch Network
                    </motion.button>
                )}

                {/* Launch App button */}
                {currentPage === 'landing' && (
                    <motion.button
                        whileHover={{ scale: 1.03 }}
                        className="btn btn-secondary btn-sm"
                        onClick={() => onNavigate('dashboard')}
                    >
                        Launch App
                    </motion.button>
                )}

                {/* Wallet button */}
                {wallet.isConnected ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.375rem 0.875rem',
                            background: 'rgba(139,92,246,0.1)',
                            border: '1px solid rgba(139,92,246,0.3)',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.875rem',
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--clr-primary-light)',
                        }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--clr-success)', display: 'inline-block' }} />
                            {wallet.formatAddress(wallet.address)}
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            className="btn btn-ghost btn-sm"
                            onClick={wallet.disconnect}
                        >
                            Disconnect
                        </motion.button>
                    </div>
                ) : (
                    <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="btn btn-primary btn-sm"
                        onClick={wallet.connect}
                        disabled={wallet.isConnecting}
                    >
                        {wallet.isConnecting ? '⏳ Connecting...' : '🦊 Connect Wallet'}
                    </motion.button>
                )}
            </div>
        </motion.nav>
    );
}
