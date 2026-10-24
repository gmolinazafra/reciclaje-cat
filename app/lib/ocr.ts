/**
 * OCR / extracción de documentos.
 * - LectorReal (por defecto en la app): PDF con texto → pdf.js; PDF escaneado o foto → Tesseract en el propio equipo
 *   (sin internet, sin IA externa). Los datos se sacan del texto con reglas (lib/extraer.ts).
 * - DemoOcrProvider: simulado, solo para pruebas automáticas.
 * Nada se guarda sin revisión humana.
 */

import type { CampoDetectado, PesoUsuario, TipoDocumento } from "./types";
import type { LineaFacturaDetectada } from "./extraer";

export interface ResultadoOCR {
  tipo: TipoDocumento;
  campos: CampoDetectado[];
  origen: "demo" | "real";
  error?: string;
  /** Líneas de piezas detectadas en facturas/albaranes. */
  lineas?: LineaFacturaDetectada[];
  /** Texto leído (para consultarlo en la revisión). */
  texto?: string;
  /** Cómo se ha leído: texto del PDF u OCR. */
  metodo?: "texto-pdf" | "ocr" | "hoja";
  /** Si el PDF trae varios documentos (p. ej. varios DI, uno por página), cada uno por separado. */
  documentos?: { tipo: TipoDocumento; campos: CampoDetectado[] }[];
}

export interface OpcionesOCR {
  pesosUsuario?: PesoUsuario[];
  onProgreso?: (texto: string) => void;
}

export interface OcrProvider {
  nombre: string;
  esDemo: boolean;
  extraer(archivo: File, opts?: OpcionesOCR): Promise<ResultadoOCR>;
}

export const MIME_ADMITIDOS = [
  "application/pdf", "image/jpeg", "image/png", "image/heic", "image/heif",
  "text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
export const EXTENSIONES_ADMITIDAS = [".pdf", ".jpg", ".jpeg", ".png", ".heic", ".heif", ".csv", ".xls", ".xlsx"];

export function extensionAdmitida(nombre: string): boolean {
  const n = nombre.toLowerCase();
  return EXTENSIONES_ADMITIDAS.some((e) => n.endsWith(e));
}

/** Clasificación determinista por nombre de archivo y tipo MIME. */
export function clasificarPorNombre(nombre: string, mime: string): TipoDocumento {
  const n = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/\b(di|documento.?identificacion|npt|nt)\b/.test(n) || /^di[-_ ]/.test(n)) return "DI";
  if (/contrato/.test(n)) return "Contrato de tratamiento";
  if (/traslado/.test(n)) return "Documento de traslado";
  if (/(baja|destruccion|certificado|dgt)/.test(n)) return "Certificado de destrucción / baja";
  if (/factura/.test(n)) return "Factura";
  if (/albaran/.test(n)) return "Albarán";
  if (/(analitica|laboratorio|vertido)/.test(n)) return "Analítica";
  if (/(autorizacion|resolucion|aau|licencia)/.test(n)) return "Autorización";
  if (/(venta|ventas|piezas)/.test(n) || /csv|sheet|excel/.test(mime)) return "Venta de piezas";
  return "Otro";
}

const campo = (clave: string, etiqueta: string, valor: string, confianza: number): CampoDetectado => ({
  clave, etiqueta, valorDetectado: valor, valorFinal: valor, confianza, corregido: false,
});

/** Campos que la pantalla de revisión pide para cada tipo. */
export function camposPorTipo(tipo: TipoDocumento): { clave: string; etiqueta: string }[] {
  switch (tipo) {
    case "DI": return [
      { clave: "numero", etiqueta: "Nº DI" }, { clave: "fecha", etiqueta: "Fecha" }, { clave: "ler", etiqueta: "Código LER" },
      { clave: "descripcion", etiqueta: "Descripción" }, { clave: "cantidadKg", etiqueta: "Cantidad (kg)" },
      { clave: "nimaOrigen", etiqueta: "NIMA origen" }, { clave: "nimaDestino", etiqueta: "NIMA destino" },
      { clave: "gestor", etiqueta: "Gestor destino" }, { clave: "nifDestino", etiqueta: "NIF del gestor" },
      { clave: "operacionDestino", etiqueta: "Operación en destino (R/D)" }, { clave: "municipioDestino", etiqueta: "Municipio del gestor" },
      { clave: "transportista", etiqueta: "Transportista" },
    ];
    case "Certificado de destrucción / baja": return [
      { clave: "matricula", etiqueta: "Matrícula" }, { clave: "vin", etiqueta: "Bastidor (VIN)" }, { clave: "marca", etiqueta: "Marca" },
      { clave: "modelo", etiqueta: "Modelo" }, { clave: "fecha", etiqueta: "Fecha de baja" }, { clave: "numeroCertificado", etiqueta: "Nº certificado" },
    ];
    case "Venta de piezas": return [
      { clave: "mes", etiqueta: "Mes" }, { clave: "filas", etiqueta: "Nº de líneas" }, { clave: "totalImporte", etiqueta: "Importe total (€)" },
    ];
    case "Factura": case "Albarán": return [
      { clave: "numero", etiqueta: "Número" }, { clave: "fecha", etiqueta: "Fecha" }, { clave: "emisor", etiqueta: "Emisor" }, { clave: "importe", etiqueta: "Importe (€)" },
    ];
    case "Analítica": return [
      { clave: "fecha", etiqueta: "Fecha muestra" }, { clave: "laboratorio", etiqueta: "Laboratorio" }, { clave: "puntoMuestreo", etiqueta: "Punto de muestreo" }, { clave: "resultado", etiqueta: "Resultado" },
    ];
    case "Autorización": return [
      { clave: "numero", etiqueta: "Nº expediente" }, { clave: "organo", etiqueta: "Órgano" }, { clave: "fecha", etiqueta: "Fecha resolución" }, { clave: "caducidad", etiqueta: "Caducidad" },
    ];
    case "Contrato de tratamiento": case "Documento de traslado": return [
      { clave: "numero", etiqueta: "Número" }, { clave: "fecha", etiqueta: "Fecha" }, { clave: "gestor", etiqueta: "Gestor" }, { clave: "ler", etiqueta: "Código LER" },
    ];
    default: return [{ clave: "titulo", etiqueta: "Título" }, { clave: "fecha", etiqueta: "Fecha" }];
  }
}

/** Proveedor DEMO: no lee el archivo; genera campos simulados marcados como demo, con confianzas variadas para ejercitar la revisión. */
export class DemoOcrProvider implements OcrProvider {
  nombre = "OCR demo (simulado)";
  esDemo = true;
  async extraer(archivo: File): Promise<ResultadoOCR> {
    await new Promise((r) => setTimeout(r, 700));
    if (!extensionAdmitida(archivo.name)) return { tipo: "Otro", campos: [], origen: "demo", error: "Formato no admitido" };
    if (archivo.size === 0) return { tipo: "Otro", campos: [], origen: "demo", error: "Archivo vacío o ilegible" };
    const tipo = clasificarPorNombre(archivo.name, archivo.type);
    const hoy = new Date().toISOString().slice(0, 10);
    const demoValores: Record<string, string> = {
      numero: "DEMO-" + archivo.name.replace(/\W+/g, "").slice(0, 6).toUpperCase(), fecha: hoy, ler: "13 02 08*", descripcion: "Aceites de motor usados (DEMO)",
      cantidadKg: "480", nimaOrigen: "2900012345", nimaDestino: "4100067890", gestor: "Gestor demo S.L.", transportista: "Transportes demo S.L.",
      matricula: "0000 DMO", vin: "VF1DEMO000000000", marca: "Renault", modelo: "Clio", numeroCertificado: "CD-DEMO-0001",
      mes: String(new Date().getMonth() + 1), filas: "12", totalImporte: "1.240,00", emisor: "Proveedor demo", importe: "320,50",
      laboratorio: "Laboratorio demo", puntoMuestreo: "Arqueta de salida", resultado: "Dentro de límites (DEMO)",
      organo: "Delegación territorial (DEMO)", caducidad: hoy.slice(0, 4) + "-12-31", titulo: archivo.name,
    };
    const campos = camposPorTipo(tipo).map((c, i) =>
      campo(c.clave, c.etiqueta, demoValores[c.clave] ?? "", i % 3 === 2 ? 0.55 : 0.9),
    );
    return { tipo, campos, origen: "demo" };
  }
}

let proveedor: OcrProvider | null = null;
export function getOcrProvider(): OcrProvider {
  if (!proveedor) proveedor = typeof window !== "undefined" ? new LectorReal() : new DemoOcrProvider();
  return proveedor;
}
export function setOcrProvider(p: OcrProvider) { proveedor = p; }

// ─── Lector real: pdf.js + Tesseract, todo en el equipo ───────────────────────

/** Ruta base de los recursos de OCR copiados a /public/ocr (scripts/copiar-ocr.mjs). */
const BASE_OCR = "/ocr/";

type WorkerTesseract = { recognize: (img: unknown) => Promise<{ data: { text: string; confidence: number } }> };
let workerPromesa: Promise<WorkerTesseract> | null = null;

async function workerTesseract(onProgreso?: (t: string) => void): Promise<WorkerTesseract> {
  if (!workerPromesa) {
    workerPromesa = (async () => {
      onProgreso?.("Preparando el lector (la primera vez tarda unos segundos)…");
      const T = await import("tesseract.js");
      const w = await T.createWorker("spa", 1, {
        workerPath: BASE_OCR + "worker.min.js",
        corePath: BASE_OCR,
        langPath: BASE_OCR,
        gzip: true,
        cacheMethod: "none",
        workerBlobURL: false,
      });
      return w as unknown as WorkerTesseract;
    })().catch((e) => { workerPromesa = null; throw e; });
  }
  return workerPromesa;
}

/** Reconstruye las líneas de una página de PDF agrupando los fragmentos por altura. */
function textoDePagina(items: { str: string; transform: number[] }[]): string {
  const filas = new Map<number, { x: number; s: string }[]>();
  for (const it of items) {
    if (!it.str?.trim()) continue;
    const y = Math.round(it.transform[5] / 3) * 3;
    const fila = filas.get(y) ?? [];
    fila.push({ x: it.transform[4], s: it.str });
    filas.set(y, fila);
  }
  return [...filas.entries()].sort((a, b) => b[0] - a[0]).map(([, f]) => f.sort((a, b) => a.x - b.x).map((x) => x.s).join(" ")).join("\n");
}

export class LectorReal implements OcrProvider {
  nombre = "Lector del equipo (pdf.js + Tesseract)";
  esDemo = false;

  async extraer(archivo: File, opts: OpcionesOCR = {}): Promise<ResultadoOCR> {
    const { extraerDeTexto, dividirDocumentos, esDIOficial } = await import("./extraer");
    let paginasPdf: string[] = [];
    const n = archivo.name.toLowerCase();
    const base = { origen: "real" as const };
    if (!extensionAdmitida(archivo.name)) return { ...base, tipo: "Otro", campos: [], error: "Formato no admitido" };
    if (archivo.size === 0) return { ...base, tipo: "Otro", campos: [], error: "Archivo vacío o ilegible" };
    try {
      if (/\.(xlsx|xls|csv)$/.test(n)) {
        const { leerArchivo } = await import("./importExcel");
        const { filas } = await leerArchivo(archivo);
        const r = extraerDeTexto("", { nombre: archivo.name, mime: archivo.type, tipo: "Venta de piezas" });
        const campos = r.campos.map((c) => (c.clave === "filas" ? { ...c, valorDetectado: String(filas.length), valorFinal: String(filas.length), confianza: 1 } : c));
        return { ...base, tipo: "Venta de piezas", campos, metodo: "hoja", texto: `${filas.length} filas. Para pasar las piezas a la memoria usa Piezas → Importar desde Excel de facturación.` };
      }
      if (/\.(heic|heif)$/.test(n)) return { ...base, tipo: "Otro", campos: [], error: "Las fotos HEIC del iPhone no se pueden leer en Windows. Guárdala como JPG (o activa «Más compatible» en la cámara) y súbela de nuevo." };
      let texto = "";
      let calidad = 1;
      let metodo: ResultadoOCR["metodo"] = "texto-pdf";
      if (n.endsWith(".pdf")) {
        opts.onProgreso?.("Leyendo el PDF…");
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = BASE_OCR + "pdf.worker.min.mjs";
        const pdf = await pdfjs.getDocument({ data: new Uint8Array(await archivo.arrayBuffer()) }).promise;
        const paginas = Math.min(pdf.numPages, 15);
        const trozos: string[] = [];
        for (let i = 1; i <= paginas; i++) {
          const p = await pdf.getPage(i);
          const c = await p.getTextContent();
          trozos.push(textoDePagina(c.items as { str: string; transform: number[] }[]));
        }
        texto = trozos.join("\n");
        paginasPdf = trozos;
        if (texto.replace(/\s/g, "").length < 40) {
          // PDF escaneado: se renderiza cada página y se pasa por OCR.
          metodo = "ocr";
          const w = await workerTesseract(opts.onProgreso);
          const textos: string[] = []; const confs: number[] = [];
          const max = Math.min(pdf.numPages, 5);
          for (let i = 1; i <= max; i++) {
            opts.onProgreso?.(`Reconociendo texto (página ${i} de ${max})…`);
            const p = await pdf.getPage(i);
            const vp = p.getViewport({ scale: 2.2 });
            const canvas = document.createElement("canvas");
            canvas.width = vp.width; canvas.height = vp.height;
            await p.render({ canvasContext: canvas.getContext("2d")!, viewport: vp, canvas } as never).promise;
            const r = await w.recognize(canvas);
            textos.push(r.data.text); confs.push(r.data.confidence);
          }
          texto = textos.join("\n");
          paginasPdf = textos;
          calidad = confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length / 100 : 0.5;
        }
      } else {
        metodo = "ocr";
        const w = await workerTesseract(opts.onProgreso);
        opts.onProgreso?.("Reconociendo texto de la imagen…");
        const r = await w.recognize(archivo);
        texto = r.data.text;
        calidad = r.data.confidence / 100;
      }
      if (texto.replace(/\s/g, "").length < 10) return { ...base, tipo: clasificarPorNombre(archivo.name, archivo.type), campos: [], texto, metodo, error: "No se ha encontrado texto legible. Prueba con una foto más nítida, de frente y con buena luz." };
      const r = extraerDeTexto(texto, { nombre: archivo.name, mime: archivo.type, calidad, pesosUsuario: opts.pesosUsuario });
      // Varios DI en un mismo PDF (uno por página): se devuelven por separado.
      const partes = paginasPdf.length > 1 ? dividirDocumentos(paginasPdf) : [];
      if (partes.length > 1 && esDIOficial(partes[0])) {
        const documentos = partes.map((p) => extraerDeTexto(p, { nombre: archivo.name, calidad, tipo: "DI" })).map((x) => ({ tipo: x.tipo, campos: x.campos }));
        return { ...base, tipo: "DI", campos: documentos[0].campos, texto, metodo, documentos };
      }
      return { ...base, tipo: r.tipo, campos: r.campos, lineas: r.lineas, texto, metodo };
    } catch (e) {
      return { ...base, tipo: clasificarPorNombre(archivo.name, archivo.type), campos: [], error: "Error al leer el archivo: " + (e as Error).message };
    }
  }
}
