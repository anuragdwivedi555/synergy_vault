import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import type { WalletState } from '../types';
import { SUPPORTED_CHAIN_ID } from '../types';


declare global {
    interface Window {
        ethereum?: any;
    }
}

const AMOY_CHAIN = {
    chainId: '0x13882', // 80002 hex
    chainName: 'Polygon Amoy Testnet',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: ['https://polygon-amoy.infura.io/v3/9ee8a68f33e54ef18ac51210fb67bfbd'],
    blockExplorerUrls: ['https://amoy.polygonscan.com'],
};

export function useWallet() {
    const [state, setState] = useState<WalletState>({
        address: null,
        chainId: null,
        isConnected: false,
        isConnecting: false,
        error: null,
    });

    const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
    const [signer, setSigner] = useState<ethers.Signer | null>(null);

    // Auto reconnect on load if already connected
    useEffect(() => {
        if (window.ethereum) {
            window.ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
                if (accounts.length > 0) {
                    handleConnect(true);
                }
            });

            window.ethereum.on('accountsChanged', (accounts: string[]) => {
                if (accounts.length === 0) {
                    disconnect();
                } else {
                    setState((prev) => ({ ...prev, address: accounts[0] }));
                }
            });

            window.ethereum.on('chainChanged', () => {
                window.location.reload();
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleConnect = useCallback(async (silent = false) => {
        if (!window.ethereum) {
            toast.error('MetaMask not detected. Please install MetaMask!');
            setState((prev) => ({ ...prev, error: 'MetaMask not found' }));
            return;
        }

        setState((prev) => ({ ...prev, isConnecting: true, error: null }));

        try {
            const web3Provider = new ethers.BrowserProvider(window.ethereum);
            const accounts = await web3Provider.send('eth_requestAccounts', []);
            const web3Signer = await web3Provider.getSigner();
            const network = await web3Provider.getNetwork();
            const chainId = Number(network.chainId);

            setProvider(web3Provider);
            setSigner(web3Signer);
            setState({
                address: accounts[0],
                chainId,
                isConnected: true,
                isConnecting: false,
                error: null,
            });

            if (!silent) toast.success(`🔗 Wallet connected: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`);

            // Warn if wrong network
            if (chainId !== SUPPORTED_CHAIN_ID) {
                toast.warning(`⚠️ Please switch to Polygon Amoy (ChainID: ${SUPPORTED_CHAIN_ID})`);
            }
        } catch (err: any) {
            const msg = err?.message || 'Failed to connect wallet';
            setState((prev) => ({ ...prev, isConnecting: false, error: msg }));
            if (!silent) toast.error(`❌ ${msg}`);
        }
    }, []);

    const switchToAmoy = useCallback(async () => {
        if (!window.ethereum) {
            toast.error('MetaMask not detected. Install MetaMask to add Polygon Amoy.');
            return;
        }

        try {
            const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
            if (currentChainId === AMOY_CHAIN.chainId) {
                toast.success('Polygon Amoy is already available in MetaMask.');
                return;
            }

            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: AMOY_CHAIN.chainId }],
            });
            toast.success('Switched MetaMask to Polygon Amoy.');
        } catch (switchError: any) {
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [AMOY_CHAIN],
                    });
                    toast.success('Polygon Amoy has been added to MetaMask.');
                } catch (addErr) {
                    toast.error('Failed to add Polygon Amoy network');
                }
                return;
            }

            toast.error(switchError?.message || 'Failed to switch to Polygon Amoy');
        }
    }, []);

    const disconnect = useCallback(() => {
        setProvider(null);
        setSigner(null);
        setState({ address: null, chainId: null, isConnected: false, isConnecting: false, error: null });
        toast.info('Wallet disconnected');
    }, []);

    const formatAddress = (addr: string | null) => {
        if (!addr) return '';
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    return {
        ...state,
        provider,
        signer,
        connect: () => handleConnect(false),
        disconnect,
        switchToAmoy,
        formatAddress,
        isWrongNetwork: state.chainId !== null && state.chainId !== SUPPORTED_CHAIN_ID,
    };
}
