/**
 * ReciclaCat_Gest para Windows — doble autenticación (contraseña + app autenticadora).
 * © Limonada Web. Todos los derechos reservados.
 *
 * - Segundo factor TOTP estándar (RFC 6238: SHA-1, 6 cifras, 30 s), compatible con Google Authenticator,
 *   Microsoft Authenticator, Authy, 2FAS, etc. Funciona sin internet: el código se calcula en el equipo.
 * - La contraseña se guarda solo como huella scrypt con sal; el secreto TOTP, cifrado con la protección de datos
 *   de Windows (DPAPI, vía safeStorage) cuando está disponible.
 * - 8 códigos de recuperación de un solo uso (se guarda solo su huella SHA-256).
 * - Freno a la fuerza bruta: tras 5 intentos fallidos, espera creciente (30 s, 60 s, 120 s… hasta 15 min).
 * - Un código TOTP ya usado no vale otra vez (anti-reutilización).
 *
 * Archivo: %APPDATA%\ReciclaCat_Gest\seguridad.json
 */
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const EMISOR = "ReciclaCat_Gest";
const PERIODO = 30;
const CIFRAS = 6;
const MIN_CLAVE = 8;
const N_RECUPERACION = 8;
const MINUTOS_BLOQUEO = [0, 5, 15, 30, 60];

// ─── Base32 (RFC 4648) ───────────────────────────────────────────────────────
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32(buf) {
  let bits = 0, valor = 0, sal = "";
  for (const b of buf) {
    valor = (valor << 8) | b; bits += 8;
    while (bits >= 5) { sal += B32[(valor >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) sal += B32[(valor << (5 - bits)) & 31];
  return sal;
}
function desdeBase32(txt) {
  const limpio = String(txt).toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0, valor = 0; const out = [];
  for (const c of limpio) {
    const i = B32.indexOf(c);
    if (i < 0) throw new Error("Clave base32 no válida");
    valor = (valor << 5) | i; bits += 5;
    if (bits >= 8) { out.push((valor >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

// ─── TOTP ────────────────────────────────────────────────────────────────────
const nuevoSecreto = () => base32(crypto.randomBytes(20));
const pasoDe = (ms) => Math.floor(ms / 1000 / PERIODO);

function codigoEnPaso(secretoB32, paso) {
  const contador = Buffer.alloc(8);
  contador.writeBigUInt64BE(BigInt(paso));
  const h = crypto.createHmac("sha1", desdeBase32(secretoB32)).update(contador).digest();
  const o = h[h.length - 1] & 15;
  const n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 10 ** CIFRAS).padStart(CIFRAS, "0");
}
const totp = (secretoB32, ms = Date.now()) => codigoEnPaso(secretoB32, pasoDe(ms));

const igualSeguro = (a, b) => { const x = Buffer.from(String(a)); const y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

/** Devuelve el paso aceptado (±1 de margen para relojes algo desajustados) o -1. No acepta pasos ya usados. */
function verificarTotp(secretoB32, codigo, ms = Date.now(), ultimoPaso = -1) {
  const c = String(codigo ?? "").replace(/\D/g, "");
  if (c.length !== CIFRAS) return -1;
  const p = pasoDe(ms);
  for (const d of [0, -1, 1]) {
    const paso = p + d;
    if (paso <= ultimoPaso) continue;
    if (igualSeguro(codigoEnPaso(secretoB32, paso), c)) return paso;
  }
  return -1;
}

const uriOtpauth = (secretoB32, cuenta) =>
  `otpauth://totp/${encodeURIComponent(EMISOR)}:${encodeURIComponent(cuenta)}?secret=${secretoB32}&issuer=${encodeURIComponent(EMISOR)}&algorithm=SHA1&digits=${CIFRAS}&period=${PERIODO}`;

// ─── Contraseña y códigos de recuperación ────────────────────────────────────
const PARAMS_SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
function huellaClave(clave, salHex = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(clave).normalize("NFC"), Buffer.from(salHex, "hex"), 32, PARAMS_SCRYPT).toString("hex");
  return { sal: salHex, hash };
}
const claveCorrecta = (clave, guardada) => !!guardada && igualSeguro(huellaClave(clave, guardada.sal).hash, guardada.hash);

const normRecuperacion = (c) => String(c ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const huellaRecuperacion = (c) => crypto.createHash("sha256").update("rcg-rec:" + normRecuperacion(c)).digest("hex");
function nuevosCodigosRecuperacion() {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O ni 1/I
  const uno = () => {
    // Siempre con alguna letra, para no confundirlo con un código de la app (solo cifras).
    for (;;) {
      const s = Array.from(crypto.randomBytes(8), (x) => alfabeto[x % alfabeto.length]).join("");
      if (/[A-Z]/.test(s)) return `${s.slice(0, 4)}-${s.slice(4)}`;
    }
  };
  const codigos = Array.from({ length: N_RECUPERACION }, uno);
  return { codigos, huellas: codigos.map(huellaRecuperacion) };
}

// ─── Archivo ─────────────────────────────────────────────────────────────────
function leer(archivo) {
  try { const o = JSON.parse(fs.readFileSync(archivo, "utf8")); return o && o.activa ? o : null; } catch { return null; }
}
function escribir(archivo, datos) {
  fs.mkdirSync(path.dirname(archivo), { recursive: true });
  const tmp = archivo + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(datos, null, 1), "utf8");
  fs.renameSync(tmp, archivo);
}

/**
 * Gestor de la doble autenticación.
 * @param {string} archivo ruta de seguridad.json
 * @param {{cifrar:(t:string)=>{dpapi:boolean,dato:string}, descifrar:(o:{dpapi:boolean,dato:string})=>string, ahora?:()=>number}} prot
 */
function crearGestor(archivo, prot) {
  const ahora = prot.ahora ?? (() => Date.now());
  let pendiente = null; // { clave, secreto } mientras se configura
  let fallos = 0;
  let esperaHasta = 0;

  const estado = () => {
    const d = leer(archivo);
    return { activa: !!d, minutosBloqueo: d?.minutosBloqueo ?? 15, recuperacionRestantes: d ? d.recuperacion.length : 0, creada: d?.creada ?? null, cuenta: d?.cuenta ?? null };
  };

  const frenoActivo = () => {
    const resta = Math.ceil((esperaHasta - ahora()) / 1000);
    return resta > 0 ? `Demasiados intentos fallidos. Espera ${resta} s y vuelve a probar.` : null;
  };
  const anotarFallo = () => {
    fallos++;
    if (fallos >= 5) esperaHasta = ahora() + Math.min(15 * 60, 30 * 2 ** (fallos - 5)) * 1000;
  };

  /** Comprueba contraseña + (código TOTP o código de recuperación). Consume el código usado. */
  function comprobar(clave, codigo) {
    const d = leer(archivo);
    if (!d) return { ok: true };
    const freno = frenoActivo();
    if (freno) return { ok: false, error: freno };
    if (!claveCorrecta(clave, d.clave)) { anotarFallo(); return { ok: false, error: "Contraseña o código incorrectos." }; }
    const c = String(codigo ?? "").trim();
    if (/^\d[\d\s]*$/.test(c)) {
      const paso = verificarTotp(prot.descifrar(d.secreto), c, ahora(), d.ultimoPaso ?? -1);
      if (paso < 0) { anotarFallo(); return { ok: false, error: "Contraseña o código incorrectos. Comprueba también que la hora de Windows está bien." }; }
      d.ultimoPaso = paso;
      escribir(archivo, d);
    } else {
      const h = huellaRecuperacion(c);
      const i = d.recuperacion.findIndex((x) => igualSeguro(x, h));
      if (i < 0) { anotarFallo(); return { ok: false, error: "Contraseña o código incorrectos." }; }
      d.recuperacion.splice(i, 1);
      escribir(archivo, d);
      fallos = 0; esperaHasta = 0;
      return { ok: true, usadoRecuperacion: true, recuperacionRestantes: d.recuperacion.length };
    }
    fallos = 0; esperaHasta = 0;
    return { ok: true };
  }

  return {
    estado,
    comprobar,
    /** Paso 1: contraseña nueva → secreto y URI para el QR (aún no se guarda nada). */
    preparar(clave, clave2, cuenta) {
      if (leer(archivo)) return { ok: false, error: "La doble autenticación ya está activada." };
      if (String(clave ?? "").length < MIN_CLAVE) return { ok: false, error: `La contraseña debe tener al menos ${MIN_CLAVE} caracteres.` };
      if (clave !== clave2) return { ok: false, error: "Las dos contraseñas no coinciden." };
      const secreto = nuevoSecreto();
      const nombre = String(cuenta || "Centro").slice(0, 60);
      pendiente = { clave, secreto, cuenta: nombre };
      return { ok: true, secreto: secreto.replace(/(.{4})/g, "$1 ").trim(), uri: uriOtpauth(secreto, nombre) };
    },
    /** Paso 2: primer código de la app → se guarda y se devuelven los códigos de recuperación (solo esta vez). */
    confirmar(codigo, minutosBloqueo = 15) {
      if (!pendiente) return { ok: false, error: "Vuelve a empezar la configuración." };
      const paso = verificarTotp(pendiente.secreto, codigo, ahora());
      if (paso < 0) return { ok: false, error: "El código no coincide. Escribe el que muestra ahora la app (cambia cada 30 s) y revisa que la hora de Windows está bien." };
      const rec = nuevosCodigosRecuperacion();
      escribir(archivo, {
        v: 1, activa: true, creada: new Date(ahora()).toISOString(), cuenta: pendiente.cuenta,
        clave: huellaClave(pendiente.clave), secreto: prot.cifrar(pendiente.secreto), ultimoPaso: paso,
        recuperacion: rec.huellas, minutosBloqueo: MINUTOS_BLOQUEO.includes(+minutosBloqueo) ? +minutosBloqueo : 15,
      });
      pendiente = null;
      return { ok: true, codigos: rec.codigos };
    },
    cancelar() { pendiente = null; },
    desactivar(clave, codigo) {
      const r = comprobar(clave, codigo);
      if (!r.ok) return r;
      fs.rmSync(archivo, { force: true });
      return { ok: true };
    },
    nuevosCodigos(clave, codigo) {
      const r = comprobar(clave, codigo);
      if (!r.ok) return r;
      const d = leer(archivo);
      const rec = nuevosCodigosRecuperacion();
      d.recuperacion = rec.huellas;
      escribir(archivo, d);
      return { ok: true, codigos: rec.codigos };
    },
    cambiarMinutos(minutos) {
      const d = leer(archivo);
      if (!d || !MINUTOS_BLOQUEO.includes(+minutos)) return { ok: false };
      d.minutosBloqueo = +minutos;
      escribir(archivo, d);
      return { ok: true };
    },
  };
}

module.exports = { crearGestor, totp, verificarTotp, base32, desdeBase32, nuevoSecreto, uriOtpauth, huellaClave, claveCorrecta, nuevosCodigosRecuperacion, huellaRecuperacion, MINUTOS_BLOQUEO, MIN_CLAVE };
