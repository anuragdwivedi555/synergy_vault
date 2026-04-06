import { motion } from 'framer-motion';
import type { WalletState } from '../types';
import logo from '../assets/logo.png';

interface NavbarProps {
    wallet: WalletState & {
        connect: () => void;
        disconnect: () => void;
        switchToAmoy: () => void;
        isWrongNetwork: boolean;
        formatAddress: (a: string | null) => string;
    };
    currentPage: 'landing' | 'dashboard' | 'authority';
    onNavigate: (page: 'landing' | 'dashboard' | 'authority') => void;
}

export function Navbar({ wallet, currentPage, onNavigate }: NavbarProps) {
    const alternatePage = currentPage === 'authority' ? 'dashboard' : 'authority';

    return (
        <motion.nav
            initial={{ y: -18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            style={{
                position: 'fixed',
                top: 12,
                left: 0,
                right: 0,
                margin: '0 auto',
                width: 'calc(100% - 2rem)',
                maxWidth: 1240,
                zIndex: 'var(--z-overlay)' as any,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                padding: '0.85rem 1rem',
                borderRadius: '1.4rem',
                border: '1px solid rgba(117, 201, 255, 0.14)',
                background: 'rgba(5, 14, 27, 0.82)',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.28)',
                backdropFilter: 'blur(22px)',
                WebkitBackdropFilter: 'blur(22px)',
            }}
        >
            <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onNavigate('landing')}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.9rem',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: 'inherit',
                }}
            >
                <img
                    src={logo}
                    alt="SynergyVault Logo"
                    style={{
                        width: 56,
                        height: 56,
                        objectFit: 'contain'
                    }}
                />
                <div style={{ textAlign: 'left' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.08rem', letterSpacing: '-0.03em' }}>
                        Synergy<span className="text-gradient">Vault</span>
                    </div>
                    <div style={{ color: 'var(--clr-text-faint)', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
                        Secure record chamber
                    </div>
                </div>
            </motion.button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {wallet.isConnected && wallet.isWrongNetwork && (
                    <button className="btn btn-secondary btn-sm" onClick={wallet.switchToAmoy}>
                        Switch to Amoy
                    </button>
                )}

                {currentPage === 'landing' ? (
                    <>
                        <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('authority')}>
                            Authority Portal
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('dashboard')}>
                            Enter Vault
                        </button>
                    </>
                ) : (
                    <button className="btn btn-ghost btn-sm" onClick={() => onNavigate(alternatePage)}>
                        {currentPage === 'authority' ? 'User Vault' : 'Authority Portal'}
                    </button>
                )}

                {wallet.isConnected ? (
                    <>
                        <div
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.55rem',
                                padding: '0.6rem 0.9rem',
                                borderRadius: '999px',
                                background: 'rgba(8, 22, 39, 0.86)',
                                border: '1px solid rgba(114, 212, 255, 0.2)',
                                color: 'var(--clr-text-secondary)',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.8rem',
                            }}
                        >
                            <span className="vault-status-dot" />
                            {wallet.formatAddress(wallet.address)}
                        </div>
                        <button className="btn btn-ghost btn-sm" onClick={wallet.disconnect}>
                            Disconnect
                        </button>
                    </>
                ) : (
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={wallet.connect}
                        disabled={wallet.isConnecting}
                    >
                        {wallet.isConnecting ? 'Connecting' : 'Connect Wallet'}
                    </button>
                )}
            </div>
        </motion.nav>
    );
}
