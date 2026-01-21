// src/selectors.js — Semua CSS selector Shopee (centralized)

// ================== CONVERSATION LIST ==================
const CONVERSATION_LIST = '[data-cy="webchat-conversation-list"]';
const CONVERSATION_LIST_WRAPPER = '[data-cy="webchat-conversation-list-wrapper"]';
const CONVERSATION_CELL = '[data-cy="webchat-conversation-cell-container"], ._76X82Hdj2p';

// ================== CHAT TITLE ==================
const CHAT_TITLE_CANDIDATES = [
    "._2-8iOrKyky[title]",
    "._2-8iOrKyky",
    '[data-cy="webchat-conversation-cell-container"] [title]',
    "[title]",
];

// ================== LOGIN ==================
const LOGIN_INDICATORS = 'input[name="loginKey"], input[type="password"], [data-testid*="login"]';

// ================== NAVIGATION ==================
const NAV_WRAPPER = 'div[role="navigation"], [data-cy="webchat-conversation-list-wrapper"]';

// ================== INPUT ==================
const CHAT_INPUT_TEXTAREA = "textarea:visible";
const CHAT_INPUT_CONTENTEDITABLE = '[contenteditable="true"]:visible';
const CHAT_INPUT_FALLBACK = "textarea, [contenteditable='true']";

module.exports = {
    CONVERSATION_LIST,
    CONVERSATION_LIST_WRAPPER,
    CONVERSATION_CELL,
    CHAT_TITLE_CANDIDATES,
    LOGIN_INDICATORS,
    NAV_WRAPPER,
    CHAT_INPUT_TEXTAREA,
    CHAT_INPUT_CONTENTEDITABLE,
    CHAT_INPUT_FALLBACK,
};
