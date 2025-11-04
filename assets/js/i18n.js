// assets/js/i18n.js

// === I18N Data (Переводы из старого app.js) ===
export const I18N = {
    ru: {
        profile_title: "Профиль URSA",
        search_ph: "Поиск по названию, bundleId…",
        install: "Установить",
        ipa: "Скачать IPA",
        hack_features: "Функции мода",
        not_found: "Ничего не найдено",
        empty: "Пока нет приложений",
        load_error: "Ошибка Firestore",
        vip_only: "🔒 Только для VIP",
        login_btn: "Войти через Google",
        logout_btn: "Выйти",
        guest: "Гость",
        dash: "—",
        badge_free: "Free",
        badge_vip: "⭐ VIP",
        acc_status: "Статус аккаунта:",
        acc_free: "Free",
        acc_vip: "VIP",
        cert_section: "🔏 Сертификат",
        cert_state: "Состояние:",
        cert_state_ok: "✅ Загружен",
        cert_state_none: "❌ Не загружен",
        cert_upload_btn: "📤 Добавить / Обновить сертификат",
        upgrade_btn: "🚀 Поднять статус",
        vip_title: "VIP Статус URSA",
        vip_desc: "🌟 Получите VIP статус и откройте доступ ко всем модам, скрытым функциям и приоритетной подписи IPA.",
        vip_benefit1: "⭐ Доступ к эксклюзивным модам",
        vip_benefit2: "⚡ Приоритетная установка без ожидания",
        vip_benefit3: "💬 Поддержка напрямую из Telegram",
        vip_price: "Цена: 4.99 USD / месяц",
        vip_buy: "💳 Купить",
        signing_start: "🔄 Запускаем подпись...",
        signing_ready: "✅ Готово! Установка начнётся…",
        signing_need_cert: "❌ Загрузите свой сертификат в профиле",
        signing_wait: "⏳ Ожидаем завершения...",
        signing_job_error: "Ошибка: Задание не найдено",
        signing_job_failed: "Ошибка подписи:",
        signing_timeout: "Ошибка: Таймаут ожидания (10 мин)",
        modal_version: "Версия",
        modal_size: "Размер",
        modal_min_ios: "Мин. iOS",
        time_ago: "назад",
        time_just_now: "только что",
        time_minute: "минуту",
        time_minutes_1: "минуты",
        time_minutes_2: "минут",
        time_hour: "час",
        time_hours_1: "часа",
        time_hours_2: "часов",
        time_day: "день",
        time_days_1: "дня",
        time_days_2: "дней",
        time_week: "неделю",
        time_weeks_1: "недели",
        time_weeks_2: "недель",
        time_month: "месяц",
        time_months_1: "месяца",
        time_months_2: "месяцев",
        time_year: "год",
        time_years_1: "года",
        time_years_2: "лет"
    },
    en: {
        profile_title: "URSA Profile",
        search_ph: "Search by name or bundleId…",
        install: "Install",
        ipa: "Download IPA",
        hack_features: "Hack Features",
        not_found: "Nothing found",
        empty: "No apps yet",
        load_error: "Firestore error",
        vip_only: "🔒 VIP Only",
        login_btn: "Sign in with Google",
        logout_btn: "Signout",
        guest: "Guest",
        dash: "—",
        badge_free: "Free",
        badge_vip: "⭐ VIP",
        acc_status: "Account Status:",
        acc_free: "Free",
        acc_vip: "VIP",
        cert_section: "🔏 Certificate",
        cert_state: "Status:",
        cert_state_ok: "✅ Uploaded",
        cert_state_none: "❌ Not uploaded",
        cert_upload_btn: "📤 Add / Update Certificate",
        upgrade_btn: "🚀 Upgrade Status",
        vip_title: "URSA VIP Status",
        vip_desc: "🌟 Get VIP to unlock all mods, hidden features, and priority signing.",
        vip_benefit1: "⭐ Access to exclusive mods",
        vip_benefit2: "⚡ Priority installation without wait",
        vip_benefit3: "💬 Direct Telegram support",
        vip_price: "Price: $4.99 / month",
        vip_buy: "💳 Buy",
        signing_start: "🔄 Starting sign job...",
        signing_ready: "✅ Done! Installation will start…",
        signing_need_cert: "❌ Upload your certificate in profile",
        signing_wait: "⏳ Waiting for completion...",
        signing_job_error: "Error: Job not found",
        signing_job_failed: "Signing error:",
        signing_timeout: "Error: Job timed out (10 min)",
        modal_version: "Version",
        modal_size: "Size",
        modal_min_ios: "Min. iOS",
        time_ago: "ago",
        time_just_now: "just now",
        time_minute: "minute",
        time_minutes_1: "minutes",
        time_minutes_2: "minutes",
        time_hour: "hour",
        time_hours_1: "hours",
        time_hours_2: "hours",
        time_day: "day",
        time_days_1: "days",
        time_days_2: "days",
        time_week: "week",
        time_weeks_1: "weeks",
        time_weeks_2: "weeks",
        time_month: "month",
        time_months_1: "months",
        time_months_2: "months",
        time_year: "year",
        time_years_1: "years",
        time_years_2: "years"
    }
};

let lang = (localStorage.getItem("ursa_lang") || (navigator.language || "ru").slice(0, 2)).toLowerCase();
if (!I18N[lang]) lang = "ru";

export const getLang = () => lang;
export const __t = (k) => (I18N[lang] && I18N[lang][k]) || k;

// === Dynamic i18n Apply ===
export function applyI18n() {
    const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

    qsa("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        if (key && I18N[lang][key]) el.textContent = I18N[lang][key];
    });
    qsa("[data-i18n-placeholder]").forEach((el) => {
        const key = el.getAttribute("data-i18n-placeholder");
        if (key && I18N[lang][key]) el.placeholder = I18N[lang][key];
    });
}

// === Lang Toggle (для tabbar) ===
export function toggleLang(iconUrl) {
    lang = lang === "ru" ? "en" : "ru";
    localStorage.setItem("ursa_lang", lang);
    document.getElementById("navLangIcon").src = iconUrl;
    applyI18n();
}

// Делаем доступным глобально, как было в старом коде
window.__t = __t;
