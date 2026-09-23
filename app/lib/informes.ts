/** Agregaciones para Resumen e Informes. Funciones puras. */
import type { BaseDatos, Documento } from "./types";

export interface ResumenAnual {
  ejercicio: number;
  vehiculos: number;
  vehiculosSinBaja: number;
  ventas: number;
  kgPiezas: number;
  kgPiezasReal: number;
  kgPiezasEstimado: number;
  kgPiezasPendiente: number;
  importeVentas: number;
  kgResiduos: number;
  dis: number;
  documentosPendientes: number;
  documentosError: number;
  porMes: { mes: number; kgPiezas: number; ventas: number; kgResiduos: number; vehiculos: number }[];
  porLER: { ler: string; descripcion: string; kg: number }[];
}

export function resumenAnual(db: BaseDatos, ejercicio = db.ejercicio): ResumenAnual {
  const v = db.ventas.filter((x) => x.ejercicio === ejercicio);
  const veh = db.vehiculos.filter((x) => x.ejercicio === ejercicio);
  const res = db.residuos.filter((x) => x.ejercicio === ejercicio);
  const dis = db.dis.filter((x) => x.ejercicio === ejercicio);
  const docs = db.documentos.filter((x) => x.ejercicio === ejercicio);
  const suma = (arr: number[]) => +arr.reduce((a, b) => a + b, 0).toFixed(2);
  const porMes = Array.from({ length: 12 }, (_, i) => {
    const mes = i + 1;
    return {
      mes,
      kgPiezas: suma(v.filter((x) => x.mes === mes).map((x) => x.pesoKg)),
      ventas: v.filter((x) => x.mes === mes).length,
      kgResiduos: suma(res.filter((x) => parseInt(x.fecha.slice(5, 7), 10) === mes).map((x) => x.cantidadKg)),
      vehiculos: veh.filter((x) => parseInt(x.fechaEntrada.slice(5, 7), 10) === mes).length,
    };
  });
  const lerMap = new Map<string, { descripcion: string; kg: number }>();
  for (const r of res) {
    const e = lerMap.get(r.ler) ?? { descripcion: r.descripcion, kg: 0 };
    e.kg = +(e.kg + r.cantidadKg).toFixed(2);
    lerMap.set(r.ler, e);
  }
  return {
    ejercicio,
    vehiculos: veh.length,
    vehiculosSinBaja: veh.filter((x) => !x.documentoBajaId).length,
    ventas: v.length,
    kgPiezas: suma(v.map((x) => x.pesoKg)),
    kgPiezasReal: suma(v.filter((x) => x.origenPeso === "real").map((x) => x.pesoKg)),
    kgPiezasEstimado: suma(v.filter((x) => x.origenPeso === "estimado").map((x) => x.pesoKg)),
    kgPiezasPendiente: v.filter((x) => x.origenPeso === "pendiente").length,
    importeVentas: suma(v.map((x) => x.precio * x.cantidad)),
    kgResiduos: suma(res.map((x) => x.cantidadKg)),
    dis: dis.length,
    documentosPendientes: docs.filter((d) => d.estado === "Pendiente de revisar").length,
    documentosError: docs.filter((d) => d.estado === "Error de lectura").length,
    porMes,
    porLER: [...lerMap.entries()].map(([ler, e]) => ({ ler, ...e })).sort((a, b) => b.kg - a.kg),
  };
}

/** Alertas de completitud para la memoria anual. */
export function alertas(db: BaseDatos, ejercicio = db.ejercicio): string[] {
  const r = resumenAnual(db, ejercicio);
  const out: string[] = [];
  if (r.documentosPendientes) out.push(`${r.documentosPendientes} documento(s) pendientes de revisar`);
  if (r.documentosError) out.push(`${r.documentosError} documento(s) con error de lectura`);
  if (r.vehiculosSinBaja) out.push(`${r.vehiculosSinBaja} vehículo(s) sin documento de baja`);
  if (r.kgPiezasPendiente) out.push(`${r.kgPiezasPendiente} venta(s) sin peso (ni real ni estimado)`);
  const sinDI = db.residuos.filter((x) => x.ejercicio === ejercicio && !x.diId).length;
  if (sinDI) out.push(`${sinDI} salida(s) de residuos sin DI asociado`);
  return out;
}

/** Texto plano de la memoria anual (base para PDF/Excel). */
export function memoriaAnualTexto(db: BaseDatos, ejercicio = db.ejercicio): string {
  const r = resumenAnual(db, ejercicio);
  const l: string[] = [];
  l.push(`MEMORIA ANUAL ${ejercicio} — ${db.centro.nombre} (NIMA ${db.centro.nima})`);
  l.push("");
  l.push(`Vehículos recibidos: ${r.vehiculos} (sin baja: ${r.vehiculosSinBaja})`);
  l.push(`Piezas vendidas: ${r.ventas} líneas · ${r.kgPiezas} kg (reales ${r.kgPiezasReal} · estimados ${r.kgPiezasEstimado})`);
  l.push(`Residuos gestionados: ${r.kgResiduos} kg en ${r.dis} DI`);
  l.push("");
  l.push("Residuos por código LER:");
  for (const x of r.porLER) l.push(`  ${x.ler}  ${x.descripcion}  ${x.kg} kg`);
  l.push("");
  l.push("Por mes (kg piezas / kg residuos / vehículos):");
  for (const m of r.porMes) if (m.kgPiezas || m.kgResiduos || m.vehiculos) l.push(`  ${String(m.mes).padStart(2, "0")}  ${m.kgPiezas} / ${m.kgResiduos} / ${m.vehiculos}`);
  const al = alertas(db, ejercicio);
  if (al.length) { l.push(""); l.push("Pendiente para cerrar la memoria:"); for (const a of al) l.push("  - " + a); }
  return l.join("\n");
}

export function documentosPorEstado(docs: Documento[]) {
  return {
    "Pendiente de revisar": docs.filter((d) => d.estado === "Pendiente de revisar").length,
    Revisado: docs.filter((d) => d.estado === "Revisado").length,
    Guardado: docs.filter((d) => d.estado === "Guardado").length,
    "Error de lectura": docs.filter((d) => d.estado === "Error de lectura").length,
  };
}
