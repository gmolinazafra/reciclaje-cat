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
 * - Doble autenticación opcional (contraseña + app autenticadora, seguridad.cjs): con ella activada, al abrir el programa,
 *   tras un rato sin usar el equipo o al bloquear Windows se pide contraseña y código.
 * - Actualizaciones automáticas desde Cloudflare R2 (descargas.limonadaweb.com/reciclacat, electron-updater): se descargan solas,
 *   se comprueba su huella SHA-512 y se instalan al cerrar.
 */
const { app, BrowserWindow, Menu, dialog, ipcMain, powerMonitor, protocol, safeStorage, shell, session } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { codigoEquipo, verificarLlave } = require("./licencia.cjs");
const { DIAS_PRUEBA, estadoPrueba, iniciarPrueba, anotarUso } = require("./prueba.cjs");
const { crearGestor } = require("./seguridad.cjs");

// ─── Doble autenticación ─────────────────────────────────────────────────────
let seguridad = null;
/** true cuando ya se ha introducido contraseña + código en esta sesión (o la doble autenticación no está activada). */
let desbloqueado = false;
function gestorSeguridad() {
  if (!seguridad) {
    const dpapi = () => { try { return safeStorage.isEncryptionAvailable(); } catch { return false; } };
    seguridad = crearGestor(path.join(app.getPath("userData"), "seguridad.json"), {
      cifrar: (t) => (dpapi() ? { dpapi: true, dato: safeStorage.encryptString(t).toString("base64") } : { dpapi: false, dato: Buffer.from(t).toString("base64") }),
      descifrar: (o) => (o.dpapi ? safeStorage.decryptString(Buffer.from(o.dato, "base64")) : Buffer.from(o.dato, "base64").toString()),
    });
  }
  return seguridad;
}
const bloqueado = () => gestorSeguridad().estado().activa && !desbloqueado;

// ─── Licencia ────────────────────────────────────────────────────────────────
const archivoLicencia = () => path.join(app.getPath("userData"), "licencia.json");
/** Versión de public/legal/CONDICIONES-DE-USO-Y-PRIVACIDAD.txt que se acepta al activar. */
const VERSION_CONDICIONES = "2 · 24/10/2026";
const archivoPrueba = () => path.join(app.getPath("userData"), "prueba.json");
/** ok = puede usar el programa (con licencia válida o durante la prueba de 15 días). */
let licencia = { ok: false, error: null, datos: null, prueba: null };

function comprobarLicencia() {
  let error = null;
  try {
    if (fs.existsSync(archivoLicencia())) {
      const { llave } = JSON.parse(fs.readFileSync(archivoLicencia(), "utf8"));
      const r = verificarLlave(llave);
      if (r.ok) { licencia = { ok: true, error: null, datos: r.datos, prueba: null }; return licencia; }
      error = r.error;
    }
  } catch {
    error = "No se ha podido leer la licencia guardada. Vuelve a introducir tu llave.";
  }
  // Sin licencia válida: prueba gratuita de 15 días.
  const p = estadoPrueba(archivoPrueba(), codigoEquipo());
  if (p.activa) { anotarUso(archivoPrueba(), codigoEquipo()); licencia = { ok: true, error: null, datos: null, prueba: p }; return licencia; }
  licencia = { ok: false, error: error ?? p.error, datos: null, prueba: p };
  return licencia;
}

const resumenLicencia = () => (licencia.datos ? { cliente: licencia.datos.c, caduca: licencia.datos.v, numero: licencia.datos.n } : null);
const resumenPrueba = () => (licencia.prueba ? { usada: licencia.prueba.usada, activa: licencia.prueba.activa && !licencia.datos, diasRestantes: licencia.prueba.diasRestantes, fin: licencia.prueba.fin, dias: DIAS_PRUEBA } : { usada: false, activa: false, diasRestantes: DIAS_PRUEBA, fin: null, dias: DIAS_PRUEBA });

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
      const html = /\.html?$/.test(rel) || !path.extname(rel);
      if (rel === "activar.html" || (!licencia.ok && /\.html?$/.test(rel))) abs = path.join(__dirname, licencia.ok && bloqueado() ? "acceso.html" : "activar.html");
      // Con la doble autenticación activada y sin desbloquear, solo se ve la pantalla de acceso.
      else if (licencia.ok && html && bloqueado()) abs = path.join(__dirname, "acceso.html");
      else {
        abs = dentroDe(DIR_APP, rel);
        if (!fs.existsSync(abs) && fs.existsSync(abs + ".html")) abs += ".html";
        if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) abs = !licencia.ok ? path.join(__dirname, "activar.html") : bloqueado() ? path.join(__dirname, "acceso.html") : path.join(DIR_APP, "index.html");
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
  ipcMain.handle("licencia:estado", () => ({ ok: licencia.ok, error: licencia.error, equipo: codigoEquipo(), licencia: resumenLicencia(), prueba: resumenPrueba(), ...resumenLicencia() }));
  ipcMain.handle("licencia:prueba", (_e, aceptaCondiciones) => {
    if (aceptaCondiciones !== true) return { ok: false, error: "Para empezar la prueba tienes que aceptar las condiciones de uso, licencia y privacidad." };
    const p = iniciarPrueba(archivoPrueba(), codigoEquipo(), { version: VERSION_CONDICIONES, aceptadas: new Date().toISOString() });
    if (!p.activa) return { ok: false, error: p.error ?? "La prueba gratuita ya se ha usado en este equipo." };
    comprobarLicencia();
    setTimeout(() => { ventana.loadURL(`${ESQUEMA}://${HOST}/index.html`); buscarActualizaciones(ventana, false); }, 1200);
    return { ok: true, diasRestantes: p.diasRestantes };
  });
  ipcMain.handle("licencia:activar", (_e, llave, aceptaCondiciones) => {
    if (aceptaCondiciones !== true) return { ok: false, error: "Para activar tienes que aceptar las condiciones de uso, licencia y privacidad." };
    const r = verificarLlave(llave);
    if (!r.ok) return { ok: false, error: r.error };
    fs.mkdirSync(path.dirname(archivoLicencia()), { recursive: true });
    // Se guarda la aceptación de las condiciones (versión y fecha) junto a la llave.
    fs.writeFileSync(archivoLicencia(), JSON.stringify({ llave: String(llave).replace(/\s+/g, ""), activada: new Date().toISOString(), condiciones: { version: VERSION_CONDICIONES, aceptadas: new Date().toISOString() } }), "utf8");
    comprobarLicencia();
    setTimeout(() => { ventana.loadURL(`${ESQUEMA}://${HOST}/index.html`); buscarActualizaciones(ventana, false); }, 1200);
    return { ok: true, datos: r.datos };
  });
  ipcMain.handle("act:buscar", () => buscarActualizaciones(ventana, true));
  ipcMain.handle("seg:estado", () => ({ ...gestorSeguridad().estado(), desbloqueado: !bloqueado() }));
  ipcMain.handle("seg:desbloquear", (_e, clave, codigo) => {
    if (!licencia.ok) return { ok: false, error: "Licencia no activada" };
    const r = gestorSeguridad().comprobar(clave, codigo);
    if (!r.ok) return r;
    desbloqueado = true;
    setTimeout(() => ventana.loadURL(`${ESQUEMA}://${HOST}/index.html`), r.usadoRecuperacion ? 2500 : 300);
    return r;
  });

  // A partir de aquí, nada funciona sin licencia válida.
  const conLicencia = (fn) => (...a) => { if (!licencia.ok) throw new Error("Licencia no activada"); if (bloqueado()) throw new Error("Programa bloqueado"); return fn(...a); };
  const handleOriginal = ipcMain.handle.bind(ipcMain);
  ipcMain.handle = (canal, fn) => handleOriginal(canal, conLicencia(fn));

  ipcMain.on("db:leer", (e) => { e.returnValue = licencia.ok && !bloqueado() ? leerDB() : null; });

  // Configuración de la doble autenticación (solo con el programa desbloqueado).
  ipcMain.handle("seg:preparar", (_e, clave, clave2, cuenta) => {
    const r = gestorSeguridad().preparar(clave, clave2, cuenta);
    if (!r.ok) return r;
    const qr = require("qrcode-generator")(0, "M");
    qr.addData(r.uri); qr.make();
    return { ok: true, secreto: r.secreto, qr: "data:image/svg+xml;base64," + Buffer.from(qr.createSvgTag({ cellSize: 5, margin: 4, scalable: true })).toString("base64") };
  });
  ipcMain.handle("seg:confirmar", (_e, codigo, minutos) => { const r = gestorSeguridad().confirmar(codigo, minutos); if (r.ok) desbloqueado = true; return r; });
  ipcMain.handle("seg:cancelar", () => { gestorSeguridad().cancelar(); return true; });
  ipcMain.handle("seg:desactivar", (_e, clave, codigo) => gestorSeguridad().desactivar(clave, codigo));
  ipcMain.handle("seg:codigos", (_e, clave, codigo) => gestorSeguridad().nuevosCodigos(clave, codigo));
  ipcMain.handle("seg:minutos", (_e, minutos) => gestorSeguridad().cambiarMinutos(minutos));
  ipcMain.handle("seg:bloquear", () => { bloquear(ventana); return true; });
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
    return { version: app.getVersion(), carpetaDatos: dirDatos(), ultimaCopia, licencia: resumenLicencia(), prueba: resumenPrueba(), equipo: codigoEquipo(), actualizacion: estadoActualizacion };
  });
  ipcMain.handle = handleOriginal;
}

/** Bloquea el programa y muestra la pantalla de acceso (si la doble autenticación está activada). */
function bloquear(ventana) {
  if (!gestorSeguridad().estado().activa || !desbloqueado) return;
  desbloqueado = false;
  if (ventana && !ventana.isDestroyed()) ventana.loadURL(`${ESQUEMA}://${HOST}/index.html`);
}

/** Bloqueo automático: tras X minutos sin tocar el equipo, o al bloquear la sesión de Windows. */
function vigilarInactividad(ventana) {
  setInterval(() => {
    try {
      const e = gestorSeguridad().estado();
      if (e.activa && desbloqueado && e.minutosBloqueo > 0 && powerMonitor.getSystemIdleTime() >= e.minutosBloqueo * 60) bloquear(ventana);
    } catch { /* nunca rompe el programa */ }
  }, 20000);
  for (const ev of ["lock-screen", "suspend"]) powerMonitor.on(ev, () => bloquear(ventana));
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
const RED_PERMITIDA = /^https:\/\/descargas\.limonadaweb\.com\/reciclacat\//i;

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
  ventana.webContents.setWindowOpenHandler(({ url }) => { if (/^(https?:|mailto:)/.test(url)) shell.openExternal(url); return { action: "deny" }; });
  ventana.webContents.on("will-navigate", (e, url) => { if (!url.startsWith(`${ESQUEMA}://${HOST}`)) { e.preventDefault(); if (/^(https?:|mailto:)/.test(url)) shell.openExternal(url); } });
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
    vigilarInactividad(principal);
    if (licencia.ok) setTimeout(() => buscarActualizaciones(principal, false), 5000);
  });
  app.on("window-all-closed", () => app.quit());
}
