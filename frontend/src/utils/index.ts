/**
 * Compute SHA-256 hash of a file using the Web Crypto API.
 * Returns the hash as a 0x-prefixed hex string (bytes32 compatible).
 */
export async function computeFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return '0x' + hashHex;
}

/**
 * Format a Unix timestamp (seconds) to a human-readable date string.
 */
export function formatTimestamp(ts: string | number): string {
    const n = typeof ts === 'string' ? parseInt(ts, 10) : ts;
    if (!n || isNaN(n)) return 'Unknown';
    return new Date(n * 1000).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Shorten a long hash/CID for display.
 */
export function shortenHash(hash: string, chars = 8): string {
    if (!hash || hash.length <= chars * 2 + 3) return hash;
    return `${hash.slice(0, chars + 2)}...${hash.slice(-chars)}`;
}

/**
 * Copy text to clipboard with fallback.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        const el = document.createElement('textarea');
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        return true;
    }
}

/**
 * Format file size to human-readable string.
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
    return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

/**
 * Generate a Polygonscan URL for a transaction or address.
 */
export function polygonscanUrl(type: 'tx' | 'address', value: string): string {
    const base = import.meta.env.VITE_POLYGONSCAN_URL || 'https://mumbai.polygonscan.com';
    return `${base}/${type}/${value}`;
}
