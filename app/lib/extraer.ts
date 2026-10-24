/**
 * Extracción de datos a partir del TEXTO de un documento (el texto lo da pdf.js o Tesseract).
 * Reglas deterministas, sin IA: expresiones regulares y el diccionario de pesos.
 * Todo lo que sale de aquí pasa por la revisión humana antes de guardarse.
 */

import { camposPorTipo, clasificarPorNombre } from "./ocr";
import { infoLER, normalizarLER, operacion4 } from "./ler";
import { buscarPeso } from "./pesos";
import type { CampoDetectado, PesoUsuario, TipoDocumento } from "./types";

export interface LineaFacturaDetectada {
  /** Texto de la pieza tal como aparece en la factura (limpio de importes). */
  pieza: string;
  articulo: string;
  cantidad: number;
  kgUnidad: number;
  kg: number;
  importe: number;
  exacta: boolean;
}

export interface ResultadoExtraccion {
  tipo: TipoDocumento;
  campos: CampoDetectado[];
  lineas: LineaFacturaDetectada[];
}

const sinAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Descripciones habituales en un CAT (solo para proponer; el usuario revisa). */
export const LER_CAT: Record<string, string> = {
  "13 01 10*": "Aceites hidráulicos minerales no clorados",
  "13 02 05*": "Aceites minerales no clorados de motor, transmisión y lubricación",
  "13 02 08*": "Otros aceites de motor, de transmisión mecánica y lubricantes",
  "13 05 07*": "Agua aceitosa procedente de separadores",
  "13 07 01*": "Fuel oil y gasóleo",
  "13 07 02*": "Gasolina",
  "14 06 01*": "Clorofluorocarburos, HCFC, HFC (gases refrigerantes)",
  "15 02 02*": "Absorbentes y trapos contaminados por sustancias peligrosas",
  "16 01 03": "Neumáticos fuera de uso",
  "16 01 04*": "Vehículos al final de su vida útil",
  "16 01 06": "Vehículos al final de su vida útil descontaminados",
  "16 01 07*": "Filtros de aceite",
  "16 01 10*": "Componentes explosivos (airbags, pretensores)",
  "16 01 11*": "Zapatas de freno que contienen amianto",
  "16 01 12": "Zapatas de freno",
  "16 01 13*": "Líquidos de frenos",
  "16 01 14*": "Anticongelantes que contienen sustancias peligrosas",
  "16 01 17": "Metales férreos",
  "16 01 18": "Metales no férreos",
  "16 01 19": "Plástico",
  "16 01 20": "Vidrio",
  "16 01 21*": "Componentes peligrosos",
  "16 01 22": "Componentes no especificados en otra categoría",
  "16 06 01*": "Baterías de plomo",
  "16 06 05": "Otras pilas y acumuladores",
  "16 08 01": "Catalizadores usados que contienen oro, plata, renio, rodio, paladio, iridio o platino",
};

const MARCAS = ["ALFA ROMEO", "AUDI", "BMW", "CHEVROLET", "CHRYSLER", "CITROEN", "CUPRA", "DACIA", "DAEWOO", "DAIHATSU", "DODGE", "DS", "FIAT", "FORD", "HONDA", "HYUNDAI", "IVECO", "JAGUAR", "JEEP", "KIA", "LAND ROVER", "LANCIA", "LEXUS", "MAZDA", "MERCEDES-BENZ", "MERCEDES", "MINI", "MITSUBISHI", "NISSAN", "OPEL", "PEUGEOT", "PORSCHE", "RENAULT", "ROVER", "SAAB", "SEAT", "SKODA", "SMART", "SSANGYONG", "SUBARU", "SUZUKI", "TESLA", "TOYOTA", "VOLKSWAGEN", "VW", "VOLVO", "YAMAHA", "KAWASAKI", "PIAGGIO", "KYMCO", "SYM", "APRILIA", "DUCATI", "HARLEY-DAVIDSON", "MG", "BYD"];

/** Convierte "1.234,5" / "1234.5" / "1 234" a número. */
export function numeroES(s: string): number {
  let t = s.replace(/\s/g, "");
  if (/,\d{1,3}$/.test(t)) t = t.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
  return parseFloat(t);
}

const fmtNum = (n: number) => (Number.isFinite(n) ? String(+n.toFixed(2)) : "");

export function normalizarFecha(s: string): string {
  let m = s.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) {
    const anio = m[3].length === 2 ? "20" + m[3] : m[3];
    const mes = parseInt(m[2], 10), dia = parseInt(m[1], 10);
    if (mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31) return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  }
  return "";
}

function buscarFecha(t: string): string {
  const cerca = t.match(/fecha[^\n\d]{0,30}(\d{1,4}[-/.]\d{1,2}[-/.]\d{2,4})/i);
  if (cerca) { const f = normalizarFecha(cerca[1]); if (f) return f; }
  const re = /\b(\d{1,2}[-/.]\d{1,2}[-/.]\d{4}|\d{4}-\d{2}-\d{2})\b/g;
  for (const m of t.matchAll(re)) { const f = normalizarFecha(m[1]); if (f) return f; }
  return "";
}

export function formatearLER(a: string, b: string, c: string, ast?: string) { return `${a} ${b} ${c}${ast ? "*" : ""}`; }

export function buscarLER(t: string): string[] {
  const out: string[] = [];
  const add = (x: string) => { if (!out.includes(x)) out.push(x); };
  for (const m of t.matchAll(/\bLER[^0-9\n]{0,30}(\d{2})[\s.]?(\d{2})[\s.]?(\d{2})\s?(\*)?/gi)) add(formatearLER(m[1], m[2], m[3], m[4]));
  for (const m of t.matchAll(/(?<![\d/.-])(\d{2}) (\d{2}) (\d{2})(?![\d/.-])\s?(\*)?/g)) {
    const cod = formatearLER(m[1], m[2], m[3], m[4]);
    const cap = parseInt(m[1], 10);
    if (cap >= 1 && cap <= 20) add(cod);
  }
  return out;
}

function buscarNIMAs(t: string): { origen: string; destino: string } {
  const todos = [...t.matchAll(/NIMA[^0-9\n]{0,25}(\d{10})/gi)].map((m) => m[1]);
  const o = t.match(/(origen|productor|remitente|operador del traslado)[\s\S]{0,160}?NIMA[^0-9\n]{0,25}(\d{10})/i)?.[2];
  const d = t.match(/(destino|destinatario|gestor|instalaci[oó]n de destino)[\s\S]{0,160}?NIMA[^0-9\n]{0,25}(\d{10})/i)?.[2];
  return { origen: o ?? todos[0] ?? "", destino: d && d !== (o ?? todos[0]) ? d : todos.find((x) => x !== (o ?? todos[0])) ?? "" };
}

function buscarKg(t: string): string {
  const m = t.match(/(\d{1,3}(?:[.\s]\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)\s?(kg|kgs|kilos|kilogramos)\b/i);
  if (m) return fmtNum(numeroES(m[1]));
  const ton = t.match(/(\d+(?:[.,]\d+)?)\s?(t|tn|toneladas)\b/i);
  if (ton) return fmtNum(numeroES(ton[1]) * 1000);
  return "";
}

/** Texto tras una etiqueta ("Gestor: X") hasta fin de línea. */
function tras(t: string, etiquetas: string[]): string {
  for (const e of etiquetas) {
    const m = t.match(new RegExp(e + "\\s*[:\\-]?\\s*([^\\n]{3,80})", "i"));
    if (m) return m[1].replace(/\s{2,}/g, " ").replace(/NIMA.*$/i, "").trim().replace(/[,;:]$/, "");
  }
  return "";
}

export function buscarMatricula(t: string): { valor: string; fiable: boolean } {
  const m = sinAcentos(t).toUpperCase().match(/(?<![A-Z0-9])(\d{4})[\s-]?([BCDFGHJKLMNPRSTVWXYZ]{3})(?![A-Z0-9])/);
  if (m) return { valor: `${m[1]} ${m[2]}`, fiable: true };
  const v = t.toUpperCase().match(/(?<![A-Z0-9])([A-Z]{1,2})[\s-](\d{4})[\s-]([A-Z]{1,2})(?![A-Z0-9])/);
  if (v) return { valor: `${v[1]}-${v[2]}-${v[3]}`, fiable: false };
  return { valor: "", fiable: false };
}

export function buscarVIN(t: string): string {
  for (const m of t.toUpperCase().matchAll(/(?<![A-Z0-9])([A-HJ-NPR-Z0-9]{17})(?![A-Z0-9])/g)) if (/\d/.test(m[1]) && /[A-Z]/.test(m[1])) return m[1];
  return "";
}

function buscarMarcaModelo(t: string): { marca: string; modelo: string } {
  const up = " " + sinAcentos(t).toUpperCase().replace(/\s+/g, " ") + " ";
  for (const marca of MARCAS) {
    const i = up.indexOf(" " + marca + " ");
    if (i >= 0) {
      const resto = up.slice(i + marca.length + 2).trim().split(" ");
      const modelo = resto.slice(0, 2).filter((w) => /^[A-Z0-9-]{1,12}$/.test(w) && !/^(MODELO|MATRICULA|BASTIDOR|FECHA|N|NO)$/.test(w)).join(" ");
      const bonita = marca === "VW" ? "Volkswagen" : marca.split(/([ -])/).map((w) => (w.length > 2 ? w[0] + w.slice(1).toLowerCase() : w)).join("");
      return { marca: bonita, modelo: modelo.split(" ")[0] ? modelo.split(" ").map((w) => (w.length > 3 ? w[0] + w.slice(1).toLowerCase() : w)).join(" ") : "" };
    }
  }
  return { marca: "", modelo: "" };
}

/** Clasificación por contenido; si no hay pistas, por nombre de archivo. */
export function clasificarTexto(t: string, nombre = "", mime = ""): TipoDocumento {
  if (esDIOficial(t)) return "DI";
  const s = sinAcentos(t).toLowerCase();
  if (/documento de identificacion|\bd\.?i\.?\b.{0,40}residuo|notificacion previa de traslado/.test(s) && /\bler\b/.test(s)) return "DI";
  if (/certificado de destruccion|baja definitiva|tratamiento medioambiental/.test(s)) return "Certificado de destrucción / baja";
  if (/\bfactura\b/.test(s)) return "Factura";
  if (/albaran/.test(s)) return "Albarán";
  if (/contrato de tratamiento/.test(s)) return "Contrato de tratamiento";
  if (/documento de traslado|notificacion de traslado/.test(s)) return "Documento de traslado";
  if (/informe de ensayo|laboratorio|analitica/.test(s)) return "Analítica";
  if (/resolucion|autorizacion ambiental|autorizacion de gestor/.test(s)) return "Autorización";
  if (/\bler\b/.test(s) && /nima/.test(s)) return "DI";
  return clasificarPorNombre(nombre, mime);
}

function emisor(t: string): string {
  const lineas = t.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const soc = lineas.find((l) => /\b(S\.?L\.?U?|S\.?A\.?|S\.?COOP|C\.?B\.?)\b\.?/i.test(l) && l.length < 80);
  return (soc ?? lineas[0] ?? "").replace(/\s+(C\.?I\.?F|N\.?I\.?F)\b.*$/i, "").replace(/\s{2,}/g, " ").trim().slice(0, 80);
}

const IMPORTE = /(\d{1,3}(?:\.\d{3})*,\d{2}|\d+[.,]\d{2})(?!\d)/g;

function importeTotal(t: string): string {
  const ms = [...t.matchAll(/total(?:\s+factura|\s+a\s+pagar|\s+euros)?[^\d\n]{0,25}(\d{1,3}(?:\.\d{3})*,\d{2}|\d+[.,]\d{2})/gi)];
  if (ms.length) return fmtNum(numeroES(ms[ms.length - 1][1]));
  return "";
}

const NO_LINEA = /(total|subtotal|base imponible|i\.?v\.?a|iva|irpf|recargo|forma de pago|vencimiento|iban|nif|cif|tel[eé]fono|domicilio|factura n|fecha)/i;

/** Líneas de una factura que corresponden a piezas del diccionario de pesos. */
export function lineasFactura(t: string, pesosUsuario: PesoUsuario[] = []): LineaFacturaDetectada[] {
  const out: LineaFacturaDetectada[] = [];
  for (const bruta of t.split(/\n/)) {
    const l = bruta.replace(/\s{2,}/g, " ").trim();
    if (l.length < 4 || NO_LINEA.test(l)) continue;
    const texto = l.replace(IMPORTE, " ").replace(/€/g, " ").replace(/\b\d+([.,]\d+)?\s?%/g, " ");
    const cant = texto.match(/^\s*(\d{1,3})\s+\D/)?.[1] ?? texto.match(/\b(?:x|uds?\.?|unidades)\s?(\d{1,3})\b/i)?.[1] ?? texto.match(/\s(\d{1,2})\s*$/)?.[1];
    const pieza = texto.replace(/^\s*\d{1,3}\s+/, "").replace(/\s\d{1,2}\s*$/, "").replace(/\b(?:x|uds?\.?|unidades)\s?\d{1,3}\b/i, "").replace(/\s{2,}/g, " ").trim().slice(0, 80);
    const c = buscarPeso(pieza, "", pesosUsuario);
    if (!c) continue;
    const cantidad = cant ? Math.max(1, parseInt(cant, 10)) : 1;
    const importes = [...l.matchAll(IMPORTE)].map((m) => numeroES(m[1]));
    out.push({ pieza: pieza || c.articulo, articulo: c.articulo, cantidad, kgUnidad: c.kg, kg: +(c.kg * cantidad).toFixed(2), importe: importes.length ? importes[importes.length - 1] : 0, exacta: c.exacta });
  }
  return out;
}


// ─── DI oficiales (RD 553/2020) ──────────────────────────────────────────────

const ACENTO: Record<string, string> = { a: "á", e: "é", i: "í", o: "ó", u: "ú", A: "Á", E: "É", I: "Í", O: "Ó", U: "Ú" };

/**
 * Algunos PDF oficiales (DI de la Junta) descomponen las tildes al extraer el texto:
 * «Razoín» (Razón), «Maílaga» (Málaga), «díígitos» (dígitos), «Pequenño» (Pequeño), «MAÁLAGA».
 * Solo se corrige si el texto muestra esa firma, para no tocar textos normales.
 */
export function limpiarTextoPdf(t: string): string {
  if (!/íí|ioín|seguín|Razoín|nño|AÁ|EÉ|IÍ|OÓ|UÚ/.test(t)) return t;
  return t
    .replace(/([aeiouAEIOU])íí/g, "$1\u0001") // vocal + í real (Coín, país)
    .replace(/íí/g, "í") // dígitos, artículo
    .replace(/([aeiou])í/g, (_m, v: string) => ACENTO[v]) // Razón, Málaga, según
    .replace(/AÁ|EÉ|IÍ|OÓ|UÚ/g, (m) => m[1]) // MAÁLAGA → MÁLAGA
    .replace(/nñ/g, "ñ").replace(/NÑ/g, "Ñ")
    .replace(/\u0001/g, "í");
}

export const esDIOficial = (t: string) => /RD\.?\s*553\/2020|DATOS DEL GESTOR U OPERADOR|DOCUMENTO DE IDENTIFICACI[OÓ]N[\s\S]{0,200}Documento\s*n[ºo°]/i.test(t);

/** Divide el texto de un PDF (por páginas) en documentos: cada DI empieza en una página con su «Documento nº». */
export function dividirDocumentos(paginas: string[]): string[] {
  const docs: string[] = [];
  for (const p of paginas) {
    const empieza = /DOCUMENTO DE IDENTIFICACI[OÓ]N/i.test(p) && /Documento\s*n[ºo°]\s*[A-Z0-9]{8,}/i.test(p);
    if (empieza || !docs.length) docs.push(p); else docs[docs.length - 1] += "\n" + p;
  }
  return docs;
}

function bloque(t: string, desde: RegExp, hasta: RegExp): string {
  const i = t.search(desde);
  if (i < 0) return "";
  const resto = t.slice(i);
  const j = resto.slice(1).search(hasta);
  return j < 0 ? resto : resto.slice(0, j + 1);
}

const linea = (t: string, re: RegExp) => (t.match(re)?.[1] ?? "").replace(/\s{2,}/g, " ").trim();

/** Campos de un DI oficial andaluz/estatal (formato RD 553/2020). */
export function extraerDIOficial(texto: string): Record<string, string> {
  const t = limpiarTextoPdf(texto);
  const rem = bloque(t, /DATOS DEL REMITENTE/i, /DATOS DEL RESIDUO|DATOS DEL GESTOR/i);
  const res = bloque(t, /DATOS DEL RESIDUO/i, /DATOS DEL GESTOR/i);
  const ges = bloque(t, /DATOS DEL GESTOR/i, /DATOS DEL TRANSPORTE|B\s*\.?\s*DATOS A CUMPLIMENTAR/i);
  const tra = bloque(t, /DATOS DEL TRANSPORTE/i, /B\s*\.?\s*DATOS A CUMPLIMENTAR|Tipo de envase/i);
  const dest = bloque(t, /DATOS A CUMPLIMENTAR POR EL DESTINATARIO/i, /\n\s*$/);
  const v: Record<string, string> = {};
  v.numero = linea(t, /Documento\s*n[ºo°]\s*([A-Z0-9]{8,})/i);
  const f = linea(t, /Fecha de inicio:\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i) || linea(dest, /Fecha:\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
  v.fecha = f ? normalizarFecha(f) : "";
  const ler = linea(res, /(?:seis\s*d[ií]gitos\s*\)?|L\.?E\.?R\.?\)?[^\n\d]{0,60})\s*(\d{2}\s?\d{2}\s?\d{2}\s?\*?)(?!\d)/i) || linea(res, /\b(\d{6}\*?)\b/);
  v.ler = ler ? normalizarLER(ler) : "";
  v.descripcion = linea(res, /Residuo en el productor:\s*(?:\d+\s*-\s*\d+\s*)?([^\n]+)/i);
  const kgAceptados = linea(dest, /Kilos Netos Aceptados:\s*([\d.,]+)/i);
  const kgNetos = linea(res, /Kgs?\.?\s*Netos:\s*([\d.,]+)/i);
  const kg = kgAceptados || kgNetos;
  v.cantidadKg = kg ? fmtNum(numeroES(kg)) : "";
  // En algunas páginas el valor aparece en la línea anterior a su etiqueta: se toma el primer NIMA (10 cifras) del bloque.
  const nima = (b: string) => linea(b, /NIMA:\s*(\d{10})/i) || (b.match(/(?<!\d)(\d{10})(?!\d)/)?.[1] ?? "");
  v.nimaOrigen = nima(rem);
  v.nifOrigen = linea(rem, /N\.?I\.?F\.?:\s*([A-Z0-9]{8,9})/i);
  v.razonSocialOrigen = linea(rem, /Raz[oó]n social\s*:\s*(.+?)\s+N\.?I\.?F/i);
  v.gestor = linea(ges, /Raz[oó]n social\s*\/?\s*(?:Nombre)?\s*:\s*(.+?)\s+N\.?I\.?F/i);
  v.nifDestino = linea(ges, /N\.?I\.?F\.?:\s*([A-Z0-9]{8,9})/i);
  v.nimaDestino = nima(ges);
  v.municipioDestino = linea(ges, /Municipio:\s*([^\n]+?)(?:\s+N[ºo°]\s*Tel|$)/im);
  v.provinciaDestino = linea(ges, /Provincia:\s*(?:\d+\s+)?([^\n]+?)\s+Municipio/i);
  v.transportista = linea(tra, /Raz[oó]n social\s*\/?\s*(?:Nombre)?\s*:\s*(.+?)\s+NIF/i);
  // Operación: la fila de valores bajo «Tabla 1 … Tabla 7»; la segunda columna es R/D.
  const tablas = res.match(/Tabla 1:[^\n]*\n([^\n]+)/i)?.[1] ?? "";
  const op = tablas.match(/\b([RD]\d{1,2})\b/)?.[1] ?? "";
  v.operacionDestino = op ? operacion4(op) : (v.ler ? infoLER(v.ler)?.operacion ?? "" : "");
  return v;
}

/**
 * Extrae tipo, campos y (si es factura) líneas de piezas.
 * @param calidad 0-1: 1 para PDF con texto; para OCR, la confianza media de Tesseract.
 */
export function extraerDeTexto(texto: string, opts: { nombre?: string; mime?: string; calidad?: number; pesosUsuario?: PesoUsuario[]; tipo?: TipoDocumento } = {}): ResultadoExtraccion {
  const t = limpiarTextoPdf(texto.replace(/\r/g, ""));
  const q = Math.max(0.45, Math.min(1, opts.calidad ?? 1));
  const tipo = opts.tipo ?? clasificarTexto(t, opts.nombre, opts.mime);
  const valores: Record<string, { v: string; c: number }> = {};
  const pon = (k: string, v: string, c = 0.9) => { if (v) valores[k] = { v, c: +(c * q).toFixed(2) }; };

  pon("fecha", buscarFecha(t));
  const lers = buscarLER(t);
  pon("ler", lers[0] ?? "");
  const desc = tras(t, ["descripci[oó]n del residuo", "descripci[oó]n"]) || (lers[0] ? LER_CAT[lers[0]] ?? "" : "");
  pon("descripcion", desc, lers[0] && LER_CAT[lers[0]] && !tras(t, ["descripci[oó]n"]) ? 0.65 : 0.85);
  pon("cantidadKg", buscarKg(t), 0.8);
  const nimas = buscarNIMAs(t);
  pon("nimaOrigen", nimas.origen, 0.85);
  pon("nimaDestino", nimas.destino, 0.75);
  pon("gestor", tras(t, ["gestor(?: de destino)?", "destinatario", "instalaci[oó]n de destino"]), 0.7);
  pon("transportista", tras(t, ["transportista", "empresa transportista"]), 0.7);
  const nDI = t.match(/\b(DI[-\s]?\d{6,}(?:[-\s]\d+)*)/i)?.[1] ?? t.match(/n[ºo°.]*\s*(?:de\s*)?D\.?I\.?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-/]{4,})/i)?.[1] ?? "";
  const mat = buscarMatricula(t);
  pon("matricula", mat.valor, mat.fiable ? 0.9 : 0.55);
  pon("vin", buscarVIN(t), 0.85);
  const mm = buscarMarcaModelo(t);
  pon("marca", mm.marca, 0.8);
  pon("modelo", mm.modelo, 0.6);
  pon("numeroCertificado", t.match(/(?:n[ºo°.]*\s*(?:de\s*)?certificado|certificado\s*n[ºo°.]+)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-/]*\d[A-Z0-9\-/]*)/i)?.[1] ?? "", 0.75);
  const nFac = t.match(/factura\s*(?:n[ºo°.]*|n[uú]m(?:ero)?\.?|#)?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-/]*\d[A-Z0-9\-/]*)/i)?.[1] ?? "";
  pon("emisor", emisor(t), 0.6);
  pon("importe", importeTotal(t), 0.85);
  pon("laboratorio", tras(t, ["laboratorio"]), 0.7);
  pon("puntoMuestreo", tras(t, ["punto de muestreo", "punto de toma"]), 0.7);
  pon("resultado", tras(t, ["resultado", "conclusi[oó]n"]), 0.6);
  pon("organo", tras(t, ["delegaci[oó]n territorial", "consejer[ií]a", "[oó]rgano"]), 0.6);
  pon("caducidad", normalizarFecha(tras(t, ["caducidad", "vigencia hasta", "v[aá]lid[oa] hasta"])), 0.7);
  pon("titulo", t.split("\n").map((l) => l.trim()).find((l) => l.length > 4)?.slice(0, 80) ?? "", 0.6);
  const numero = tipo === "DI" ? nDI : tipo === "Factura" || tipo === "Albarán" ? nFac || (t.match(/albar[aá]n\s*(?:n[ºo°.]*)?\s*[:\-]?\s*([A-Z0-9\-/]*\d[A-Z0-9\-/]*)/i)?.[1] ?? "") : (t.match(/(?:expediente|n[ºo°.]\s*(?:de\s*)?(?:contrato|documento|resoluci[oó]n))\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-/.]{3,})/i)?.[1] ?? "");
  pon("numero", numero, 0.8);

  if (tipo === "DI" && esDIOficial(t)) {
    // Formato oficial: los datos salen de su casilla exacta, con más confianza.
    for (const [k, val] of Object.entries(extraerDIOficial(t))) if (val) valores[k] = { v: val, c: +(0.95 * q).toFixed(2) };
  }
  const campos: CampoDetectado[] = camposPorTipo(tipo).map(({ clave, etiqueta }) => {
    const x = valores[clave];
    return { clave, etiqueta, valorDetectado: x?.v ?? "", valorFinal: x?.v ?? "", confianza: x?.c ?? 0, corregido: false };
  });
  const lineas = tipo === "Factura" || tipo === "Albarán" || tipo === "Venta de piezas" ? lineasFactura(t, opts.pesosUsuario) : [];
  return { tipo, campos, lineas };
}
