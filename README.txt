# EXAMEN DIGITAL PARA TABLETS - LUGAPE

## Archivos
- index.html: página del examen.
- style.css: diseño adaptable a tablet.
- app.js: guardado offline + sincronización.
- grafico_pregunta10.png: gráfico de la pregunta 10.
- apps_script.gs: código para recibir las respuestas en Google Sheets.

## Prueba sin Internet
1. Copia toda esta carpeta a la tablet.
2. Abre index.html con el navegador.
3. Completa una prueba.
4. Cierra y vuelve a abrir: las respuestas deben permanecer guardadas.
5. No borres los datos del navegador durante el examen.

## Google Sheets
1. Crea un Google Sheet vacío.
2. Abre Extensiones > Apps Script.
3. Pega apps_script.gs.
4. Implementa como aplicación web.
5. Copia la URL que termina en /exec.
6. Abre app.js en un editor de texto.
7. Cambia:
   const SYNC_URL = "";
   por:
   const SYNC_URL = "PEGAR_AQUI_LA_URL_DEL_APPS_SCRIPT";
8. Vuelve a copiar la carpeta actualizada a las tablets.

IMPORTANTE:
- El examen funciona sin Internet.
- La sincronización necesita que la tablet tenga Internet en algún momento.
- El envío usa POST y modo no-cors; el examen no necesita leer una respuesta del servidor.
- Antes de usar con 100 estudiantes, hacer una prueba con 2 o 3 tablets.

## Botón PREPARAR TABLET PARA EL EXAMEN
Antes de entregar cada tablet:
1. Abre index.html.
2. Pulsa PREPARAR TABLET PARA EL EXAMEN.
3. Debe aparecer: 🟢 TABLET LISTA.
4. Si aparece 🔴 REVISAR CONFIGURACIÓN, revisa el elemento marcado con ❌.

El diagnóstico comprueba:
- carga correcta de index.html;
- funcionamiento de localStorage;
- permiso/capacidad de almacenamiento del navegador;
- funcionamiento de las 14 casillas editables de la tabla 7;
- guardado y recuperación de nombre, grado y sección;
- configuración de la URL /exec de Google Apps Script.

La prueba usa datos temporales y restaura el borrador que ya exista, por lo que no debe borrar respuestas del estudiante.


V3: CSS integrado en index.html. El examen funciona en modo offline; Internet solo se usa para sincronizar con Google Apps Script.
SYNC_URL configurada con la implementación proporcionada.
