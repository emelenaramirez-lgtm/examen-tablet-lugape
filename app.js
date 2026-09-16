const STORAGE_KEY = "examen_matematica_2026";
const SUBMISSIONS_KEY = "examen_matematica_submissions_2026";
const SYNC_URL = "https://script.google.com/macros/s/AKfycbwD9UhyOuFYE2KwjCdBJ_-i8KTUTD9VvWju7GIzXFZcgoR8ypBv4FRH44og442hOVXmFQ/exec"; // Pega aquí la URL de implementación de Google Apps Script.

const form = document.getElementById("examForm");
const nombre = document.getElementById("nombre");
const grado = document.getElementById("grado");
const seccion = document.getElementById("seccion");
const statusEl = document.getElementById("connectionStatus");
const saveButton = document.getElementById("saveButton");
const validationMessage = document.getElementById("validationMessage");
const finalModal = document.getElementById("finalModal");
const syncMessage = document.getElementById("syncMessage");
const closeModal = document.getElementById("closeModal");

function sanitizeNumber(value) {
  return value.replace(/[^0-9.,-]/g, "");
}

function collectAnswers() {
  const answers = {};
  document.querySelectorAll("[data-q]").forEach(el => {
    answers[el.dataset.q] = el.value.trim();
  });
  return answers;
}

function collectExam() {
  return {
    version: "1.0",
    timestamp: new Date().toISOString(),
    nombre: nombre.value.trim(),
    grado: grado.value,
    seccion: seccion.value,
    answers: collectAnswers(),
    synced: false
  };
}

function saveDraft() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collectExam()));
}

function loadDraft() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    nombre.value = data.nombre || "";
    grado.value = data.grado || "";
    seccion.value = data.seccion || "";
    Object.entries(data.answers || {}).forEach(([key, value]) => {
      const el = document.querySelector(`[data-q="${CSS.escape(key)}"]`);
      if (el) el.value = value;
    });
  } catch (e) {
    console.warn("No se pudo recuperar el borrador", e);
  }
}

function updateConnection() {
  if (navigator.onLine) {
    statusEl.textContent = "CON INTERNET";
    statusEl.className = "status online";
    syncPending();
  } else {
    statusEl.textContent = "SIN INTERNET";
    statusEl.className = "status offline";
  }
}

function isValid() {
  if (!nombre.value.trim()) {
    validationMessage.textContent = "Escribe tus nombres y apellidos.";
    nombre.focus();
    return false;
  }
  if (!grado.value) {
    validationMessage.textContent = "Selecciona el grado.";
    grado.focus();
    return false;
  }
  if (!seccion.value) {
    validationMessage.textContent = "Selecciona la sección.";
    seccion.focus();
    return false;
  }
  validationMessage.textContent = "";
  return true;
}

function getSubmissions() {
  try {
    return JSON.parse(localStorage.getItem(SUBMISSIONS_KEY) || "[]");
  } catch {
    return [];
  }
}

function setSubmissions(items) {
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(items));
}

async function sendToGoogleSheets(record) {
  if (!SYNC_URL || !navigator.onLine) return false;

  // no-cors permite enviar el POST desde una página local sin depender
  // de leer la respuesta del servidor. El registro queda marcado como enviado.
  const body = new URLSearchParams();
  body.append("payload", JSON.stringify(record));

  try {
    await fetch(SYNC_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"},
      body
    });
    return true;
  } catch (err) {
    console.warn("No se pudo sincronizar", err);
    return false;
  }
}

async function syncPending() {
  if (!SYNC_URL || !navigator.onLine) return;
  const items = getSubmissions();
  let changed = false;

  for (const item of items) {
    if (item.synced) continue;
    const ok = await sendToGoogleSheets(item);
    if (ok) {
      item.synced = true;
      item.syncedAt = new Date().toISOString();
      changed = true;
    }
  }
  if (changed) setSubmissions(items);
}

function finalizeExam() {
  if (!isValid()) return;

  const record = collectExam();
  const submissions = getSubmissions();

  // Evita duplicar el envío de una misma evaluación en el almacenamiento local.
  record.localId = "tablet-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  submissions.push(record);
  setSubmissions(submissions);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));

  syncMessage.textContent = navigator.onLine && SYNC_URL
    ? "La evaluación quedó guardada y se intentará sincronizar con Google Sheets."
    : "La evaluación quedó guardada en esta tablet. Se enviará cuando haya Internet y la sincronización esté configurada.";

  finalModal.classList.remove("hidden");
  syncPending();
}

document.querySelectorAll(".num").forEach(el => {
  el.addEventListener("input", () => {
    el.value = sanitizeNumber(el.value);
    saveDraft();
  });
});
[nombre, grado, seccion].forEach(el => {
  el.addEventListener("input", saveDraft);
  el.addEventListener("change", saveDraft);
});

saveButton.addEventListener("click", finalizeExam);
closeModal.addEventListener("click", () => finalModal.classList.add("hidden"));
window.addEventListener("online", updateConnection);
window.addEventListener("offline", updateConnection);

loadDraft();
updateConnection();
