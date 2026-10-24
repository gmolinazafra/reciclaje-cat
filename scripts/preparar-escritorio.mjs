/**
 * Copia la exportación estática (out/) a escritorio/app para empaquetarla con Electron.
 * Uso: npm run build && npm run escritorio:preparar
 */
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const out = join(process.cwd(), "out");
const destino = join(process.cwd(), "escritorio", "app");
if (!existsSync(join(out, "index.html"))) {
  console.error("No existe out/index.html: ejecuta antes `npm run build`.");
  process.exit(1);
}
rmSync(destino, { recursive: true, force: true });
cpSync(out, destino, { recursive: true });
// Condiciones que se aceptan en el instalador (UTF-8 con BOM y saltos de Windows para NSIS).
const cond = readFileSync(join(process.cwd(), "public", "legal", "CONDICIONES-DE-USO-Y-PRIVACIDAD.txt"), "utf8").replace(/\r?\n/g, "\r\n");
writeFileSync(join(process.cwd(), "escritorio", "recursos", "licencia.txt"), "\ufeff" + cond, "utf8");
console.log("App copiada a escritorio/app y condiciones preparadas para el instalador");
