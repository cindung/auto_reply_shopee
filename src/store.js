// src/store.js — Logic untuk handle 1 toko
const { chromium } = require("playwright");
const config = require("./config");
const selectors = require("./selectors");
const logger = require("./logger");
const utils = require("./utils");

// ================== NAVIGATION ==================
async function robustGoto(page, url) {
    try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
    } catch (err) {
        // Continue even if timeout
    }

    try {
        await Promise.race([
            page.waitForURL(/webchat\/conversations/i, { timeout: 30_000 }),
            page.waitForSelector(selectors.CONVERSATION_LIST, { timeout: 30_000 }),
            page.waitForSelector(selectors.LOGIN_INDICATORS, { timeout: 30_000 }),
        ]);
    } catch (err) {
        try {
            await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
        } catch (reloadErr) {
            logger.logError(null, `Reload failed: ${reloadErr.message}`);
        }
    }
}

async function isOnWebchat(page) {
    const selList = page.locator(
        `${selectors.CONVERSATION_LIST}, ${selectors.CONVERSATION_CELL}`
    );
    try {
        await selList.first().waitFor({ timeout: 5_000 });
        return true;
    } catch {
        return false;
    }
}

async function isOnLogin(page) {
    const loginSel = page.locator(selectors.LOGIN_INDICATORS);
    try {
        await loginSel.first().waitFor({ timeout: 5_000 });
        return true;
    } catch {
        return false;
    }
}

// ================== CLICK HELPERS ==================
async function safeClick(locator, { timeout = 10_000 } = {}) {
    await locator.first().waitFor({ timeout });
    try {
        await locator.first().click({ timeout });
        return true;
    } catch {
        try {
            await locator.first().evaluate((el) => el.click());
            return true;
        } catch {
            return false;
        }
    }
}

// ================== FILTER CLICK (GENERIK) ==================
async function clickFilter(page, filterText, store, { retries = 4 } = {}) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const wrapper = page.locator(selectors.CONVERSATION_LIST_WRAPPER);
            await wrapper.first().waitFor({ timeout: 10_000 });

            // Try getByText
            const byText = wrapper.getByText(filterText, { exact: true });
            if ((await byText.count()) > 0) {
                await safeClick(byText);
                await page.locator(selectors.CONVERSATION_LIST).first().waitFor({ timeout: 10_000 });
                logger.logInfo(store, `Klik '${filterText}' ✓`);
                return true;
            }

            // Try by role button
            const byRole = page.getByRole("button", { name: new RegExp(filterText, "i") }).first();
            if ((await byRole.count()) > 0) {
                await safeClick(byRole);
                logger.logInfo(store, `Klik '${filterText}' (role) ✓`);
                return true;
            }

            // Fallback: visible text
            const nav = page.locator(selectors.NAV_WRAPPER).first();
            const contains = nav.locator("div:visible", { hasText: filterText }).first();
            if ((await contains.count()) > 0) {
                await safeClick(contains);
                logger.logInfo(store, `Klik '${filterText}' (fallback) ✓`);
                return true;
            }

            throw new Error(`Elemen '${filterText}' belum ditemukan.`);
        } catch (e) {
            logger.logInfo(store, `Gagal klik '${filterText}' (attempt ${attempt}/${retries})`);
            await page.waitForTimeout(600 * attempt);
        }
    }
    logger.logError(store, `Tidak bisa menemukan/klik '${filterText}'`);
    return false;
}

async function ensureFilters(page, store) {
    logger.logInfo(store, "Re-assert filter: Semua Chat + Semua Pembeli");
    await clickFilter(page, "Semua Chat", store, { retries: 3 });
    await clickFilter(page, "Semua Pembeli", store, { retries: 3 });
}

// ================== CHAT TITLE ==================
async function takeChatTitle(parent) {
    for (const sel of selectors.CHAT_TITLE_CANDIDATES) {
        const el = parent.locator(sel).first();
        if ((await el.count()) > 0) {
            const t = (await el.getAttribute("title")) || ((await el.textContent()) || "").trim();
            if (t) return t;
        }
    }
    const txt = ((await parent.textContent()) || "").trim();
    return txt ? txt.slice(0, 40) : "(unknown)";
}

// ================== INPUT ==================
async function getChatInput(page) {
    const ta = page.locator(selectors.CHAT_INPUT_TEXTAREA).first();
    if ((await ta.count()) > 0) return ta;

    const ce = page.locator(selectors.CHAT_INPUT_CONTENTEDITABLE).first();
    if ((await ce.count()) > 0) return ce;

    return page.locator(selectors.CHAT_INPUT_FALLBACK).first();
}

// ================== SCROLL ==================
async function scrollListDownStep(page, store, step) {
    const list = page.locator(selectors.CONVERSATION_LIST);
    if ((await list.count()) === 0) return false;
    await list.first().hover().catch(() => { });
    await page.mouse.wheel(0, config.SCROLL_DOWN_PIXELS);
    await page.waitForTimeout(config.SCROLL_WAIT_MS);
    return true;
}

async function scrollListToTop(page, store) {
    const list = page.locator(selectors.CONVERSATION_LIST);
    if ((await list.count()) === 0) return;

    await list.first().hover().catch(() => { });
    for (let i = 0; i < config.SCROLL_TOP_PASSES; i++) {
        await page.mouse.wheel(0, -config.SCROLL_UP_PIXELS);
        await page.waitForTimeout(180);
    }
}

// ================== UNREAD DETECTION ==================
async function rowHasUnreadBubble(row) {
    const candidates = row
        .locator("span:visible, div:visible")
        .filter({ hasText: /^\s*\d+\s*$/ });

    const n = await candidates.count();
    if (n === 0) return false;

    const limit = Math.min(n, 3);
    for (let i = 0; i < limit; i++) {
        const el = candidates.nth(i);
        try {
            const box = await el.boundingBox();
            if (!box) continue;
            const smallEnough = box.width <= 50 && box.height <= 50;
            const notTooTiny = box.width >= 8 && box.height >= 8;
            if (smallEnough && notTooTiny) return true;
        } catch {
            // Continue
        }
    }
    return false;
}

async function scanUnreadOnce(page, store) {
    const rows = page.locator(selectors.CONVERSATION_CELL);
    const rowCount = await rows.count();
    if (rowCount === 0) return null;

    for (let i = 0; i < rowCount; i++) {
        const row = rows.nth(i);
        if (await rowHasUnreadBubble(row)) {
            return row;
        }
    }
    return null;
}

async function findFirstUnreadRow(page, store) {
    let found = await scanUnreadOnce(page, store);
    if (found) return found;

    for (let step = 1; step <= config.SCROLL_DOWN_STEPS; step++) {
        const did = await scrollListDownStep(page, store, step);
        if (!did) break;

        found = await scanUnreadOnce(page, store);
        if (found) return found;
    }

    await scrollListToTop(page, store);
    return null;
}

// ================== SEND REPLY ==================
async function sendReply(page) {
    const input = await getChatInput(page);
    await input.waitFor({ timeout: 10_000 });

    for (const line of config.REPLY_LINES) {
        await input.type(line, { delay: 40 });
        await input.press("Enter");
        await page.waitForTimeout(150);
    }
}

// ================== SET WINDOW TITLE ==================
async function setWindowTitle(page, title) {
    try {
        await page.evaluate((t) => {
            document.title = t;
        }, title);
    } catch {
        // Silent fail
    }
}

// ================== RUN STORE ==================
async function runStore(store) {
    const browserDataPath = utils.getBrowserDataPath(store.folder);

    logger.logInfo(store, `Starting browser...`);

    const context = await chromium.launchPersistentContext(browserDataPath, {
        headless: config.HEADLESS,
        args: [
            "--start-maximized",
            "--disable-blink-features=AutomationControlled",
            "--disable-features=IsolateOrigins,site-per-process",
        ],
        viewport: null,
        userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
        locale: "id-ID",
    });

    await context.addInitScript(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });

    // Load cookies if exists
    await utils.loadCookies(context, store.id);

    const page = await context.newPage();
    page.setDefaultTimeout(30_000);
    page.setDefaultNavigationTimeout(90_000);

    await robustGoto(page, config.SHOPEE_CHAT_URL);

    // Set window title AFTER page load (so it doesn't get overwritten)
    await setWindowTitle(page, `${store.emoji} ${store.name} - SILAKAN LOGIN`);

    // Keep updating title every 2 seconds while waiting for login
    const titleInterval = setInterval(async () => {
        try {
            await setWindowTitle(page, `${store.emoji} ${store.name} - SILAKAN LOGIN`);
        } catch {
            // Page might be navigating, ignore
        }
    }, 2000);

    // Login check
    if (await isOnLogin(page)) {
        logger.logInfo(store, `Menunggu login manual...`);
        await page.waitForSelector(selectors.CONVERSATION_CELL, { timeout: 5 * 60_000 });
        logger.logLoginSuccess(store);
    } else if (await isOnWebchat(page)) {
        logger.logLoginSuccess(store);
    } else {
        logger.logInfo(store, `Halaman belum terdeteksi, reload...`);
        await robustGoto(page, config.SHOPEE_CHAT_URL);
    }

    // Stop title interval
    clearInterval(titleInterval);

    // Update window title after login
    await setWindowTitle(page, `${store.emoji} ${store.name} - Shopee Seller Chat`);

    // Set filter awal
    await ensureFilters(page, store);

    // Save cookies
    await utils.saveCookies(context, store.id);

    // Initialize counter
    logger.initCounter(store.id);

    // Loop state
    let hist = utils.loadHistory(store.id);
    let lastEnsureAt = Date.now();

    while (true) {
        try {
            // Reset history per hari
            if (hist.date !== utils.todayStr()) {
                hist = { date: utils.todayStr(), set: new Set() };
                utils.saveHistory(store.id, hist);
            }

            // Pastikan tetap di webchat
            if (!(await isOnWebchat(page))) {
                logger.logInfo(store, `Bukan di webchat, kembali ke URL...`);
                await robustGoto(page, config.SHOPEE_CHAT_URL);
                await ensureFilters(page, store);
                lastEnsureAt = Date.now();
            }

            // Re-assert filter
            if (Date.now() - lastEnsureAt >= config.REASSERT_FILTER_MS) {
                await ensureFilters(page, store);
                lastEnsureAt = Date.now();
            }

            const unreadRow = await findFirstUnreadRow(page, store);

            if (unreadRow) {
                const chatId = await takeChatTitle(unreadRow);

                if (hist.set.has(chatId)) {
                    logger.log(store, chatId, null, "already replied", "skip");
                } else {
                    await safeClick(unreadRow);

                    // Get last message for log
                    let lastMessage = "";
                    try {
                        const msgEl = page.locator('[data-cy="webchat-message-content"], .message-content').last();
                        if ((await msgEl.count()) > 0) {
                            lastMessage = (await msgEl.textContent()) || "";
                        }
                    } catch {
                        // Silent
                    }

                    await sendReply(page);

                    logger.log(store, chatId, lastMessage.trim(), "reply sent", "success");
                    hist.set.add(chatId);
                    utils.saveHistory(store.id, hist);
                }

                await page.waitForTimeout(800);
                continue;
            }

            // No unread
            await page.waitForTimeout(config.POLL_INTERVAL_MS);
        } catch (err) {
            logger.logError(store, err?.message || String(err));
            try {
                await robustGoto(page, config.SHOPEE_CHAT_URL);
                await ensureFilters(page, store);
                lastEnsureAt = Date.now();
            } catch {
                // Silent
            }
            await page.waitForTimeout(3000);
        }
    }
}

module.exports = {
    runStore,
    robustGoto,
    isOnWebchat,
    isOnLogin,
    ensureFilters,
    setWindowTitle,
};
