// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DocumentVault
 * @author SynergyVault Team
 * @notice Immutable on-chain registry for legal document hashes and IPFS CIDs.
 *         Aligned with SDG-16: Peace, Justice, and Strong Institutions.
 * @dev Documents are never stored on-chain in full; only a SHA-256 hash and IPFS CID
 *      are recorded, enabling tamper-proof verification without privacy compromise.
 */
contract DocumentVault {
    // ─────────────────────────────────────────────────────────────────────────
    // Data Structures
    // ─────────────────────────────────────────────────────────────────────────

    struct Document {
        bytes32 hash;       // SHA-256 hash of the document (computed client-side)
        string  cid;        // IPFS Content Identifier (from Pinata/Web3.storage)
        address owner;      // Wallet address that submitted the document
        uint256 timestamp;  // Block timestamp at submission
        bool    exists;     // Guard flag to detect presence
    }

    // ─────────────────────────────────────────────────────────────────────────
    // State Variables
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Owner of the contract (admin)
    address public admin;

    /// @notice Map from document hash → Document record
    mapping(bytes32 => Document) private _documents;

    /// @notice Map from wallet address → list of their document hashes
    mapping(address => bytes32[]) private _userDocuments;

    /// @notice Total documents stored
    uint256 public totalDocuments;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Emitted when a new document is successfully added.
     * @param hash      SHA-256 hash of the document
     * @param cid       IPFS CID of the document
     * @param owner     Submitter's wallet address
     * @param timestamp Block timestamp of submission
     */
    event DocumentAdded(
        bytes32 indexed hash,
        string          cid,
        address indexed owner,
        uint256         timestamp
    );

    /**
     * @notice Emitted whenever a verification is attempted.
     * @param hash    The hash that was queried
     * @param caller  Address that triggered the verification
     * @param found   Whether the hash exists in the registry
     */
    event DocumentVerified(
        bytes32 indexed hash,
        address indexed caller,
        bool            found
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────────────────────────────────

    modifier onlyAdmin() {
        require(msg.sender == admin, "DocumentVault: caller is not admin");
        _;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    constructor() {
        admin = msg.sender;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Core Functions
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Store a new document record on-chain.
     * @dev    Reverts if the hash has already been registered (no duplicates).
     * @param  hash SHA-256 hash of the document as bytes32
     * @param  cid  IPFS CID string returned after uploading to Pinata
     */
    function addDocument(bytes32 hash, string calldata cid) external {
        require(hash != bytes32(0),          "DocumentVault: hash cannot be zero");
        require(bytes(cid).length > 0,       "DocumentVault: CID cannot be empty");
        require(!_documents[hash].exists,    "DocumentVault: document already exists");

        _documents[hash] = Document({
            hash:      hash,
            cid:       cid,
            owner:     msg.sender,
            timestamp: block.timestamp,
            exists:    true
        });

        _userDocuments[msg.sender].push(hash);
        totalDocuments++;

        emit DocumentAdded(hash, cid, msg.sender, block.timestamp);
    }

    /**
     * @notice Verify whether a document exists and retrieve its metadata.
     * @param  hash SHA-256 hash of the document to verify
     * @return valid     True if the document is registered
     * @return cid       IPFS CID of the document (empty string if not found)
     * @return owner     Wallet address of the original submitter
     * @return timestamp Block timestamp when the document was registered
     */
    function verifyDocument(bytes32 hash)
        external
        returns (
            bool    valid,
            string memory cid,
            address owner,
            uint256 timestamp
        )
    {
        Document storage doc = _documents[hash];
        valid     = doc.exists;
        cid       = doc.cid;
        owner     = doc.owner;
        timestamp = doc.timestamp;

        emit DocumentVerified(hash, msg.sender, valid);
    }

    /**
     * @notice Read-only verification (no event emitted) for off-chain checking.
     * @param  hash SHA-256 hash of the document to check
     * @return valid     True if the document is registered
     * @return cid       IPFS CID
     * @return owner     Original submitter address
     * @return timestamp Block timestamp of registration
     */
    function verifyDocumentView(bytes32 hash)
        external
        view
        returns (
            bool    valid,
            string memory cid,
            address owner,
            uint256 timestamp
        )
    {
        Document storage doc = _documents[hash];
        valid     = doc.exists;
        cid       = doc.cid;
        owner     = doc.owner;
        timestamp = doc.timestamp;
    }

    /**
     * @notice Get all documents uploaded by a specific wallet address.
     * @param  user Wallet address to query
     * @return docs Array of Document structs owned by the user
     */
    function getUserDocuments(address user)
        external
        view
        returns (Document[] memory docs)
    {
        bytes32[] storage hashes = _userDocuments[user];
        docs = new Document[](hashes.length);
        for (uint256 i = 0; i < hashes.length; i++) {
            docs[i] = _documents[hashes[i]];
        }
    }

    /**
     * @notice Get total number of documents stored across all users.
     * @return count Total document count
     */
    function getDocumentCount() external view returns (uint256 count) {
        return totalDocuments;
    }

    /**
     * @notice Check if a specific hash is already registered.
     * @param  hash SHA-256 hash to check
     * @return True if the hash exists
     */
    function documentExists(bytes32 hash) external view returns (bool) {
        return _documents[hash].exists;
    }

    /**
     * @notice Transfer admin role to a new address.
     * @param  newAdmin New admin wallet address
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "DocumentVault: zero address");
        admin = newAdmin;
    }
}
