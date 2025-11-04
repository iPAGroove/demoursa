// assets/js/signer_flow.js

import { db } from "./firebase.js";
import { doc, updateDoc, increment, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { __t } from "./i18n.js";
import { escapeHTML } from "./utils.js";

// === API для запуска задачи ===
const SIGNER_API_START_JOB = "https://ursa-signer-239982196215.europe-west1.run.app/start_sign_job";

let currentInstallListener = null; // Глобальная переменная для отписки

async function incrementInstallCount(appId) {
    if (!appId) return;
    try {
        const appRef = doc(db, "ursa_ipas", appId);
        await updateDoc(appRef, {
            installCount: increment(1)
        });
    } catch (err) {
        console.error("Failed to increment install count:", err);
    }
}

export async function installIPA(app) {
    incrementInstallCount(app.id);
    const dl = document.getElementById("dl-buttons-row");
    if (!dl) return;

    // Отписываемся от старого листенера, если он был
    if (currentInstallListener) {
        console.log("Отписка от предыдущего задания...");
        currentInstallListener();
        currentInstallListener = null;
    }

    dl.innerHTML = `<div style="opacity:.8;font-size:14px;">${__t("signing_start")}</div><progress id="sign-progress" max="100" value="30" style="width:100%;height:8px;margin-top:6px;border-radius:8px;"></progress>`;

    try {
        const signer_id = localStorage.getItem("ursa_signer_id");
        if (!signer_id) throw new Error(__t("signing_need_cert"));

        // 1. Запускаем задание на сервере
        const form = new FormData();
        form.append("ipa_url", app.downloadUrl);
        form.append("signer_id", signer_id);

        const res = await fetch(SIGNER_API_START_JOB, { method: "POST", body: form });
        const json = await res.json();

        if (!res.ok || !json.job_id) {
            throw new Error(json.detail || json.error || "Failed to start job");
        }

        const job_id = json.job_id;
        console.log("🚀 Задание запущено, job_id:", job_id);
        dl.innerHTML = `<div style="opacity:.8;font-size:14px;">${__t("signing_wait")}</div><progress id="sign-progress" max="100" value="60" style="width:100%;height:8px;margin-top:6px;border-radius:8px;"></progress>`;

        // 2. Слушаем документ с заданием в Firestore
        const jobRef = doc(db, "ursa_sign_jobs", job_id);

        // Устанавливаем таймаут (10 минут)
        const failsafeTimeout = setTimeout(() => {
            console.warn("Таймаут ожидания задания (10 мин)", job_id);
            if (currentInstallListener) {
                currentInstallListener();
                currentInstallListener = null;
                dl.innerHTML = `<div style="opacity:.9;color:#ff6;">❌ ${__t("signing_timeout")}</div>`;
            }
        }, 10 * 60 * 1000); // 10 минут

        // 3. Создаем листенер
        currentInstallListener = onSnapshot(jobRef, (docSnap) => {
            if (!docSnap.exists()) {
                console.error("Документ задания не найден!", job_id);
                clearTimeout(failsafeTimeout);
                currentInstallListener();
                currentInstallListener = null;
                dl.innerHTML = `<div style="opacity:.9;color:#ff6;">❌ ${__t("signing_job_error")}</div>`;
                return;
            }

            const data = docSnap.data();
            console.log("Статус задания:", data.status);

            if (data.status === "complete") {
                clearTimeout(failsafeTimeout);
                currentInstallListener();
                currentInstallListener = null;
                
                console.log("✅ Задание завершено!", data.install_link);
                const progressBar = document.getElementById("sign-progress");
                if (progressBar) progressBar.value = 100;
                dl.innerHTML = `<div style="opacity:.9;font-size:14px;">${__t("signing_ready")}</div>`;
                setTimeout(() => (location.href = data.install_link), 900);

            } else if (data.status === "error") {
                clearTimeout(failsafeTimeout);
                currentInstallListener();
                currentInstallListener = null;

                console.error("❌ Задание провалено:", data.error);
                dl.innerHTML = `<div style="opacity:.9;color:#ff6;">❌ ${__t("signing_job_failed")} ${escapeHTML(data.error) || "N/A"}</div>`;
                
            } else if (data.status === "pending" || data.status === "running") {
                // Просто ждем...
                const progressBar = document.getElementById("sign-progress");
                if (progressBar && progressBar.value < 90) {
                     progressBar.value = (progressBar.value || 60) + 5;
                }
            }
        });

    } catch (err) {
        console.error("Ошибка при запуске installIPA:", err);
        dl.innerHTML = `<div style="opacity:.9;color:#ff6;">❌ ${err.message || err}</div>`;
        if (currentInstallListener) {
            currentInstallListener();
            currentInstallListener = null;
        }
    }
}

// Функции для управления листенерем из modals.js
export const clearInstallListener = () => {
    if (currentInstallListener) {
        console.log("Отписка от задания при закрытии/смене...");
        currentInstallListener();
        currentInstallListener = null;
    }
};
