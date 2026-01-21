// src/utils.js — Fungsi-fungsi helper
const fs = require("fs");
const config = require("./config");

// ================== DATE ==================
function todayStr() {
    return new Date().toISOString().slice(0, 10);
}

// ================== HISTORY ==================
function getHistoryPath(storeId) {
    return `${config.DATA_DIR}/repliedChats_${storeId}.json`;
}

function loadHistory(storeId) {
    const historyFile = getHistoryPath(storeId);
    try {
        if (fs.existsSync(historyFile)) {
            const data = JSON.parse(fs.readFileSync(historyFile, "utf-8"));
            if (data.date === todayStr()) {
                return { date: data.date, set: new Set(data.chats) };
            }
        }
    } catch (err) {
        console.error(`Error loading history for ${storeId}:`, err.message);
    }
    return { date: todayStr(), set: new Set() };
}

function saveHistory(storeId, state) {
    const historyFile = getHistoryPath(storeId);
    try {
        // Ensure data directory exists
        if (!fs.existsSync(config.DATA_DIR)) {
            fs.mkdirSync(config.DATA_DIR, { recursive: true });
        }
        const payload = { date: state.date, chats: [...state.set] };
        fs.writeFileSync(historyFile, JSON.stringify(payload, null, 2));
    } catch (err) {
        console.error(`Error saving history for ${storeId}:`, err.message);
    }
}

// ================== COOKIES ==================
function getCookiesPath(storeId) {
    return `${config.DATA_DIR}/cookies-${storeId.toLowerCase()}.json`;
}

function normalizeCookiesForPlaywright(cookies = []) {
    const mapSameSite = (v) => {
        if (!v) return "Lax";
        const s = String(v).toLowerCase();
        if (s.includes("strict")) return "Strict";
        if (s.includes("none")) return "None";
        return "Lax";
    };
    return cookies.map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path || "/",
        httpOnly: !!c.httpOnly,
        secure: !!c.secure,
        expires: typeof c.expires === "number" ? c.expires : -1,
        sameSite: mapSameSite(c.sameSite),
    }));
}

async function loadCookies(context, storeId) {
    const cookiesFile = getCookiesPath(storeId);
    if (fs.existsSync(cookiesFile)) {
        try {
            const cookiesRaw = JSON.parse(fs.readFileSync(cookiesFile, "utf-8"));
            const cookies = normalizeCookiesForPlaywright(cookiesRaw);
            if (cookies.length) {
                await context.addCookies(cookies);
                return true;
            }
        } catch (err) {
            console.error(`Error loading cookies for ${storeId}:`, err.message);
        }
    }
    return false;
}

async function saveCookies(context, storeId) {
    const cookiesFile = getCookiesPath(storeId);
    try {
        // Ensure data directory exists
        if (!fs.existsSync(config.DATA_DIR)) {
            fs.mkdirSync(config.DATA_DIR, { recursive: true });
        }
        const cookies = await context.cookies();
        fs.writeFileSync(cookiesFile, JSON.stringify(cookies, null, 2));
    } catch (err) {
        console.error(`Error saving cookies for ${storeId}:`, err.message);
    }
}

// ================== BROWSER DATA PATH ==================
function getBrowserDataPath(folder) {
    return `${config.BROWSER_DATA_DIR}/${folder}`;
}

module.exports = {
    todayStr,
    loadHistory,
    saveHistory,
    getCookiesPath,
    loadCookies,
    saveCookies,
    getBrowserDataPath,
    normalizeCookiesForPlaywright,
};
