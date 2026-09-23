/** Importación de ventas desde Excel/CSV: lectura, mapeo de columnas, validación por fila y estimación de pesos. */

import * as XLSX from "xlsx";
import { pesoDiccionario } from "./pesos";
import type { OrigenPeso, Venta } from "./types";

export type Fila = Record<string, string>;

export interface Mapeo {
  referencia?: string;
  descripcion?: string;
  cantidad?: string;
  precio?: string;
  peso?: string;
  fecha?: string;
}

export const CAMPOS_MAPEO: { clave: keyof Mapeo; etiqueta: string; obligatorio: boolean }[] = [
  { clave: "referencia", etiqueta: "Referencia", obligatorio: false },
  { clave: "descripcion", etiqueta: "Descripción / pieza", obligatorio: true },
  { clave: "cantidad", etiqueta: "Cantidad", obligatorio: true },
  { clave: "precio", etiqueta: "Precio / importe", obligatorio: false },
  { clave: "peso", etiqueta: "Peso (kg)", obligatorio: false },
  { clave: "fecha", etiqueta: "Fecha", obligatorio: false },
];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

/** Propone un mapeo automático a partir de los encabezados. */
export function mapeoAutomatico(encabezados: string[]): Mapeo {
  const m: Mapeo = {};
  for (const h of encabezados) {
    const n = norm(h);
    if (!m.referencia && /^(ref|referencia|codigo|cod|sku|oem)/.test(n)) m.referencia = h;
    else if (!m.descripcion && /(descripcion|pieza|articulo|producto|concepto|nombre)/.test(n)) m.descripcion = h;
    else if (!m.cantidad && /^(cant|cantidad|uds|unidades|qty)/.test(n)) m.cantidad = h;
    else if (!m.precio && /(precio|importe|total|pvp|euros|€)/.test(n)) m.precio = h;
    else if (!m.peso && /(peso|kg|kilos)/.test(n)) m.peso = h;
    else if (!m.fecha && /(fecha|date|dia)/.test(n)) m.fecha = h;
  }
  return m;
}

/** Lee CSV o XLSX a filas con encabezado. */
export async function leerArchivo(archivo: File): Promise<{ encabezados: string[]; filas: Fila[] }> {
  const buf = await archivo.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", raw: false });
  const hoja = wb.Sheets[wb.SheetNames[0]];
  const datos = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, { defval: "" });
  const filas: Fila[] = datos.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v ?? "").trim()])));
  const encabezados = filas.length ? Object.keys(filas[0]) : [];
  return { encabezados, filas };
}

/** Versión pura para tests: parsea texto CSV. */
export function parsearCSV(texto: string): { encabezados: string[]; filas: Fila[] } {
  const wb = XLSX.read(texto, { type: "string", raw: false });
  const hoja = wb.Sheets[wb.SheetNames[0]];
  const datos = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, { defval: "" });
  const filas: Fila[] = datos.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v ?? "").trim()])));
  return { encabezados: filas.length ? Object.keys(filas[0]) : [], filas };
}

const numero = (s: string): number | null => {
  if (!s) return null;
  const t = s.replace(/\./g, "").replace(",", ".").replace(/[^\d.\-]/g, "");
  const v = parseFloat(t);
  return Number.isFinite(v) ? v : null;
};

function fechaISO(s: string, ejercicio: number, mes: number): string {
  const m = s.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m) {
    const a = m[3].length === 2 ? "20" + m[3] : m[3];
    return `${a}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return `${ejercicio}-${String(mes).padStart(2, "0")}-01`;
}

export interface FilaValidada {
  indice: number;
  venta: Omit<Venta, "id" | "origen" | "documentoId"> | null;
  errores: string[];
}

/** Aplica el mapeo, valida por fila y estima pesos que falten con el diccionario. */
export function validarFilas(filas: Fila[], mapeo: Mapeo, ejercicio: number, mes: number): FilaValidada[] {
  return filas.map((f, i) => {
    const errores: string[] = [];
    const descripcion = mapeo.descripcion ? f[mapeo.descripcion] : "";
    const referencia = mapeo.referencia ? f[mapeo.referencia] : "";
    const cantidad = mapeo.cantidad ? numero(f[mapeo.cantidad]) : null;
    const precio = mapeo.precio ? numero(f[mapeo.precio]) : 0;
    const pesoCol = mapeo.peso ? numero(f[mapeo.peso]) : null;
    if (!descripcion) errores.push("Falta descripción");
    if (cantidad === null || cantidad <= 0) errores.push("Cantidad no válida");
    let pesoKg = 0;
    let origenPeso: OrigenPeso = "pendiente";
    if (pesoCol !== null && pesoCol > 0) { pesoKg = pesoCol; origenPeso = "real"; }
    else {
      const d = pesoDiccionario(descripcion, referencia);
      if (d !== null && cantidad) { pesoKg = +(d * cantidad).toFixed(2); origenPeso = "estimado"; }
    }
    if (errores.length) return { indice: i, venta: null, errores };
    const fecha = fechaISO(mapeo.fecha ? f[mapeo.fecha] : "", ejercicio, mes);
    return {
      indice: i,
      errores,
      venta: {
        ejercicio, fecha, mes: parseInt(fecha.slice(5, 7), 10) || mes,
        pieza: descripcion, referencia, descripcion, cantidad: cantidad as number, precio: precio ?? 0, pesoKg, origenPeso,
      },
    };
  });
}
