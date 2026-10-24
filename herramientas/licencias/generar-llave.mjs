/**
 * Generador de llaves de ReciclaCat_Gest (uso exclusivo de Limonada Web).
 * Necesita, en esta misma carpeta, el archivo «llave-privada-reciclacat.pem».
 * ¡Ese archivo NUNCA se sube a GitHub ni se envía a nadie!
 *
 * Uso: doble clic en «Generar llave.bat» (o: node generar-llave.mjs)
 * Cada llave queda anotada en «registro-licencias.csv».
 */
import { createPrivateKey, sign } from "node:crypto";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const carpeta = dirname(fileURLToPath(import.meta.url));
const rutaClave = join(carpeta, "llave-privada-reciclacat.pem");
if (!existsSync(rutaClave)) {
  console.error("\nNo encuentro «llave-privada-reciclacat.pem» en esta carpeta.\n");
  process.exit(1);
}
const clave = createPrivateKey(readFileSync(rutaClave));
const b64url = (b) => Buffer.from(b).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const rl = createInterface({ input: stdin, output: stdout, terminal: false });
const entrada = rl[Symbol.asyncIterator]();
const preguntar = async (q) => { stdout.write(q); const r = await entrada.next(); return r.done ? "" : r.value; };
console.log("\n=== ReciclaCat_Gest · Generar llave de activación ===\n");
const cliente = (await preguntar("Cliente (nombre del desguace): ")).trim();
let equipo = (await preguntar("Código de equipo (lo ve el cliente al abrir el programa, XXXX-XXXX-XXXX-XXXX): ")).trim().toUpperCase().replace(/\s/g, "");
if (/^[0-9A-Z]{16}$/.test(equipo)) equipo = equipo.match(/.{4}/g).join("-");
if (!cliente || !/^[0-9A-Z]{4}(-[0-9A-Z]{4}){3}$/.test(equipo)) {
  console.error("\nFaltan datos o el código de equipo no es correcto.\n");
  process.exit(1);
}
const anios = (await preguntar("Años de validez (1 por defecto · 0 = sin caducidad): ")).trim();
rl.close();
const n = parseInt(anios || "1", 10);
const hoy = new Date();
const emitida = hoy.toISOString().slice(0, 10);
let caduca = null;
if (n > 0) { const d = new Date(hoy); d.setFullYear(d.getFullYear() + n); caduca = d.toISOString().slice(0, 10); }
const numero = "RCG-" + hoy.toISOString().slice(0, 10).replace(/-/g, "") + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();

const datos = b64url(JSON.stringify({ c: cliente, e: equipo, i: emitida, v: caduca, n: numero }));
const firmado = "RCG1." + datos;
const llave = firmado + "." + b64url(sign(null, Buffer.from(firmado), clave));

appendFileSync(join(carpeta, "registro-licencias.csv"), `${emitida};${numero};"${cliente.replace(/"/g, "'")}";${equipo};${caduca ?? "sin caducidad"};${llave}\n`, "utf8");
console.log("\nLicencia " + numero + " · " + cliente + " · " + (caduca ? "válida hasta " + caduca.split("-").reverse().join("/") : "sin caducidad"));
console.log("\nLLAVE (envíasela completa al cliente):\n\n" + llave + "\n");
console.log("Anotada en registro-licencias.csv\n");
