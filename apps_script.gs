/**
 * GOOGLE APPS SCRIPT
 * 1. Crea un Google Sheet.
 * 2. Extensiones > Apps Script.
 * 3. Reemplaza el contenido de Code.gs por este código.
 * 4. Guarda.
 * 5. Implementar > Nueva implementación > Aplicación web.
 * 6. Ejecutar como: Tú.
 * 7. Quién tiene acceso: Cualquiera.
 * 8. Copia la URL /exec y pégala en SYNC_URL de app.js.
 */

const SHEET_NAME = "Respuestas";

function doPost(e) {
  try {
    const raw = e && e.parameter ? e.parameter.payload : "";
    if (!raw) {
      return ContentService
        .createTextOutput(JSON.stringify({ok:false, error:"Sin payload"}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const data = JSON.parse(raw);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow([
        "Fecha/Hora", "ID local", "Nombres y apellidos", "Grado", "Sección",
        "P1", "P2", "P3", "P4", "P5", "P6",
        "P7_Xi_1", "P7_fi_1", "P7_Fi_1",
        "P7_Xi_2", "P7_fi_2", "P7_hi_2",
        "P7_Xi_3", "P7_hi_3", "P7_Fi_3",
        "P7_fi_4", "P7_hi_4", "P7_Fi_4",
        "P7_fi_total", "P7_hi_total",
        "P8", "P9", "P10", "P11", "P12", "P13", "P14", "P15"
      ]);
    }

    const a = data.answers || {};
    sheet.appendRow([
      new Date(),
      data.localId || "",
      data.nombre || "",
      data.grado || "",
      data.seccion || "",
      a["1"] || "", a["2"] || "", a["3"] || "", a["4"] || "", a["5"] || "", a["6"] || "",
      a["7_Xi_1"] || "", a["7_fi_1"] || "", a["7_Fi_1"] || "",
      a["7_Xi_2"] || "", a["7_fi_2"] || "", a["7_hi_2"] || "",
      a["7_Xi_3"] || "", a["7_hi_3"] || "", a["7_Fi_3"] || "",
      a["7_fi_4"] || "", a["7_hi_4"] || "", a["7_Fi_4"] || "",
      a["7_fi_total"] || "", a["7_hi_total"] || "",
      a["8"] || "", a["9"] || "", a["10"] || "", a["11"] || "",
      a["12"] || "", a["13"] || "", a["14"] || "", a["15"] || ""
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ok:true}))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ok:false, error:String(err)}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
