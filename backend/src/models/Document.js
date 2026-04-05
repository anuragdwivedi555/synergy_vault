const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
    {
        hash: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        cid: {
            type: String,
            required: true,
        },
        owner: {
            type: String,
            required: true,
            lowercase: true,
            index: true,
        },
        filename: {
            type: String,
            required: true,
        },
        fileType: {
            type: String,
            enum: ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"],
        },
        fileSizeBytes: Number,
        tags: [String],
        txHash: String,        // blockchain transaction hash
        blockNumber: Number,
        timestamp: {
            type: Date,
            default: Date.now,
        },
        pinataUrl: String,
        ipfsUrl: String,
    },
    { timestamps: true }
);

module.exports = mongoose.model("Document", documentSchema);
