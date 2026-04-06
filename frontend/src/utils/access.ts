import { ethers } from 'ethers';
import { BACKEND_URL, SUPPORTED_CHAIN_ID } from '../types';

function storageKey(wallet: string) {
    return `synergyvault_access_token_${wallet.toLowerCase()}`;
}

function decodeBase64Url(input: string): string {
    const normalized = input
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(Math.ceil(input.length / 4) * 4, '=');

    return atob(normalized);
}

function readTokenPayload(token: string): { wallet: string; exp: number } | null {
    try {
        const [payloadPart] = token.split('.');
        if (!payloadPart) return null;
        return JSON.parse(decodeBase64Url(payloadPart));
    } catch {
        return null;
    }
}

export function clearAccessToken(wallet?: string | null) {
    if (!wallet) return;
    sessionStorage.removeItem(storageKey(wallet));
}

export async function readApiResponse<T extends { success?: boolean; error?: string }>(
    response: Response,
    fallbackError: string
): Promise<T> {
    const body = await response.text();

    if (!body) {
        return {
            success: false,
            error: `${fallbackError} (HTTP ${response.status})`,
        } as T;
    }

    try {
        return JSON.parse(body) as T;
    } catch {
        return {
            success: false,
            error: fallbackError,
        } as T;
    }
}

export async function getAccessToken(signer: ethers.Signer): Promise<string> {
    const wallet = await signer.getAddress();
    const cachedToken = sessionStorage.getItem(storageKey(wallet));
    const cachedPayload = cachedToken ? readTokenPayload(cachedToken) : null;

    if (
        cachedToken &&
        cachedPayload &&
        cachedPayload.wallet?.toLowerCase() === wallet.toLowerCase() &&
        cachedPayload.exp > Date.now() + 10_000
    ) {
        return cachedToken;
    }

    const challengeRes = await fetch(`${BACKEND_URL}/access/challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet }),
    });
    const challengeData = await readApiResponse<{
        success?: boolean;
        error?: string;
        message?: string;
    }>(challengeRes, 'Authority login challenge returned an invalid response');
    if (!challengeRes.ok || !challengeData.success) {
        throw new Error(challengeData.error || 'Failed to start authority login');
    }
    if (!challengeData.message) {
        throw new Error('Authority login challenge response is missing a message');
    }

    const signature = await signer.signMessage(challengeData.message);

    const loginRes = await fetch(`${BACKEND_URL}/access/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet, signature }),
    });
    const loginData = await readApiResponse<{
        success?: boolean;
        error?: string;
        token?: string;
    }>(loginRes, 'Authority login returned an invalid response');
    if (!loginRes.ok || !loginData.success) {
        throw new Error(loginData.error || 'Authority login failed');
    }
    if (!loginData.token) {
        throw new Error('Authority login response is missing a session token');
    }

    sessionStorage.setItem(storageKey(wallet), loginData.token);
    return loginData.token;
}

export function buildGrantMessage({
    ownerWallet,
    granteeWallet,
    expiresAt,
}: {
    ownerWallet: string;
    granteeWallet: string;
    expiresAt: string;
}) {
    return [
        'SynergyVault Document Access Grant',
        `Owner: ${ownerWallet}`,
        `Grantee: ${granteeWallet}`,
        'Scope: documents',
        `Expires At: ${expiresAt}`,
        `Chain Id: ${SUPPORTED_CHAIN_ID}`,
    ].join('\n');
}
