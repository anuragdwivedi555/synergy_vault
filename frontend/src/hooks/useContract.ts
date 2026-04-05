import { useCallback } from 'react';
import { ethers } from 'ethers';
import { DOCUMENT_VAULT_ABI } from '../contracts/abi';
import { CONTRACT_ADDRESS } from '../types';

export function useContract(signer: ethers.Signer | null, provider: ethers.BrowserProvider | null) {
    const getContract = useCallback(
        (writeable = false) => {
            if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
                throw new Error('Contract address not configured. Deploy the contract first.');
            }
            const runner = writeable ? signer : provider;
            if (!runner) throw new Error('Provider/signer not available');
            return new ethers.Contract(CONTRACT_ADDRESS, DOCUMENT_VAULT_ABI, runner);
        },
        [signer, provider]
    );

    const addDocument = useCallback(
        async (hashHex: string, cid: string) => {
            const contract = getContract(true);
            const tx = await contract.addDocument(hashHex, cid);
            return tx;
        },
        [getContract]
    );

    const verifyDocument = useCallback(
        async (hashHex: string) => {
            const contract = getContract(false);
            return contract.verifyDocumentView(hashHex);
        },
        [getContract]
    );

    const getUserDocuments = useCallback(
        async (address: string) => {
            const contract = getContract(false);
            return contract.getUserDocuments(address);
        },
        [getContract]
    );

    return { addDocument, verifyDocument, getUserDocuments };
}
