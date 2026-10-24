/**
 * Copia a public/ocr los recursos que el lector necesita para funcionar SIN internet:
 * worker y núcleo de Tesseract, idioma español y worker de pdf.js.
 * Se ejecuta antes de `next dev` / `next build`.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const raiz = (paquete) => dirname(require.resolve(paquete + "/package.json"));
const destino = join(process.cwd(), "public", "ocr");
mkdirSync(destino, { recursive: true });

const copiar = (origen, nombre = origen.split(/[\\/]/).pop()) => {
  if (!existsSync(origen)) throw new Error("Falta " + origen);
  copyFileSync(origen, join(destino, nombre));
};

copiar(join(raiz("tesseract.js"), "dist", "worker.min.js"));
const core = raiz("tesseract.js-core");
for (const f of readdirSync(core)) if (/^tesseract-core.*\.(js|wasm)$/.test(f) && f.includes("lstm")) copiar(join(core, f));
copiar(join(raiz("@tesseract.js-data/spa"), "4.0.0_best_int", "spa.traineddata.gz"));
copiar(join(raiz("pdfjs-dist"), "build", "pdf.worker.min.mjs"));
console.log("Recursos de OCR copiados a public/ocr");
