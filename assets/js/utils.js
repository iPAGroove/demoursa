// assets/js/utils.js

import { __t, getLang } from "./i18n.js";

// === DOM Helpers ===
export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// === Formatting Helpers ===
export const prettyBytes = (n) => (!n ? "" : `${(n / 1e6).toFixed(0)} MB`);
export const escapeHTML = (s) => (s || "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[m]));

// === Time Ago Helper (из app.js) ===
export function formatTimeAgo(timestamp) {
    if (!timestamp || !timestamp.seconds) return "";
    const now = Date.now();
    const secondsPast = Math.floor((now - timestamp.toMillis()) / 1000);
    if (secondsPast < 60) return __t("time_just_now");
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };
    const currentLang = getLang();
    const getPluralKey = (n) => {
        if (currentLang === 'en') {
            return n === 1 ? '1' : '2';
        }
        const lastDigit = n % 10;
        const lastTwoDigits = n % 100;
        if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return '2';
        if (lastDigit === 1) return '';
        if (lastDigit >= 2 && lastDigit <= 4) return '1';
        return '2';
    };
    for (const [intervalName, intervalSeconds] of Object.entries(intervals)) {
        const count = Math.floor(secondsPast / intervalSeconds);
        if (count >= 1) {
            const pluralKey = getPluralKey(count);
            const key = `time_${intervalName}${pluralKey === '1' || pluralKey === '2' ? `s_${pluralKey}` : ''}`;
            return currentLang === 'ru'
                ? `${count} ${__t(key)} ${__t("time_ago")}`
                : `${count} ${__t(key)} ${__t("time_ago")}`;
        }
    }
}
