require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const uploadRoutes = require("./routes/upload");
const verifyRoutes = require("./routes/verify");
const documentsRoutes = require("./routes/documents");
const { connectDB } = require("./services/database");

const app = express();
const PORT = process.env.PORT || 5000;

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim());

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error(`CORS blocked: ${origin}`));
            }
        },
        credentials: true,
    })
);

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// ─────────────────────────────────────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        service: "SynergyVault API",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────
app.use("/upload", uploadRoutes);
app.use("/verify", verifyRoutes);
app.use("/documents", documentsRoutes);

// ─────────────────────────────────────────────────────────────────────────────
// Global error handler
// ─────────────────────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error("[ERROR]", err.message);
    res.status(err.status || 500).json({
        success: false,
        error: err.message || "Internal server error",
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────────────────────────────────────
async function start() {
    // Optional: connect MongoDB if URI is provided
    if (process.env.MONGODB_URI) {
        await connectDB();
    } else {
        console.log("ℹ️  No MONGODB_URI set — metadata caching disabled");
    }

    app.listen(PORT, () => {
        console.log(`✅ SynergyVault API running on http://localhost:${PORT}`);
        console.log(`   Network: ${process.env.NODE_ENV || "development"}`);
    });
}

start().catch((err) => {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
});

module.exports = app;
