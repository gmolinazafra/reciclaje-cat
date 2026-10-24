/**
 * ReciclaCat_Gest — licencias.
 * © Limonada Web. Todos los derechos reservados.
 *
 * Cada llave va firmada (Ed25519) con la clave privada de Limonada Web, que NO está en este programa.
 * El programa solo lleva la clave pública: puede comprobar una llave, pero no fabricarla.
 * Cada llave está ligada al «código de equipo» del ordenador donde se activa.
 *
 * Formato: RCG1.<datos en base64url>.<firma en base64url>
 * Datos: { c: cliente, e: código de equipo, i: emitida (AAAA-MM-DD), v: caduca (AAAA-MM-DD | null), n: nº de licencia }
 */
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const { execFileSync } = require("node:child_process");

const CLAVE_PUBLICA = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAvrJKrMzC/+fPgqZTV7gp2AHIcLu1BwSPOSN8317kUeI=
-----END PUBLIC KEY-----`;

const ALFABETO = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // base32 Crockford (sin I, L, O, U)

function base32(buf) {
  let bits = 0, valor = 0, out = "";
  for (const b of buf) { valor = (valor << 8) | b; bits += 8; while (bits >= 5) { out += ALFABETO[(valor >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) out += ALFABETO[(valor << (5 - bits)) & 31];
  return out;
}

/** Identificador estable del Windows instalado (MachineGuid); en otros sistemas, /etc/machine-id. */
function identificadorBruto() {
  try {
    if (process.platform === "win32") {
      const s = execFileSync("reg", ["query", "HKLM\\SOFTWARE\\Microsoft\\Cryptography", "/v", "MachineGuid"], { encoding: "utf8", windowsHide: true });
      const m = s.match(/MachineGuid\s+REG_SZ\s+([0-9a-f-]+)/i);
      if (m) return m[1].toLowerCase();
    } else {
      for (const f of ["/etc/machine-id", "/var/lib/dbus/machine-id"]) if (fs.existsSync(f)) return fs.readFileSync(f, "utf8").trim();
    }
  } catch { /* se usa la alternativa */ }
  return [os.hostname(), os.platform(), os.cpus()[0]?.model ?? ""].join("|");
}

let cacheEquipo = null;
/** Código de equipo que el cliente envía para pedir su llave: XXXX-XXXX-XXXX-XXXX. */
function codigoEquipo() {
  if (!cacheEquipo) {
    const h = crypto.createHash("sha256").update("reciclacat-gest:" + identificadorBruto()).digest();
    cacheEquipo = base32(h).slice(0, 16).match(/.{4}/g).join("-");
  }
  return cacheEquipo;
}

const b64url = {
  dec: (s) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64"),
};

/**
 * Comprueba una llave. Devuelve { ok: true, datos } o { ok: false, error }.
 * @param {string} llave
 * @param {string} [equipo] código del equipo actual
 * @param {Date} [ahora]
 */
function verificarLlave(llave, equipo = codigoEquipo(), ahora = new Date()) {
  const limpia = String(llave || "").replace(/\s+/g, "");
  const partes = limpia.split(".");
  if (partes.length !== 3 || partes[0] !== "RCG1") return { ok: false, error: "La llave no tiene el formato correcto. Cópiala entera, tal como te la enviamos." };
  let datos;
  try { datos = JSON.parse(b64url.dec(partes[1]).toString("utf8")); } catch { return { ok: false, error: "La llave está incompleta o dañada." }; }
  let valida = false;
  try { valida = crypto.verify(null, Buffer.from(partes[0] + "." + partes[1]), crypto.createPublicKey(CLAVE_PUBLICA), b64url.dec(partes[2])); } catch { valida = false; }
  if (!valida) return { ok: false, error: "La llave no es válida." };
  if (datos.e !== equipo) return { ok: false, error: `Esta llave es para otro ordenador (${datos.e}). El código de este equipo es ${equipo}.` };
  if (datos.v && new Date(datos.v + "T23:59:59") < ahora) return { ok: false, error: `La licencia caducó el ${datos.v.split("-").reverse().join("/")}. Contacta con Limonada Web para renovarla.`, datos };
  return { ok: true, datos };
}

module.exports = { codigoEquipo, verificarLlave, CLAVE_PUBLICA };
