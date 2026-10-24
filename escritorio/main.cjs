/**
 * ReciclaCat_Gest para Windows — proceso principal (Electron).
 * © Limonada Web. Todos los derechos reservados.
 *
 * - Sirve la app (exportación estática de Next en ./app) por el protocolo seguro app://
 * - Guarda los datos en %APPDATA%\ReciclaCat_Gest\datos:
 *     reciclacat.json      base de datos (escritura atómica + .bak de la versión anterior)
 *     adjuntos\AAAA\       originales de los documentos subidos
 *     copias\              copia automática diaria (se guardan las 30 últimas)
 * - Copias de seguridad manuales y restauración desde Ajustes.
 * - Licencia: sin llave válida para este equipo solo se muestra la pantalla de activación (licencia.cjs).
 * - Actualizaciones automáticas desde GitHub Releases (electron-updater): se descargan solas y se instalan al cerrar.
 */
const { app, BrowserWindow, Menu, dialog, ipcMain, protocol, shell, session } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { codigoEquipo, verificarLlave } = require("./licencia.cjs");

// ─── Licencia ────────────────────────────────────────────────────────────────
const archivoLicencia = () => path.join(app.getPath("userData"), "licencia.json");
let licencia = { ok: false, error: null, datos: null };

function comprobarLicencia() {
  try {
    if (!fs.existsSync(archivoLicencia())) { licencia = { ok: false, error: null, datos: null }; return licencia; }
    const { llave } = JSON.parse(fs.readFileSync(archivoLicencia(), "utf8"));
    const r = verificarLlave(llave);
    licencia = { ok: r.ok, error: r.ok ? null : r.error, datos: r.datos ?? null };
  } catch {
    licencia = { ok: false, error: "No se ha podido leer la licencia guardada. Vuelve a introducir tu llave.", datos: null };
  }
  return licencia;
}

const resumenLicencia = () => (licencia.datos ? { cliente: licencia.datos.c, caduca: licencia.datos.v, numero: licencia.datos.n } : null);

const ESQUEMA = "app";
const HOST = "reciclacat";
const DIR_APP = path.join(__dirname, "app");

protocol.registerSchemesAsPrivileged([
  { scheme: ESQUEMA, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

// ─── Rutas de datos ──────────────────────────────────────────────────────────
const dirDatos = () => path.join(app.getPath("userData"), "datos");
const archivoDB = () => path.join(dirDatos(), "reciclacat.json");
const dirAdjuntos = () => path.join(dirDatos(), "adjuntos");
const dirCopias = () => path.join(dirDatos(), "copias");
const MAX_COPIAS = 30;

function asegurarCarpetas() {
  for (const d of [dirDatos(), dirAdjuntos(), dirCopias()]) fs.mkdirSync(d, { recursive: true });
}

const marcaTiempo = () => new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "");
const hoy = () => new Date().toISOString().slice(0, 10);

function esJSONValido(texto) {
  try { const o = JSON.parse(texto); return o && typeof o === "object" && Array.isArray(o.documentos); } catch { return false; }
}

/** Lee la base de datos; si el archivo principal está dañado, usa la versión anterior (.bak). */
function leerDB() {
  const p = archivoDB();
  for (const f of [p, p + ".bak"]) {
    try {
      if (!fs.existsSync(f)) continue;
      const t = fs.readFileSync(f, "utf8");
      if (esJSONValido(t)) return t;
    } catch { /* se prueba el siguiente */ }
  }
  return null;
}

/** Copia automática: como mucho una al día; conserva las MAX_COPIAS más recientes. */
function copiaDiaria() {
  const destino = path.join(dirCopias(), `reciclacat-${hoy()}.json`);
  if (fs.existsSync(destino) || !fs.existsSync(archivoDB())) return;
  fs.copyFileSync(archivoDB(), destino);
  const copias = fs.readdirSync(dirCopias()).filter((f) => /^reciclacat-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  for (const f of copias.slice(0, Math.max(0, copias.length - MAX_COPIAS))) fs.rmSync(path.join(dirCopias(), f), { force: true });
}

function guardarDB(json) {
  if (!esJSONValido(json)) throw new Error("Datos no válidos: no se guardan.");
  asegurarCarpetas();
  const p = archivoDB();
  const tmp = p + ".tmp";
  fs.writeFileSync(tmp, json, "utf8");
  if (fs.existsSync(p)) fs.copyFileSync(p, p + ".bak");
  fs.renameSync(tmp, p);
  try { copiaDiaria(); } catch { /* la copia diaria nunca bloquea el guardado */ }
  return true;
}

const nombreSeguro = (n) => String(n).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.\- ]+/g, "_").replace(/\s+/g, "_").slice(0, 120) || "archivo";

/** Resuelve una ruta relativa dentro de una carpeta, impidiendo salir de ella. */
function dentroDe(base, relativa) {
  const abs = path.resolve(base, relativa);
  if (abs !== base && !abs.startsWith(base + path.sep)) throw new Error("Ruta no permitida");
  return abs;
}

function copiarCarpeta(origen, destino) {
  if (fs.existsSync(origen)) fs.cpSync(origen, destino, { recursive: true });
}

// ─── Servidor de la app (app://reciclacat/...) ───────────────────────────────
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".ico": "image/x-icon", ".wasm": "application/wasm", ".gz": "application/gzip",
  ".txt": "text/plain; charset=utf-8", ".woff2": "font/woff2", ".woff": "font/woff", ".map": "application/json",
};

function registrarProtocolo() {
  protocol.handle(ESQUEMA, async (req) => {
    try {
      const url = new URL(req.url);
      let rel = decodeURIComponent(url.pathname).replace(/^\/+/, "");
      if (!rel || rel.endsWith("/")) rel += "index.html";
      let abs;
      // Sin licencia válida, cualquier página lleva a la activación (los recursos estáticos sí se sirven).
      if (rel === "activar.html" || (!licencia.ok && /\.html?$/.test(rel))) abs = path.join(__dirname, "activar.html");
      else {
        abs = dentroDe(DIR_APP, rel);
        if (!fs.existsSync(abs) && fs.existsSync(abs + ".html")) abs += ".html";
        if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) abs = path.join(DIR_APP, licencia.ok ? "index.html" : "../activar.html");
      }
      const datos = await fs.promises.readFile(abs);
      return new Response(datos, { headers: { "content-type": MIME[path.extname(abs).toLowerCase()] ?? "application/octet-stream", "x-robots-tag": "noindex, noai" } });
    } catch {
      return new Response("No encontrado", { status: 404 });
    }
  });
}

// ─── IPC ─────────────────────────────────────────────────────────────────────
function registrarIPC(ventana) {
  ipcMain.handle("licencia:estado", () => ({ ok: licencia.ok, error: licencia.error, equipo: codigoEquipo(), ...resumenLicencia() }));
  ipcMain.handle("licencia:activar", (_e, llave) => {
    const r = verificarLlave(llave);
    if (!r.ok) return { ok: false, error: r.error };
    fs.mkdirSync(path.dirname(archivoLicencia()), { recursive: true });
    fs.writeFileSync(archivoLicencia(), JSON.stringify({ llave: String(llave).replace(/\s+/g, ""), activada: new Date().toISOString() }), "utf8");
    comprobarLicencia();
    setTimeout(() => { ventana.loadURL(`${ESQUEMA}://${HOST}/index.html`); buscarActualizaciones(ventana, false); }, 1200);
    return { ok: true, datos: r.datos };
  });
  ipcMain.handle("act:buscar", () => buscarActualizaciones(ventana, true));

  // A partir de aquí, nada funciona sin licencia válida.
  const conLicencia = (fn) => (...a) => { if (!licencia.ok) throw new Error("Licencia no activada"); return fn(...a); };
  const handleOriginal = ipcMain.handle.bind(ipcMain);
  ipcMain.handle = (canal, fn) => handleOriginal(canal, conLicencia(fn));

  ipcMain.on("db:leer", (e) => { e.returnValue = licencia.ok ? leerDB() : null; });
  ipcMain.handle("db:guardar", (_e, json) => guardarDB(json));

  ipcMain.handle("adj:guardar", (_e, id, nombre, datos) => {
    const anio = String(new Date().getFullYear());
    const rel = path.join(anio, `${nombreSeguro(id)}-${nombreSeguro(nombre)}`);
    const abs = dentroDe(dirAdjuntos(), rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, Buffer.from(datos));
    return rel.split(path.sep).join("/");
  });

  ipcMain.handle("adj:abrir", async (_e, rel) => {
    const abs = dentroDe(dirAdjuntos(), String(rel));
    if (!fs.existsSync(abs)) { await dialog.showMessageBox(ventana, { type: "warning", message: "No se encuentra el archivo original.", detail: abs }); return false; }
    return (await shell.openPath(abs)) === "";
  });

  ipcMain.handle("copia:crear", async () => {
    const r = await dialog.showOpenDialog(ventana, { title: "Elige dónde guardar la copia (por ejemplo, un pendrive)", properties: ["openDirectory", "createDirectory"], buttonLabel: "Guardar la copia aquí" });
    if (r.canceled || !r.filePaths[0]) return null;
    const destino = path.join(r.filePaths[0], `ReciclaCat_Gest-copia-${marcaTiempo()}`);
    fs.mkdirSync(destino, { recursive: true });
    const db = leerDB();
    if (db) fs.writeFileSync(path.join(destino, "reciclacat.json"), db, "utf8");
    copiarCarpeta(dirAdjuntos(), path.join(destino, "adjuntos"));
    fs.writeFileSync(path.join(destino, "LEEME.txt"), "Copia de seguridad de ReciclaCat_Gest.\r\nPara recuperarla: Ajustes → Restaurar copia… y elige esta carpeta.\r\n", "utf8");
    return destino;
  });

  ipcMain.handle("copia:restaurar", async () => {
    const r = await dialog.showOpenDialog(ventana, { title: "Elige la carpeta de la copia (ReciclaCat_Gest-copia-…)", properties: ["openDirectory"], buttonLabel: "Restaurar esta copia" });
    if (r.canceled || !r.filePaths[0]) return false;
    const origen = r.filePaths[0];
    const json = path.join(origen, "reciclacat.json");
    if (!fs.existsSync(json) || !esJSONValido(fs.readFileSync(json, "utf8"))) {
      await dialog.showMessageBox(ventana, { type: "error", message: "Esa carpeta no contiene una copia válida de ReciclaCat_Gest.", detail: "Debe tener un archivo reciclacat.json." });
      return false;
    }
    // Antes de restaurar se guarda lo actual, por si acaso.
    const seguridad = path.join(dirCopias(), `antes-de-restaurar-${marcaTiempo()}`);
    fs.mkdirSync(seguridad, { recursive: true });
    if (fs.existsSync(archivoDB())) fs.copyFileSync(archivoDB(), path.join(seguridad, "reciclacat.json"));
    copiarCarpeta(dirAdjuntos(), path.join(seguridad, "adjuntos"));
    guardarDB(fs.readFileSync(json, "utf8"));
    copiarCarpeta(path.join(origen, "adjuntos"), dirAdjuntos());
    ventana.reload();
    return true;
  });

  ipcMain.handle("datos:abrir", () => shell.openPath(dirDatos()));

  ipcMain.handle("info", () => {
    let ultimaCopia = null;
    try {
      const f = fs.readdirSync(dirCopias()).filter((x) => x.endsWith(".json")).map((x) => fs.statSync(path.join(dirCopias(), x)).mtime).sort((a, b) => b - a)[0];
      if (f) ultimaCopia = f.toISOString();
    } catch { /* sin copias */ }
    return { version: app.getVersion(), carpetaDatos: dirDatos(), ultimaCopia, licencia: resumenLicencia(), equipo: codigoEquipo(), actualizacion: estadoActualizacion };
  });
  ipcMain.handle = handleOriginal;
}

// ─── Actualizaciones ─────────────────────────────────────────────────────────
let estadoActualizacion = "sin comprobar";
let actualizador = null;
function buscarActualizaciones(ventana, manual) {
  if (!app.isPackaged) { estadoActualizacion = "solo en la versión instalada"; return estadoActualizacion; }
  try {
    if (!actualizador) {
      actualizador = require("electron-updater").autoUpdater;
      actualizador.autoDownload = true;
      actualizador.autoInstallOnAppQuit = true;
      actualizador.on("checking-for-update", () => { estadoActualizacion = "buscando…"; });
      actualizador.on("update-not-available", () => { estadoActualizacion = "al día"; });
      actualizador.on("update-available", (i) => { estadoActualizacion = `descargando la versión ${i.version}…`; });
      actualizador.on("error", () => { estadoActualizacion = "no se ha podido comprobar (¿sin internet?)"; });
      actualizador.on("update-downloaded", async (i) => {
        estadoActualizacion = `versión ${i.version} lista: se instalará al cerrar`;
        const r = await dialog.showMessageBox(ventana, { type: "info", buttons: ["Reiniciar ahora", "Al cerrar"], defaultId: 0, cancelId: 1, title: "Actualización de ReciclaCat_Gest", message: `Hay una versión nueva (${i.version}) lista para instalar.`, detail: "Tus datos no se tocan. Si eliges «Al cerrar», se instalará la próxima vez que cierres el programa." });
        if (r.response === 0) actualizador.quitAndInstall();
      });
    }
    actualizador.checkForUpdates().catch(() => { estadoActualizacion = "no se ha podido comprobar (¿sin internet?)"; });
  } catch { estadoActualizacion = "no disponible"; }
  if (manual) estadoActualizacion = "buscando…";
  return estadoActualizacion;
}

/** Únicos destinos de red permitidos: los de las actualizaciones. */
const RED_PERMITIDA = /^https:\/\/([a-z0-9-]+\.)*(github\.com|githubusercontent\.com)\//i;

// ─── Ventana ─────────────────────────────────────────────────────────────────
function crearVentana() {
  const ventana = new BrowserWindow({
    width: 1320, height: 860, minWidth: 380, minHeight: 600, show: false,
    title: "ReciclaCat_Gest", backgroundColor: "#f4f7f5", autoHideMenuBar: true,
    icon: path.join(__dirname, "recursos", "icono.png"),
    webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: true, devTools: !app.isPackaged },
  });
  ventana.once("ready-to-show", () => ventana.show());
  // Los enlaces externos se abren en el navegador; la app nunca navega fuera de app://
  ventana.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: "deny" }; });
  ventana.webContents.on("will-navigate", (e, url) => { if (!url.startsWith(`${ESQUEMA}://${HOST}`)) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); } });
  registrarIPC(ventana);
  ventana.loadURL(`${ESQUEMA}://${HOST}/index.html`);
  return ventana;
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let principal = null;
  app.on("second-instance", () => { if (principal) { if (principal.isMinimized()) principal.restore(); principal.focus(); } });
  app.whenReady().then(() => {
    asegurarCarpetas();
    try { copiaDiaria(); } catch { /* sin datos todavía */ }
    Menu.setApplicationMenu(null);
    // Sin conexiones de red salientes salvo las de actualización: todo funciona en el equipo.
    session.defaultSession.webRequest.onBeforeRequest((det, cb) => cb({ cancel: /^(https?|wss?):/.test(det.url) && !RED_PERMITIDA.test(det.url) }));
    comprobarLicencia();
    registrarProtocolo();
    principal = crearVentana();
    if (licencia.ok) setTimeout(() => buscarActualizaciones(principal, false), 5000);
  });
  app.on("window-all-closed", () => app.quit());
}
