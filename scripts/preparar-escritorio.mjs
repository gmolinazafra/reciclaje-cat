/**
 * Copia la exportación estática (out/) a escritorio/app para empaquetarla con Electron.
 * Uso: npm run build && npm run escritorio:preparar
 */
import { cpSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const out = join(process.cwd(), "out");
const destino = join(process.cwd(), "escritorio", "app");
if (!existsSync(join(out, "index.html"))) {
  console.error("No existe out/index.html: ejecuta antes `npm run build`.");
  process.exit(1);
}
rmSync(destino, { recursive: true, force: true });
cpSync(out, destino, { recursive: true });
// Sin mapas de código en el instalador.
console.log("App copiada a escritorio/app");
