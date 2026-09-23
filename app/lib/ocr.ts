/**
 * OCR / extracción de documentos.
 * Arquitectura: interfaz OcrProvider + proveedor DEMO (simulado) por defecto.
 * Para conectar OCR real (Azure Document Intelligence, Google Vision, Tesseract en servidor…),
 * implementa OcrProvider y regístralo en getOcrProvider(). Nada se guarda sin revisión humana.
 */

import type { CampoDetectado, TipoDocumento } from "./types";

export interface ResultadoOCR {
  tipo: TipoDocumento;
  campos: CampoDetectado[];
  origen: "demo" | "real";
  error?: string;
}

export interface OcrProvider {
  nombre: string;
  esDemo: boolean;
  extraer(archivo: File): Promise<ResultadoOCR>;
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
      { clave: "gestor", etiqueta: "Gestor destino" }, { clave: "transportista", etiqueta: "Transportista" },
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

let proveedor: OcrProvider = new DemoOcrProvider();
export function getOcrProvider(): OcrProvider { return proveedor; }
export function setOcrProvider(p: OcrProvider) { proveedor = p; }
