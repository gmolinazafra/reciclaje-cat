/**
 * Repositorio de datos.
 * - Interfaz Repositorio: la misma para todas las persistencias.
 * - ArchivoRepositorio: versión Windows. Guarda en un archivo JSON dentro de la carpeta de datos del usuario
 *   (%APPDATA%\ReciclaCat_Gest\datos), con escritura atómica y copias automáticas (las hace el proceso principal).
 * - LocalRepositorio: versión navegador. Guarda en localStorage. NO es persistencia central.
 * - Datos demo: marcados con demo: true (visibles como tal en la UI).
 */

import { puente } from "./escritorio";
import { TARAS_INICIALES } from "./pesos";
import type { BaseDatos, DI, Documento, PesoUsuario, Residuo, TaraVehiculo, Vehiculo, Venta } from "./types";

const CLAVE = "reciclacat.db.v1";
const EVENTO = "reciclacat:db";

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function datosDemo(ejercicio = new Date().getFullYear()): BaseDatos {
  const e = ejercicio;
  const f = (m: number, d: number) => `${e}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const docBaja: Documento = {
    id: "demo-doc-1", ejercicio: e, nombreArchivo: "baja_1234ABC.pdf", mime: "application/pdf", tamano: 120000, fechaSubida: f(2, 3) + "T10:12:00",
    usuario: "demo", tipo: "Certificado de destrucción / baja", estado: "Guardado", origenOCR: "demo", demo: true,
    campos: [
      { clave: "matricula", etiqueta: "Matrícula", valorDetectado: "1234 ABC", valorFinal: "1234 ABC", confianza: 0.95, corregido: false },
      { clave: "fecha", etiqueta: "Fecha de baja", valorDetectado: f(2, 2), valorFinal: f(2, 2), confianza: 0.9, corregido: false },
    ],
  };
  const docDI: Documento = {
    id: "demo-doc-2", ejercicio: e, nombreArchivo: "DI_aceites_marzo.pdf", mime: "application/pdf", tamano: 98000, fechaSubida: f(3, 15) + "T09:00:00",
    usuario: "demo", tipo: "DI", estado: "Pendiente de revisar", origenOCR: "demo", demo: true,
    campos: [
      { clave: "numero", etiqueta: "Nº DI", valorDetectado: "DI-2900012345-0012", valorFinal: "DI-2900012345-0012", confianza: 0.92, corregido: false },
      { clave: "ler", etiqueta: "Código LER", valorDetectado: "13 02 08*", valorFinal: "13 02 08*", confianza: 0.88, corregido: false },
      { clave: "cantidadKg", etiqueta: "Cantidad (kg)", valorDetectado: "48O", valorFinal: "48O", confianza: 0.41, corregido: false },
      { clave: "gestor", etiqueta: "Gestor destino", valorDetectado: "Gestor demo S.L.", valorFinal: "Gestor demo S.L.", confianza: 0.8, corregido: false },
    ],
  };
  const vehiculos: Vehiculo[] = [
    { id: "demo-veh-1", ejercicio: e, matricula: "1234 ABC", vin: "VF1BB0A0A12345678", marca: "Renault", modelo: "Clio", fechaEntrada: f(2, 1), estado: "Desmontado", pesoEstimadoKg: 950, documentoBajaId: docBaja.id, demo: true },
    { id: "demo-veh-2", ejercicio: e, matricula: "5678 DEF", marca: "Seat", modelo: "León", fechaEntrada: f(3, 10), estado: "Descontaminado", pesoEstimadoKg: 1200, pesoBasculaKg: 1185, demo: true },
    { id: "demo-veh-3", ejercicio: e, matricula: "9012 GHI", marca: "Ford", modelo: "Transit", fechaEntrada: f(4, 5), estado: "Recibido", pesoEstimadoKg: 2100, demo: true },
  ];
  const ventas: Venta[] = [
    { id: "demo-ven-1", ejercicio: e, fecha: f(2, 20), mes: 2, pieza: "Motor", referencia: "K9K-702", descripcion: "Motor 1.5 dCi", cantidad: 1, precio: 650, pesoKg: 140, origenPeso: "estimado", vehiculoId: "demo-veh-1", origen: "factura", demo: true },
    { id: "demo-ven-2", ejercicio: e, fecha: f(3, 4), mes: 3, pieza: "Puerta delantera", referencia: "", descripcion: "Puerta delantera izquierda", cantidad: 1, precio: 90, pesoKg: 22, origenPeso: "real", origen: "excel", demo: true },
    { id: "demo-ven-3", ejercicio: e, fecha: f(3, 18), mes: 3, pieza: "Alternador", referencia: "A13VI", descripcion: "Alternador", cantidad: 2, precio: 60, pesoKg: 12, origenPeso: "estimado", origen: "excel", demo: true },
    { id: "demo-ven-4", ejercicio: e, fecha: f(4, 2), mes: 4, pieza: "Kit embrague", referencia: "", descripcion: "Kit embrague", cantidad: 1, precio: 120, pesoKg: 0, origenPeso: "pendiente", origen: "excel", demo: true },
  ];
  const dis: DI[] = [
    { id: "demo-di-1", ejercicio: e, numero: "DI-2900012345-0007", sentido: "salida", fecha: f(2, 28), ler: "16 06 01*", descripcion: "Baterías de plomo", cantidadKg: 320, nimaOrigen: "2900012345", nimaDestino: "4100067890", gestor: "Gestor demo S.L.", transportista: "Transportes demo S.L.", demo: true },
  ];
  const residuos: Residuo[] = [
    { id: "demo-res-1", ejercicio: e, fecha: f(2, 28), ler: "16 06 01*", descripcion: "Baterías de plomo", cantidadKg: 320, gestor: "Gestor demo S.L.", diId: "demo-di-1", demo: true },
    { id: "demo-res-2", ejercicio: e, fecha: f(3, 15), ler: "13 02 08*", descripcion: "Aceites de motor usados", cantidadKg: 480, gestor: "Gestor demo S.L.", demo: true },
    { id: "demo-res-3", ejercicio: e, fecha: f(4, 9), ler: "16 01 03", descripcion: "Neumáticos fuera de uso", cantidadKg: 640, gestor: "SCRAP neumáticos demo", demo: true },
  ];
  return {
    centro: { nombre: "Centro demo", nima: "2900012345", provincia: "", usuario: "demo" },
    ejercicio: e,
    documentos: [docBaja, docDI], ventas, vehiculos, residuos, dis, taras: TARAS_INICIALES, pesosUsuario: [],
  };
}

/** Base vacía para empezar de cero (primer arranque de la versión Windows y «Borrar todo»). */
export function baseVacia(ejercicio = new Date().getFullYear()): BaseDatos {
  return {
    centro: { nombre: "Mi centro", nima: "", provincia: "", usuario: "usuario" },
    ejercicio, documentos: [], ventas: [], vehiculos: [], residuos: [], dis: [], taras: TARAS_INICIALES, pesosUsuario: [],
  };
}

/** Completa campos que faltan en bases guardadas por versiones anteriores. */
function migrar(db: BaseDatos): BaseDatos {
  if (!db.taras) db.taras = TARAS_INICIALES;
  if (!db.pesosUsuario) db.pesosUsuario = [];
  for (const k of ["documentos", "ventas", "vehiculos", "residuos", "dis"] as const) if (!Array.isArray(db[k])) (db as unknown as Record<string, unknown[]>)[k] = [];
  if (!db.centro) db.centro = baseVacia().centro;
  if (!db.ejercicio) db.ejercicio = new Date().getFullYear();
  return db;
}

export interface Repositorio {
  /** Dónde viven los datos, para mostrarlo en Ajustes. */
  readonly tipo: "archivo" | "navegador";
  leer(): BaseDatos;
  guardar(db: BaseDatos): void;
  suscribir(fn: () => void): () => void;
  reiniciarDemo(): void;
  borrarTodo(): void;
}

export class LocalRepositorio implements Repositorio {
  readonly tipo = "navegador" as const;
  private cache: BaseDatos | null = null;
  leer(): BaseDatos {
    if (this.cache) return this.cache;
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(CLAVE) : null;
      this.cache = migrar(raw ? (JSON.parse(raw) as BaseDatos) : datosDemo());
    } catch { this.cache = datosDemo(); }
    return this.cache;
  }
  guardar(db: BaseDatos) {
    this.cache = db;
    try { window.localStorage.setItem(CLAVE, JSON.stringify(db)); window.dispatchEvent(new Event(EVENTO)); } catch { /* sin storage */ }
  }
  suscribir(fn: () => void) {
    if (typeof window === "undefined") return () => {};
    window.addEventListener(EVENTO, fn);
    return () => window.removeEventListener(EVENTO, fn);
  }
  reiniciarDemo() { this.guardar(datosDemo()); }
  borrarTodo() { this.guardar(baseVacia()); }
}

/** Versión Windows: archivo JSON en la carpeta de datos del usuario, a través del puente de Electron. */
export class ArchivoRepositorio implements Repositorio {
  readonly tipo = "archivo" as const;
  private cache: BaseDatos | null = null;
  private cola: Promise<unknown> = Promise.resolve();
  private oyentes = new Set<() => void>();
  /** Último error de escritura (se muestra en Ajustes si lo hay). */
  errorEscritura: string | null = null;
  leer(): BaseDatos {
    if (this.cache) return this.cache;
    const p = puente();
    try {
      const raw = p?.leerDB() ?? null;
      this.cache = migrar(raw ? (JSON.parse(raw) as BaseDatos) : baseVacia());
    } catch (e) {
      // Nunca sobrescribimos un archivo que no se ha podido leer: se trabaja en memoria y se avisa.
      this.errorEscritura = "No se ha podido leer el archivo de datos: " + (e as Error).message;
      this.cache = baseVacia();
      return this.cache;
    }
    return this.cache;
  }
  guardar(db: BaseDatos) {
    this.cache = db;
    this.oyentes.forEach((f) => f());
    if (this.errorEscritura?.startsWith("No se ha podido leer")) return;
    const json = JSON.stringify(db);
    const p = puente();
    // Escrituras en serie: nunca se pisa una versión nueva con una vieja.
    this.cola = this.cola.then(() => p?.guardarDB(json)).then((ok) => { this.errorEscritura = ok === false ? "No se ha podido guardar en disco." : null; })
      .catch((e: Error) => { this.errorEscritura = "No se ha podido guardar en disco: " + e.message; });
  }
  suscribir(fn: () => void) { this.oyentes.add(fn); return () => { this.oyentes.delete(fn); }; }
  reiniciarDemo() { this.guardar(datosDemo()); }
  borrarTodo() { this.guardar(baseVacia()); }
}

let repo: Repositorio = puente() ? new ArchivoRepositorio() : new LocalRepositorio();
export const getRepo = () => repo;
export const setRepo = (r: Repositorio) => { repo = r; };

/** Operaciones de dominio (puras sobre BaseDatos). */
export const ops = {
  addDocumento: (db: BaseDatos, d: Documento): BaseDatos => ({ ...db, documentos: [d, ...db.documentos] }),
  updDocumento: (db: BaseDatos, d: Documento): BaseDatos => ({ ...db, documentos: db.documentos.map((x) => (x.id === d.id ? d : x)) }),
  delDocumento: (db: BaseDatos, id: string): BaseDatos => ({ ...db, documentos: db.documentos.filter((x) => x.id !== id) }),
  addVentas: (db: BaseDatos, v: Venta[]): BaseDatos => ({ ...db, ventas: [...v, ...db.ventas] }),
  updVenta: (db: BaseDatos, v: Venta): BaseDatos => ({ ...db, ventas: db.ventas.map((x) => (x.id === v.id ? v : x)) }),
  delVenta: (db: BaseDatos, id: string): BaseDatos => ({ ...db, ventas: db.ventas.filter((x) => x.id !== id) }),
  addVehiculo: (db: BaseDatos, v: Vehiculo): BaseDatos => ({ ...db, vehiculos: [v, ...db.vehiculos] }),
  updVehiculo: (db: BaseDatos, v: Vehiculo): BaseDatos => ({ ...db, vehiculos: db.vehiculos.map((x) => (x.id === v.id ? v : x)) }),
  addResiduo: (db: BaseDatos, r: Residuo): BaseDatos => ({ ...db, residuos: [r, ...db.residuos] }),
  addDI: (db: BaseDatos, d: DI): BaseDatos => ({ ...db, dis: [d, ...db.dis] }),
  setEjercicio: (db: BaseDatos, e: number): BaseDatos => ({ ...db, ejercicio: e }),
  addTara: (db: BaseDatos, t: TaraVehiculo): BaseDatos => ({ ...db, taras: [t, ...db.taras] }),
  updTara: (db: BaseDatos, t: TaraVehiculo): BaseDatos => ({ ...db, taras: db.taras.map((x) => (x.id === t.id ? t : x)) }),
  delTara: (db: BaseDatos, id: string): BaseDatos => ({ ...db, taras: db.taras.filter((x) => x.id !== id) }),
  delResiduo: (db: BaseDatos, id: string): BaseDatos => ({ ...db, residuos: db.residuos.filter((x) => x.id !== id) }),
  setPesoUsuario: (db: BaseDatos, p: PesoUsuario): BaseDatos => ({ ...db, pesosUsuario: [{ ...p, fecha: new Date().toISOString().slice(0, 10) }, ...db.pesosUsuario.filter((x) => x.articulo.toLowerCase() !== p.articulo.toLowerCase())] }),
  delPesoUsuario: (db: BaseDatos, articulo: string): BaseDatos => ({ ...db, pesosUsuario: db.pesosUsuario.filter((x) => x.articulo.toLowerCase() !== articulo.toLowerCase()) }),
};
