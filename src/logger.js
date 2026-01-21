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
    console.log(`${colors.dim}DATE         TIME        STORE            USERNAME           MESSAGE                 STATUS${colors.reset}`);
    console.log("");
}

// ================== UNIFIED LOG FORMAT ==================
// Format: DATE  TIME  STORE  USERNAME  MESSAGE  STATUS
const COL_WIDTH = {
    DATE: 12,      // YYYY-MM-DD
    TIME: 11,      // [HH:MM:SS]
    STORE: 16,     // 🟢 Multi Zone
    USERNAME: 18,  // buyer name
    MESSAGE: 24,   // message preview
    STATUS: 12     // status text
};

function getDateString() {
    return new Date().toISOString().slice(0, 10);
}

function logRow(store, { username = "-", message = "-", status = "-", statusColor = null } = {}) {
    const date = getDateString();
    const time = `[${getTimeString()}]`;
    const storeLabel = `${store.emoji} ${store.name}`;
    const storeColor = storeColors[store.emoji] || colors.white;

    // Format each column
    const dateCol = padEnd(date, COL_WIDTH.DATE);
    const timeCol = padEnd(time, COL_WIDTH.TIME);
    const storeCol = padEnd(storeLabel, COL_WIDTH.STORE);
    const userCol = padEnd(truncate(username, COL_WIDTH.USERNAME - 2), COL_WIDTH.USERNAME);
    const msgCol = padEnd(message !== "-" ? truncate(message, COL_WIDTH.MESSAGE - 2) : "-", COL_WIDTH.MESSAGE);
    const statCol = status;

    // Apply colors
    const coloredStatus = statusColor ? `${statusColor}${statCol}${colors.reset}` : statCol;

    const line = `${dateCol} ${timeCol} ${storeColor}${storeCol}${colors.reset} ${userCol} ${msgCol} ${coloredStatus}`;
    console.log(line);
    writeToLogFile(line);
}

// Legacy log function (untuk kompatibilitas)
function log(store, username, message, status, statusType = "success") {
    let statusColor = colors.white;
    let statusIcon = "✓";

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
    }

    logRow(store, {
        username: username || "-",
        message: message || "-",
        status: `${statusIcon} ${status}`,
        statusColor
    });
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
    logRow(store, {
        status: `${colors.green}✅ Login${colors.reset}`
    });
}

function logInfo(store, message) {
    if (!store) {
        console.log(`${colors.dim}[${getTimeString()}] SYSTEM │ ${message}${colors.reset}`);
        return;
    }
    logRow(store, {
        message: message,
        status: "-"
    });
}

function logError(store, message) {
    const time = getTimeString();
    const storeLabel = store ? `${store.emoji} ${store.name}` : "SYSTEM";
    console.log(`${colors.red}[${time}] ${storeLabel} │ ⚠ ${message}${colors.reset}`);
    writeToLogFile(`[${time}] ${storeLabel} │ ERROR: ${message}`);
}

// ================== STATUS BAR LOG ==================
const STATUS_COLORS = {
    FILTER: colors.cyan,
    SCAN: colors.yellow,
    REPLY: colors.green,
    SKIP: colors.gray,
    ERROR: colors.red,
};

function logStatus(store, status, detail) {
    const colorFn = STATUS_COLORS[status] || colors.white;

    // Parse detail untuk extract username jika ada
    // Format: "username │ message" atau hanya "message"
    let username = "-";
    let message = "-";

    if (detail.includes("│")) {
        const parts = detail.split("│").map(s => s.trim());
        username = parts[0] || "-";
        message = parts[1] ? parts[1].replace(/[✓"]/g, '').trim() : "-";
    }

    logRow(store, {
        username: username,
        message: message,
        status: `${status} ✓`,
        statusColor: colorFn
    });
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
    logRow,
    logWaitingLogin,
    logLoginSuccess,
    logInfo,
    logError,
    logStatus,
    printShutdown,
    getCounterString,
    initCounter,
};
