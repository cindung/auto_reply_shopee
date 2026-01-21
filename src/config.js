// src/config.js — Konfigurasi dari .env
require("dotenv").config({ quiet: true });

// ================== ENV UTAMA ==================
const HEADLESS = String(process.env.HEADLESS || "false").toLowerCase() === "true";
const SHOPEE_CHAT_URL = process.env.SHOPEE_CHAT_URL || "https://seller.shopee.co.id/new-webchat/conversations";

// ================== STORES ==================
const STORES_RAW = String(process.env.STORES || "TOKO1,TOKO2,TOKO3")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Build store config with name and emoji
const STORES = STORES_RAW.map((storeId) => {
  const name = process.env[`STORE_${storeId}_NAME`] || storeId;
  const emoji = process.env[`STORE_${storeId}_EMOJI`] || "●";
  const folder = storeId.toLowerCase(); // toko1, toko2, toko3
  return { id: storeId, name, emoji, folder };
});

// ================== REPLY ==================
const REPLY_LINES_RAW = process.env.REPLY_LINES || "ready kk kuh, d proses otomatis setelah checkout ya :)";
const REPLY_LINES = REPLY_LINES_RAW.split("||").map((s) => s.trim()).filter(Boolean);

// ================== TIMING ==================
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS) || 5000;
const REASSERT_FILTER_MS = parseInt(process.env.REASSERT_FILTER_MS) || 60000;

// ================== SCROLL ==================
const SCROLL_DOWN_STEPS = parseInt(process.env.SCROLL_DOWN_STEPS) || 4;
const SCROLL_DOWN_PIXELS = 600;
const SCROLL_UP_PIXELS = 2000;
const SCROLL_TOP_PASSES = 6;
const SCROLL_WAIT_MS = 400;

// ================== LOG FORMAT ==================
const MAX_MSG_LENGTH = parseInt(process.env.MAX_MSG_LENGTH) || 25;
const MAX_USERNAME_LENGTH = parseInt(process.env.MAX_USERNAME_LENGTH) || 18;

// ================== PATHS ==================
const DATA_DIR = "./data";
const BROWSER_DATA_DIR = "./browser-data";
const LOGS_DIR = "./logs";

module.exports = {
  HEADLESS,
  SHOPEE_CHAT_URL,
  STORES,
  REPLY_LINES,
  POLL_INTERVAL_MS,
  REASSERT_FILTER_MS,
  SCROLL_DOWN_STEPS,
  SCROLL_DOWN_PIXELS,
  SCROLL_UP_PIXELS,
  SCROLL_TOP_PASSES,
  SCROLL_WAIT_MS,
  MAX_MSG_LENGTH,
  MAX_USERNAME_LENGTH,
  DATA_DIR,
  BROWSER_DATA_DIR,
  LOGS_DIR,
};
