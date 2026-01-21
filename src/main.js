// src/main.js — Entry point
const config = require("./config");
const logger = require("./logger");
const store = require("./store");
const fs = require("fs");

// ================== GRACEFUL SHUTDOWN ==================
let isShuttingDown = false;

function setupShutdown() {
    const shutdown = () => {
        if (isShuttingDown) return;
        isShuttingDown = true;
        logger.printShutdown();
        process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
    process.on("uncaughtException", (err) => {
        logger.logError(null, `Uncaught exception: ${err.message}`);
        shutdown();
    });
}

// ================== ENSURE DIRECTORIES ==================
function ensureDirectories() {
    const dirs = [config.DATA_DIR, config.BROWSER_DATA_DIR, config.LOGS_DIR];
    for (const dir of dirs) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
}

// ================== PROGRESS BAR SIMULATION ==================
async function showStartupProgress() {
    console.log("");
    console.log("🔄 Initializing...");
    console.log("");

    // Step 1: Loading config
    logger.printProgress("Loading config", 100, 100);

    // Step 2: Opening browsers
    logger.printProgress("Preparing stores", 100, 100);

    // Step 3: Ready
    logger.printProgress("Ready to start", 100, 100);

    console.log("");
}

// ================== MAIN ==================
async function main() {
    // Setup shutdown handler
    setupShutdown();

    // Ensure directories exist
    ensureDirectories();

    // Print banner
    logger.printBanner();

    // Check stores
    if (!config.STORES.length) {
        console.log("❌ STORES kosong. Isi STORES di .env");
        process.exit(1);
    }

    // Show progress
    await showStartupProgress();

    // Print store info
    console.log(`📦 Stores: ${config.STORES.map(s => `${s.emoji} ${s.name}`).join(", ")}`);
    console.log(`💬 Reply: ${config.REPLY_LINES.join(" | ")}`);
    console.log(`⏱️  Re-assert filter: setiap ${Math.round(config.REASSERT_FILTER_MS / 1000)} detik`);
    console.log("");

    // Show waiting login message
    logger.logWaitingLogin(config.STORES);

    // Print log header
    logger.printLogHeader();

    // Run all stores in parallel
    await Promise.all(
        config.STORES.map((storeConfig) =>
            store.runStore(storeConfig).catch((e) => {
                logger.logError(storeConfig, `Fatal: ${e.message}`);
            })
        )
    );
}

// Run
main().catch((err) => {
    console.error("❌ Fatal error:", err);
    process.exit(1);
});
