/**
 * ReciclaCat_Gest — prueba gratuita de 15 días.
 * © Limonada Web. Todos los derechos reservados.
 *
 * - La prueba empieza cuando el usuario pulsa «Probar gratis 15 días» (aceptando las condiciones).
 * - La fecha de inicio se guarda en dos sitios: %APPDATA%\ReciclaCat_Gest\prueba.json y el registro de Windows
 *   (HKCU\Software\LimonadaWeb\ReciclaCatGest). Se usa la MÁS ANTIGUA, así que reinstalar no reinicia la prueba.
 * - Ambos valores van sellados (HMAC ligado al código de equipo): si se editan a mano, la prueba se da por terminada.
 * - Si el reloj del equipo se atrasa más de un día respecto al último uso, la prueba se da por terminada.
 * - Al terminar, el programa pide la llave; los datos NO se borran.
 */
const crypto = require("node:crypto");
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");

const DIAS_PRUEBA = 15;
const DIA = 24 * 60 * 60 * 1000;
const CLAVE_REG = "HKCU\\Software\\LimonadaWeb\\ReciclaCatGest";

const sello = (equipo, texto) => crypto.createHmac("sha256", "reciclacat-prueba:" + equipo).update(texto).digest("hex").slice(0, 24);
const empaquetar = (equipo, iso) => `${iso}|${sello(equipo, iso)}`;
function desempaquetar(equipo, valor) {
  const [iso, s] = String(valor || "").split("|");
  if (!iso || !s) return null;
  return sello(equipo, iso) === s && !Number.isNaN(Date.parse(iso)) ? iso : "manipulado";
}

function leerRegistro() {
  if (process.platform !== "win32") return null;
  try {
    const out = execFileSync("reg", ["query", CLAVE_REG, "/v", "Inicio"], { encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "ignore"] });
    return out.match(/Inicio\s+REG_SZ\s+(\S+)/)?.[1] ?? null;
  } catch { return null; }
}
function escribirRegistro(valor) {
  if (process.platform !== "win32") return;
  try { execFileSync("reg", ["add", CLAVE_REG, "/v", "Inicio", "/t", "REG_SZ", "/d", valor, "/f"], { windowsHide: true, stdio: "ignore" }); } catch { /* sin registro */ }
}

function leerArchivo(ruta) {
  try { return JSON.parse(fs.readFileSync(ruta, "utf8")); } catch { return null; }
}

/**
 * Estado de la prueba.
 * @returns {{ usada: boolean, activa: boolean, diasRestantes: number, fin: string|null, error: string|null }}
 */
function estadoPrueba(rutaArchivo, equipo, ahora = new Date()) {
  const archivo = leerArchivo(rutaArchivo);
  const candidatos = [archivo?.inicio, leerRegistro()].filter(Boolean).map((v) => desempaquetar(equipo, v)).filter(Boolean);
  if (!candidatos.length) return { usada: false, activa: false, diasRestantes: DIAS_PRUEBA, fin: null, error: null };
  if (candidatos.includes("manipulado")) return { usada: true, activa: false, diasRestantes: 0, fin: null, error: "La prueba gratuita ya no está disponible en este equipo." };
  const inicio = candidatos.sort()[0];
  const fin = new Date(Date.parse(inicio) + DIAS_PRUEBA * DIA);
  const ultima = archivo?.ultimaVez ? Date.parse(desempaquetar(equipo, archivo.ultimaVez) || "") : NaN;
  if (!Number.isNaN(ultima) && ahora.getTime() < ultima - DIA) {
    return { usada: true, activa: false, diasRestantes: 0, fin: fin.toISOString(), error: "La fecha de este equipo no es correcta. Ajústala para seguir usando la prueba." };
  }
  const restantes = Math.ceil((fin.getTime() - ahora.getTime()) / DIA);
  if (restantes <= 0) return { usada: true, activa: false, diasRestantes: 0, fin: fin.toISOString(), error: "Tu prueba gratuita de 15 días ha terminado. Tus datos siguen guardados: activa tu licencia para continuar." };
  return { usada: true, activa: true, diasRestantes: Math.min(restantes, DIAS_PRUEBA), fin: fin.toISOString(), error: null };
}

/** Empieza la prueba (solo si nunca se ha usado en este equipo). Guarda también la aceptación de las condiciones. */
function iniciarPrueba(rutaArchivo, equipo, condiciones, ahora = new Date()) {
  const e = estadoPrueba(rutaArchivo, equipo, ahora);
  if (e.usada) return e;
  const iso = ahora.toISOString();
  const valor = empaquetar(equipo, iso);
  fs.writeFileSync(rutaArchivo, JSON.stringify({ inicio: valor, ultimaVez: valor, condiciones }), "utf8");
  escribirRegistro(valor);
  return estadoPrueba(rutaArchivo, equipo, ahora);
}

/** Anota el último uso (para detectar relojes atrasados). */
function anotarUso(rutaArchivo, equipo, ahora = new Date()) {
  const a = leerArchivo(rutaArchivo);
  if (!a) return;
  const previa = Date.parse(desempaquetar(equipo, a.ultimaVez) || "");
  if (Number.isNaN(previa) || ahora.getTime() > previa) {
    a.ultimaVez = empaquetar(equipo, ahora.toISOString());
    try { fs.writeFileSync(rutaArchivo, JSON.stringify(a), "utf8"); } catch { /* sin escritura */ }
  }
}

module.exports = { DIAS_PRUEBA, estadoPrueba, iniciarPrueba, anotarUso };
