const STORAGE_KEY = "examen_matematica_2026";
const STORAGE_BACKUP_KEY = "examen_matematica_2026_backup";
const SUBMISSIONS_KEY = "examen_matematica_submissions_2026";
const SYNC_URL = "https://script.google.com/macros/s/AKfycbwD9UhyOuFYE2KwjCdBJ_-i8KTUTD9VvWju7GIzXFZcgoR8ypBv4FRH44og442hOVXmFQ/exec";

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
const localSaveStatus = document.getElementById("localSaveStatus");

let lastSavedSignature = "";
let saveTimer = null;

function sanitizeNumber(value) {
  return String(value || "").replace(/[^0-9.,-]/g, "");
}

function collectAnswers() {
  const answers = {};
  document.querySelectorAll("[data-q]").forEach(el => {
    answers[el.dataset.q] = String(el.value || "").trim();
  });
  return answers;
}

function collectExam() {
  return {
    version: "1.1-offline-safe",
    timestamp: new Date().toISOString(),
    updatedAt: Date.now(),
    nombre: String(nombre.value || "").trim(),
    grado: grado.value || "",
    seccion: seccion.value || "",
    answers: collectAnswers(),
    synced: false
  };
}

function showLocalSaveStatus(message, ok = true) {
  if (!localSaveStatus) return;
  localSaveStatus.textContent = message;
  localSaveStatus.dataset.state = ok ? "ok" : "error";
}

function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn("No se pudo guardar en localStorage", err);
    return false;
  }
}

function safeGetItem(key) {
  try {
    return localStorage.getItem(key);
  } catch (err) {
    console.warn("No se pudo leer localStorage", err);
    return null;
  }
}

function saveDraft(force = false) {
  const data = collectExam();
  const signature = JSON.stringify({
    nombre: data.nombre,
    grado: data.grado,
    seccion: data.seccion,
    answers: data.answers
  });

  if (!force && signature === lastSavedSignature) return true;

  const serialized = JSON.stringify(data);
  const primaryOk = safeSetItem(STORAGE_KEY, serialized);
  const backupOk = safeSetItem(STORAGE_BACKUP_KEY, serialized);

  if (primaryOk || backupOk) {
    lastSavedSignature = signature;
    const now = new Date();
    showLocalSaveStatus(`✓ Avance guardado en esta tablet (${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})})`, true);
    return true;
  }

  showLocalSaveStatus("⚠ No se pudo guardar el avance. Pulsa PREPARAR TABLET y revisa el almacenamiento.", false);
  return false;
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveDraft(false), 120);
}

function parseDraft(raw) {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    if (!data.answers || typeof data.answers !== "object") data.answers = {};
    return data;
  } catch (_) {
    return null;
  }
}

function chooseNewestDraft(a, b) {
  if (!a) return b;
  if (!b) return a;
  const ta = Number(a.updatedAt || Date.parse(a.timestamp || "") || 0);
  const tb = Number(b.updatedAt || Date.parse(b.timestamp || "") || 0);
  return tb > ta ? b : a;
}

function findQuestionElement(key) {
  // No usa CSS.escape(), porque varios WebView/Chrome Android antiguos
  // fallan al abrir index.html mediante file://.
  const fields = document.querySelectorAll("[data-q]");
  for (const el of fields) {
    if (String(el.dataset.q) === String(key)) return el;
  }
  return null;
}

function unlockEntryFields() {
  [nombre, grado, seccion].forEach(el => {
    if (!el) return;
    el.disabled = false;
    el.readOnly = false;
  });
  document.querySelectorAll("[data-q]").forEach(el => {
    el.disabled = false;
    el.readOnly = false;
    el.removeAttribute("disabled");
    el.removeAttribute("readonly");
  });
}

function loadDraft() {
  const primary = parseDraft(safeGetItem(STORAGE_KEY));
  const backup = parseDraft(safeGetItem(STORAGE_BACKUP_KEY));
  const data = chooseNewestDraft(primary, backup);

  unlockEntryFields();

  if (!data) {
    showLocalSaveStatus("Aún no hay avance guardado. Se guardará automáticamente al escribir.", true);
    return false;
  }

  try {
    nombre.value = data.nombre || "";
    grado.value = data.grado || "";
    seccion.value = data.seccion || "";

    Object.keys(data.answers || {}).forEach(key => {
      const el = findQuestionElement(key);
      if (el) el.value = data.answers[key] == null ? "" : String(data.answers[key]);
    });

    // Repara automáticamente una de las dos copias si estaba ausente/corrupta.
    const repaired = JSON.stringify(data);
    safeSetItem(STORAGE_KEY, repaired);
    safeSetItem(STORAGE_BACKUP_KEY, repaired);

    lastSavedSignature = JSON.stringify({
      nombre: String(data.nombre || "").trim(),
      grado: data.grado || "",
      seccion: data.seccion || "",
      answers: data.answers || {}
    });

    showLocalSaveStatus("✓ Avance anterior recuperado automáticamente.", true);
    return true;
  } catch (e) {
    console.warn("No se pudo recuperar el borrador", e);
    showLocalSaveStatus("⚠ Se encontró un borrador, pero no pudo restaurarse completamente.", false);
    return false;
  }
}

function updateConnection() {
  if (navigator.onLine) {
    statusEl.textContent = "INTERNET DISPONIBLE";
    statusEl.className = "status online";
    syncPending();
  } else {
    statusEl.textContent = "MODO OFFLINE — EXAMEN DISPONIBLE";
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
    return JSON.parse(safeGetItem(SUBMISSIONS_KEY) || "[]");
  } catch {
    return [];
  }
}

function setSubmissions(items) {
  safeSetItem(SUBMISSIONS_KEY, JSON.stringify(items));
}

async function sendToGoogleSheets(record) {
  if (!SYNC_URL) return false;
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
  // Fuerza un guardado ANTES de cualquier validación o intento de sincronización.
  saveDraft(true);
  if (!isValid()) return;

  const record = collectExam();
  const submissions = getSubmissions();
  record.localId = "tablet-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  submissions.push(record);
  setSubmissions(submissions);

  // Conserva el examen finalizado como borrador recuperable; no lo borra.
  safeSetItem(STORAGE_KEY, JSON.stringify(record));
  safeSetItem(STORAGE_BACKUP_KEY, JSON.stringify(record));

  syncMessage.textContent = SYNC_URL
    ? (navigator.onLine
      ? "La evaluación quedó guardada en la tablet y se intentará sincronizar con Google Sheets."
      : "La evaluación quedó guardada en esta tablet. Se enviará automáticamente cuando vuelva Internet.")
    : "La evaluación quedó guardada en esta tablet.";

  finalModal.classList.remove("hidden");
  syncPending();
}

function attachAutosave() {
  document.querySelectorAll(".num").forEach(el => {
    el.addEventListener("input", () => {
      el.value = sanitizeNumber(el.value);
      scheduleSave();
    });
    el.addEventListener("change", () => saveDraft(true));
    el.addEventListener("blur", () => saveDraft(true));
  });

  [nombre, grado, seccion].forEach(el => {
    el.addEventListener("input", scheduleSave);
    el.addEventListener("change", () => saveDraft(true));
    el.addEventListener("blur", () => saveDraft(true));
  });
}

saveButton.addEventListener("click", finalizeExam);
closeModal.addEventListener("click", () => finalModal.classList.add("hidden"));
window.addEventListener("online", updateConnection);
window.addEventListener("offline", updateConnection);

// Android puede cerrar/recargar una pestaña sin ejecutar beforeunload.
// Cubrimos varias rutas para guardar el último cambio.
window.addEventListener("pagehide", () => saveDraft(true));
window.addEventListener("beforeunload", () => saveDraft(true));
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") saveDraft(true);
});
window.addEventListener("pageshow", () => {
  unlockEntryFields();
  loadDraft();
  updateConnection();
});

unlockEntryFields();
loadDraft();
attachAutosave();
updateConnection();

// Guardado de seguridad periódico. Solo escribe si hubo cambios.
setInterval(() => saveDraft(false), 3000);

// ============================================================
// DIAGNÓSTICO PREVIO DE LA TABLET
// ============================================================
const prepareTabletButton = document.getElementById("prepareTabletButton");
const tabletReadyIndicator = document.getElementById("tabletReadyIndicator");
const tabletCheckResults = document.getElementById("tabletCheckResults");

function testLocalStorage() {
  const key = "__lugape_storage_test__";
  const value = "ok-" + Date.now();
  try {
    localStorage.setItem(key, value);
    const ok = localStorage.getItem(key) === value;
    localStorage.removeItem(key);
    return ok;
  } catch (err) {
    console.warn("Prueba de localStorage falló", err);
    return false;
  }
}

async function testBrowserStorage() {
  if (!testLocalStorage()) return false;
  if (navigator.storage && typeof navigator.storage.estimate === "function") {
    try {
      const estimate = await navigator.storage.estimate();
      return typeof estimate === "object" && estimate !== null;
    } catch (_) {
      return true;
    }
  }
  return true;
}

function testIndexPage() {
  const required = [document.body, form, nombre, grado, seccion, saveButton];
  return document.readyState !== "loading" && required.every(Boolean);
}

function testTable7() {
  const table = document.querySelector(".freq-table");
  const fields = Array.from(document.querySelectorAll('.freq-table [data-q^="7_"]'));
  const expectedKeys = [
    "7_Xi_1", "7_fi_1", "7_Fi_1",
    "7_Xi_2", "7_fi_2", "7_hi_2",
    "7_Xi_3", "7_hi_3", "7_Fi_3",
    "7_fi_4", "7_hi_4", "7_Fi_4",
    "7_fi_total", "7_hi_total"
  ];
  if (!table || fields.length !== expectedKeys.length) return false;
  if (!expectedKeys.every(key => Boolean(findQuestionElement(key)))) return false;
  const probe = fields[0];
  const previous = probe.value;
  try {
    probe.disabled = false;
    probe.readOnly = false;
    probe.value = "12,5";
    const ok = probe.value === "12,5" && !probe.disabled && !probe.readOnly;
    probe.value = previous;
    return ok;
  } catch (_) {
    probe.value = previous;
    return false;
  }
}

function testStudentInfoSave() {
  // IMPORTANTE: usa una clave separada; nunca toca el borrador real del alumno.
  const key = "__lugape_student_test__";
  try {
    const sample = {nombre:"PRUEBA TABLET", grado:"2°", seccion:"A", at:Date.now()};
    localStorage.setItem(key, JSON.stringify(sample));
    const readBack = JSON.parse(localStorage.getItem(key) || "{}");
    localStorage.removeItem(key);
    return readBack.nombre === sample.nombre && readBack.grado === sample.grado && readBack.seccion === sample.seccion;
  } catch (err) {
    try { localStorage.removeItem(key); } catch (_) {}
    return false;
  }
}

function testAppsScriptConfig() {
  if (!SYNC_URL || typeof SYNC_URL !== "string") return false;
  try {
    const url = new URL(SYNC_URL);
    return url.protocol === "https:" && /script\.google\.com$/i.test(url.hostname) && /\/macros\/s\/.+\/exec\/?$/i.test(url.pathname);
  } catch (_) {
    return false;
  }
}

function renderTabletChecks(checks) {
  tabletCheckResults.innerHTML = checks.map(item => `
    <div class="check-item ${item.ok ? "ok" : "fail"}">
      <span>${item.ok ? "✅" : "❌"}</span>
      <span>${item.label}<span class="detail">${item.detail}</span></span>
    </div>
  `).join("");
  tabletCheckResults.classList.remove("hidden");
}

async function prepareTabletForExam() {
  // Primero protege cualquier avance que ya exista.
  saveDraft(true);
  unlockEntryFields();

  prepareTabletButton.disabled = true;
  prepareTabletButton.textContent = "COMPROBANDO TABLET...";
  tabletReadyIndicator.textContent = "⚪ COMPROBANDO";
  tabletReadyIndicator.className = "tablet-ready pending";

  const storageAllowed = await testBrowserStorage();
  const appScriptOk = testAppsScriptConfig();
  const checks = [
    {label:"index.html funciona", ok:testIndexPage(), detail:"La página y los elementos principales cargaron correctamente."},
    {label:"localStorage funciona", ok:testLocalStorage(), detail:"Se puede escribir, leer y borrar un dato de prueba local."},
    {label:"El navegador permite almacenamiento", ok:storageAllowed, detail:"El navegador permite conservar datos del examen en esta tablet."},
    {label:"La tabla 7 funciona", ok:testTable7(), detail:"Las 14 casillas esperadas están disponibles y editables."},
    {label:"La información del estudiante se guarda", ok:testStudentInfoSave(), detail:"La prueba usa almacenamiento separado y no toca el avance del alumno."},
    {label:"Google Apps Script está configurado", ok:appScriptOk, detail:appScriptOk ? "La dirección /exec está configurada." : "Revisa la dirección /exec de Google Apps Script."}
  ];

  renderTabletChecks(checks);
  const ready = checks.every(item => item.ok);
  tabletReadyIndicator.textContent = ready ? "🟢 TABLET LISTA" : "🔴 REVISAR CONFIGURACIÓN";
  tabletReadyIndicator.className = "tablet-ready " + (ready ? "ready" : "review");
  prepareTabletButton.disabled = false;
  prepareTabletButton.textContent = "PREPARAR TABLET PARA EL EXAMEN";

  // Restaura y desbloquea por seguridad tras el diagnóstico.
  unlockEntryFields();
  loadDraft();
}

if (prepareTabletButton) {
  prepareTabletButton.addEventListener("click", prepareTabletForExam);
}
