// Smart Contract ABI for DocumentVault
export const DOCUMENT_VAULT_ABI = [
    // Events
    "event DocumentAdded(bytes32 indexed hash, string cid, address indexed owner, uint256 timestamp)",
    "event DocumentVerified(bytes32 indexed hash, address indexed caller, bool found)",

    // Write functions
    "function addDocument(bytes32 hash, string calldata cid) external",

    // Read functions
    "function verifyDocument(bytes32 hash) external returns (bool valid, string memory cid, address owner, uint256 timestamp)",
    "function verifyDocumentView(bytes32 hash) external view returns (bool valid, string memory cid, address owner, uint256 timestamp)",
    "function getUserDocuments(address user) external view returns (tuple(bytes32 hash, string cid, address owner, uint256 timestamp, bool exists)[] memory docs)",
    "function getDocumentCount() external view returns (uint256 count)",
    "function documentExists(bytes32 hash) external view returns (bool)",
    "function admin() external view returns (address)",
    "function totalDocuments() external view returns (uint256)",
] as const;
