// src/logger.js — Logging dengan warna, emoji, dan format rapi
const fs = require("fs");
const path = require("path");
const config = require("./config");

// ================== WARNA TERMINAL ==================
const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",

    // Foreground
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    gray: "\x1b[90m",
};

// ================== STORE COLORS ==================
const storeColors = {
    "🟢": colors.green,
    "🔵": colors.cyan,
    "🟡": colors.yellow,
    "●": colors.white,
};

// ================== REPLY COUNTERS ==================
const replyCounters = {};

function initCounter(storeId) {
    if (!replyCounters[storeId]) {
        replyCounters[storeId] = { replied: 0, skipped: 0, errors: 0 };
    }
}

function incrementCounter(storeId, type) {
    initCounter(storeId);
    replyCounters[storeId][type]++;
}

function getCounterString() {
    return config.STORES.map((s) => {
        initCounter(s.id);
        const count = replyCounters[s.id].replied;
        return `${s.emoji} ${s.name}: ${count}`;
    }).join(" | ");
}

// ================== LOG FILE ==================
function getLogFilePath() {
    const today = new Date().toISOString().slice(0, 10);
    return path.join(config.LOGS_DIR, `${today}.log`);
}

function writeToLogFile(message) {
    try {
        // Ensure logs directory exists
        if (!fs.existsSync(config.LOGS_DIR)) {
            fs.mkdirSync(config.LOGS_DIR, { recursive: true });
        }
        // Strip ANSI colors for file
        const cleanMessage = message.replace(/\x1b\[[0-9;]*m/g, "");
        fs.appendFileSync(getLogFilePath(), cleanMessage + "\n");
    } catch (err) {
        // Silent fail for log file
    }
}

// ================== HELPERS ==================
function getTimeString() {
    const now = new Date();
    return now.toTimeString().slice(0, 8);
}

function padEnd(str, len) {
    if (str.length >= len) return str.slice(0, len);
    return str + " ".repeat(len - str.length);
}

function truncate(str, maxLen) {
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen - 3) + "...";
}

// ================== BANNER ==================
function printBanner() {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 5);

    const banner = `
${colors.cyan}╔═══════════════════════════════════════════════════════════════════╗
║   ███████╗██╗  ██╗ ██████╗ ██████╗ ███████╗███████╗               ║
║   ██╔════╝██║  ██║██╔═══██╗██╔══██╗██╔════╝██╔════╝               ║
║   ███████╗███████║██║   ██║██████╔╝█████╗  █████╗                 ║
║   ╚════██║██╔══██║██║   ██║██╔═══╝ ██╔══╝  ██╔══╝                 ║
║   ███████║██║  ██║╚██████╔╝██║     ███████╗███████╗               ║
║   ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚══════╝╚══════╝               ║
║   🤖 AUTO-REPLY BOT v3.0  │  📅 ${dateStr} ${timeStr}                  ║
╚═══════════════════════════════════════════════════════════════════╝${colors.reset}
`;
    console.log(banner);
    writeToLogFile(banner);
}

// ================== PROGRESS BAR ==================
function printProgress(label, current, total) {
    const percent = Math.round((current / total) * 100);
    const filled = Math.round(percent / 5);
    const empty = 20 - filled;
    const bar = "█".repeat(filled) + "░".repeat(empty);
    const line = `   ${padEnd(label, 18)} [${bar}] ${padEnd(percent + "%", 4)}`;
    console.log(line);
}

// ================== LOG HEADER ==================
function printLogHeader() {
    console.log("");
    console.log(`${colors.bright}📺 Debug Log${colors.reset}                    [${getCounterString()}]`);
    console.log("");
    console.log(`${colors.dim}TIME       STORE            USERNAME              MESSAGE                 STATUS${colors.reset}`);
    console.log("");
}

// ================== MAIN LOG FUNCTION ==================
function log(store, username, message, status, statusType = "success") {
    const time = getTimeString();
    const storeLabel = `${store.emoji} ${store.name}`;
    const storeColor = storeColors[store.emoji] || colors.white;

    // Truncate and pad
    const usernamePadded = padEnd(truncate(username || "-", config.MAX_USERNAME_LENGTH), config.MAX_USERNAME_LENGTH);
    const messageTruncated = message ? `"${truncate(message, config.MAX_MSG_LENGTH)}"` : "-";
    const messagePadded = padEnd(messageTruncated, config.MAX_MSG_LENGTH + 2);

    // Status color
    let statusColor = colors.white;
    let statusIcon = "○";
    switch (statusType) {
        case "success":
            statusColor = colors.green;
            statusIcon = "✓";
            incrementCounter(store.id, "replied");
            break;
        case "skip":
            statusColor = colors.gray;
            statusIcon = "‖";
            incrementCounter(store.id, "skipped");
            break;
        case "error":
            statusColor = colors.red;
            statusIcon = "⚠";
            incrementCounter(store.id, "errors");
            break;
        case "scan":
            statusColor = colors.white;
            statusIcon = "○";
            break;
    }

    const line = `${time}   ${storeColor}${padEnd(storeLabel, 16)}${colors.reset} ${usernamePadded}   ${messagePadded}   ${statusColor}${statusIcon} ${status}${colors.reset}`;

    console.log(line);
    writeToLogFile(line);
}

// ================== STATUS LOGS ==================
function logWaitingLogin(stores) {
    console.log("");
    console.log(`${colors.yellow}⏳ Menunggu login...${colors.reset}`);
    console.log("");
    stores.forEach((s) => {
        console.log(`   ${s.emoji} ${padEnd(s.name, 12)} │ ⏳ Silakan login di window "${s.name}"...`);
    });
    console.log("");
    console.log(`${colors.dim}💡 Tip: Lihat judul window Chrome untuk tahu toko mana yang harus di-login${colors.reset}`);
    console.log("");
}

function logLoginSuccess(store) {
    console.log(`   ${store.emoji} ${padEnd(store.name, 12)} │ ${colors.green}✅ Login berhasil!${colors.reset}`);
}

function logInfo(store, message) {
    const time = getTimeString();
    const storeLabel = store ? `${store.emoji} ${store.name}` : "SYSTEM";
    console.log(`${colors.dim}[${time}] ${storeLabel} │ ${message}${colors.reset}`);
}

function logError(store, message) {
    const time = getTimeString();
    const storeLabel = store ? `${store.emoji} ${store.name}` : "SYSTEM";
    console.log(`${colors.red}[${time}] ${storeLabel} │ ⚠ ${message}${colors.reset}`);
    writeToLogFile(`[${time}] ${storeLabel} │ ERROR: ${message}`);
}

// ================== SHUTDOWN ==================
function printShutdown() {
    console.log("");
    console.log(`${colors.yellow}🛑 Shutting down...${colors.reset}`);
    console.log(`${colors.dim}👋 Goodbye! Logs saved to: ${getLogFilePath()}${colors.reset}`);
    console.log("");
}

module.exports = {
    colors,
    printBanner,
    printProgress,
    printLogHeader,
    log,
    logWaitingLogin,
    logLoginSuccess,
    logInfo,
    logError,
    printShutdown,
    getCounterString,
    initCounter,
};
