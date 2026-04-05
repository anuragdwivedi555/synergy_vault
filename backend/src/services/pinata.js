const axios = require("axios");
const FormData = require("form-data");

const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET = process.env.PINATA_SECRET_API_KEY;

/**
 * Upload a file buffer to Pinata IPFS.
 * @param {Buffer} fileBuffer - Raw file buffer
 * @param {string} filename   - Original file name
 * @param {object} [metadata] - Optional JSON metadata to pin alongside
 * @returns {Promise<{cid: string, pinataUrl: string}>}
 */
async function uploadToPinata(fileBuffer, filename, metadata = {}) {
    const formData = new FormData();

    formData.append("file", fileBuffer, {
        filename,
        contentType: "application/octet-stream",
    });

    // Optional Pinata metadata
    const pinataMetadata = JSON.stringify({
        name: `SynergyVault-${filename}`,
        keyvalues: {
            app: "SynergyVault",
            ...metadata,
        },
    });
    formData.append("pinataMetadata", pinataMetadata);

    const pinataOptions = JSON.stringify({ cidVersion: 1 });
    formData.append("pinataOptions", pinataOptions);

    // Choose auth: JWT preferred, fall back to API key/secret
    const headers = {
        ...formData.getHeaders(),
        ...(PINATA_JWT
            ? { Authorization: `Bearer ${PINATA_JWT}` }
            : {
                pinata_api_key: PINATA_API_KEY,
                pinata_secret_api_key: PINATA_SECRET,
            }),
    };

    const response = await axios.post(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        formData,
        { headers, maxBodyLength: Infinity }
    );

    const cid = response.data.IpfsHash;
    return {
        cid,
        pinataUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
        ipfsUrl: `ipfs://${cid}`,
    };
}

/**
 * Upload a JSON object to Pinata.
 * @param {object} json     - JSON to pin
 * @param {string} name     - Pin name
 * @returns {Promise<{cid: string}>}
 */
async function uploadJsonToPinata(json, name = "metadata") {
    const headers = PINATA_JWT
        ? { Authorization: `Bearer ${PINATA_JWT}` }
        : {
            pinata_api_key: PINATA_API_KEY,
            pinata_secret_api_key: PINATA_SECRET,
        };

    const response = await axios.post(
        "https://api.pinata.cloud/pinning/pinJSONToIPFS",
        { pinataContent: json, pinataMetadata: { name } },
        { headers }
    );

    return { cid: response.data.IpfsHash };
}

module.exports = { uploadToPinata, uploadJsonToPinata };
