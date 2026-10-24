/**
 * Memoria anual del CAT según SIRA (Junta de Andalucía) y el RD 265/2021.
 * - MAG peligrosos: entradas de vehículos (16 01 04*).
 * - MAP peligrosos / no peligrosos: residuos enviados a gestor (por LER, destino y operación).
 * - Datos de vehículos tratados, % de elementos extraídos, resto a fragmentadora, stock, neumáticos.
 * Funciones puras: no tocan la base de datos.
 */
import { ETIQUETA_DESTINO, infoLER, normalizarLER } from "./ler";
import type { DestinoMemoria } from "./ler";
import { esPeligroso } from "./types";
import type { BaseDatos, Vehiculo } from "./types";

export const OBJETIVO_PIEZAS = (ejercicio: number) => (ejercicio >= 2026 ? 15 : 10);

export const pesoVehiculo = (v: Vehiculo) => v.pesoBasculaKg ?? v.pesoEstimadoKg ?? 0;

const enAnio = (fecha: string | undefined, e: number) => !!fecha && fecha.slice(0, 4) === String(e);
const finDe = (e: number) => `${e}-12-31`;
const t3 = (kg: number) => +(kg / 1000).toFixed(3);
const pct = (parte: number, total: number) => (total > 0 ? +((parte / total) * 100).toFixed(2) : 0);
/** «13 02 08*» → «130208» (así lo muestra SIRA en las salidas). */
export const lerSIRA = (ler: string, conAsterisco = false) => {
  const d = normalizarLER(ler);
  return d.replace(/\s/g, "").replace("*", conAsterisco ? "*" : "");
};

/** Fecha en la que se considera tratado (descontaminado) el vehículo. */
export function fechaTratado(v: Vehiculo): string | undefined {
  if (v.fechaDescontaminacion) return v.fechaDescontaminacion;
  return v.estado !== "Recibido" ? v.fechaEntrada : undefined;
}

export function destinoDe(db: BaseDatos, ler: string): DestinoMemoria {
  const cod = normalizarLER(ler);
  const propio = db.centro.destinoLER?.[cod] as DestinoMemoria | undefined;
  return propio ?? infoLER(cod)?.destino ?? (esPeligroso(cod) ? "reciclaje" : "reciclaje");
}

export interface FilaSIRA {
  ler: string; descripcion: string; t: number; kg: number; nima: string; nif: string; razonSocial: string;
  tipoInscripcion: string; operacion: string; pais: string; provincia: string; municipio: string; peligroso: boolean;
  /** Avisos de datos que faltan para SIRA. */
  faltan: string[];
}

export interface MemoriaSIRA {
  ejercicio: number;
  centro: BaseDatos["centro"];
  vehiculos: {
    entradas: number; entradasKg: number; tratados: number; tratadosKg: number;
    stockInicial: number; stockInicialKg: number; stockFinal: number; stockFinalKg: number;
    balanceOk: boolean; sinPeso: number; sinFechaDescontaminacion: number;
  };
  /** % sobre el peso de los vehículos tratados. */
  porcentajes: Record<DestinoMemoria | "otrosGestores", number>;
  kg: Record<DestinoMemoria, number>;
  fragmentadoraPorDiferencia: boolean;
  objetivoPiezas: { objetivo: number; actual: number; cumple: boolean };
  entradasMAG: FilaSIRA[];
  salidasPeligrosos: FilaSIRA[];
  salidasNoPeligrosos: FilaSIRA[];
  stockResiduos: { ler: string; descripcion: string; kgFinal: number; kgInicial: number; peligroso: boolean }[];
  neumaticos: { segundaManoKg: number; segundaManoUds: number; aCambioKg: number; aCambioUds: number; certificadoKg: number; certificadoUds: number; filas: NonNullable<BaseDatos["neumaticos"]> };
  avisos: string[];
}

export function memoriaSIRA(db: BaseDatos, e = db.ejercicio): MemoriaSIRA {
  const c = db.centro;
  const avisos: string[] = [];
  const veh = db.vehiculos;
  const entradas = veh.filter((v) => enAnio(v.fechaEntrada, e));
  const tratados = veh.filter((v) => enAnio(fechaTratado(v), e));
  const enStock = (fin: string) => veh.filter((v) => v.fechaEntrada <= fin && (!fechaTratado(v) || (fechaTratado(v) as string) > fin));
  const stockIni = enStock(finDe(e - 1));
  const stockFin = enStock(finDe(e));
  const suma = (arr: Vehiculo[]) => arr.reduce((a, v) => a + pesoVehiculo(v), 0);
  const tratadosKg = suma(tratados);
  const vehiculos = {
    entradas: entradas.length, entradasKg: suma(entradas), tratados: tratados.length, tratadosKg,
    stockInicial: stockIni.length, stockInicialKg: suma(stockIni), stockFinal: stockFin.length, stockFinalKg: suma(stockFin),
    balanceOk: stockIni.length + entradas.length === tratados.length + stockFin.length,
    sinPeso: entradas.filter((v) => !pesoVehiculo(v)).length,
    sinFechaDescontaminacion: veh.filter((v) => v.estado !== "Recibido" && !v.fechaDescontaminacion && enAnio(v.fechaEntrada, e)).length,
  };

  // ── Residuos enviados a gestor en el año (se prefieren los datos del DI) ──
  const fila = (ler: string, descripcion: string, kg: number, nima: string, nif: string, razon: string, tipo: string, op: string, municipio: string, provincia: string): FilaSIRA => {
    const faltan: string[] = [];
    if (!nima) faltan.push("NIMA destino"); if (!op) faltan.push("operación"); if (!razon) faltan.push("gestor");
    return { ler: normalizarLER(ler), descripcion, t: t3(kg), kg, nima, nif, razonSocial: razon, tipoInscripcion: tipo, operacion: op, pais: "España", provincia, municipio, peligroso: esPeligroso(normalizarLER(ler)), faltan };
  };
  const salidas: FilaSIRA[] = [];
  for (const r of db.residuos.filter((x) => enAnio(x.fecha, e))) {
    const di = r.diId ? db.dis.find((d) => d.id === r.diId) : undefined;
    const ler = normalizarLER(di?.ler ?? r.ler);
    salidas.push(fila(ler, r.descripcion || infoLER(ler)?.desc || "", r.cantidadKg, di?.nimaDestino ?? "", di?.nifDestino ?? "", di?.gestor || r.gestor, di?.tipoInscripcionDestino ?? (esPeligroso(ler) ? "G01" : "G02"), di?.operacionDestino ?? infoLER(ler)?.operacion ?? "", di?.municipioDestino ?? "", di?.provinciaDestino ?? ""));
  }
  // DI de salida sin residuo asociado (p. ej. registrados a mano)
  for (const di of db.dis.filter((d) => d.sentido === "salida" && enAnio(d.fecha, e) && !db.residuos.some((r) => r.diId === d.id))) {
    salidas.push(fila(di.ler, di.descripcion, di.cantidadKg, di.nimaDestino, di.nifDestino ?? "", di.gestor, di.tipoInscripcionDestino ?? (esPeligroso(di.ler) ? "G01" : "G02"), di.operacionDestino ?? infoLER(di.ler)?.operacion ?? "", di.municipioDestino ?? "", di.provinciaDestino ?? ""));
  }
  // Vehículos descontaminados entregados (16 01 06)
  for (const v of veh.filter((x) => x.salida && enAnio(x.salida.fecha, e))) {
    const s = v.salida!;
    salidas.push(fila("16 01 06", "Vehículos al final de su vida útil descontaminados", s.kg ?? pesoVehiculo(v), s.nima ?? "", s.nif ?? "", s.gestor, "G02", s.operacion ?? "R1203", "", ""));
  }
  // Agrupar como SIRA: LER + NIMA + operación
  const agrupar = (lista: FilaSIRA[]) => {
    const m = new Map<string, FilaSIRA>();
    for (const f of lista) {
      const k = [f.ler, f.nima, f.operacion, f.razonSocial.toLowerCase()].join("|");
      const prev = m.get(k);
      if (prev) { prev.kg += f.kg; prev.t = t3(prev.kg); prev.faltan = [...new Set([...prev.faltan, ...f.faltan])]; }
      else m.set(k, { ...f, faltan: [...f.faltan] });
    }
    return [...m.values()].sort((a, b) => a.ler.localeCompare(b.ler));
  };
  const salidasPeligrosos = agrupar(salidas.filter((f) => f.peligroso));
  const salidasNoPeligrosos = agrupar(salidas.filter((f) => !f.peligroso));

  // ── % de elementos extraídos sobre el peso tratado ──
  const neum = (db.neumaticos ?? []).filter((n) => enAnio(n.fecha, e));
  const sumN = (t: string, k: "kg" | "unidades") => neum.filter((n) => n.tipo === t).reduce((a, n) => a + (n[k] || 0), 0);
  const kg: Record<DestinoMemoria, number> = { reutilizacion: 0, reciclaje: 0, valorizacion: 0, eliminacion: 0, fragmentadora: 0 };
  kg.reutilizacion = db.ventas.filter((v) => v.ejercicio === e).reduce((a, v) => a + v.pesoKg, 0) + sumN("segunda_mano", "kg");
  for (const f of salidas) {
    const d = f.ler === "16 01 06" ? "fragmentadora" : destinoDe(db, f.ler);
    if (f.ler === "16 01 04*") continue;
    kg[d] += f.kg;
  }
  const medidoFrag = kg.fragmentadora > 0;
  const porcentajes = {
    reutilizacion: pct(kg.reutilizacion, tratadosKg), reciclaje: pct(kg.reciclaje, tratadosKg), valorizacion: pct(kg.valorizacion, tratadosKg),
    eliminacion: pct(kg.eliminacion, tratadosKg), fragmentadora: 0, otrosGestores: 0,
  };
  porcentajes.fragmentadora = !tratadosKg ? 0 : medidoFrag ? pct(kg.fragmentadora, tratadosKg)
    : Math.max(0, +(100 - porcentajes.reutilizacion - porcentajes.reciclaje - porcentajes.valorizacion - porcentajes.eliminacion).toFixed(2));
  const objetivo = OBJETIVO_PIEZAS(e);

  // ── Entradas MAG peligrosos: vehículos (16 01 04*) ──
  const entradasMAG: FilaSIRA[] = [];
  const grupos = new Map<string, { kg: number; nombre: string; nif: string; nima: string; tipo: string }>();
  for (const v of entradas) {
    const p = v.procedencia;
    const esEmpresa = p && p.tipo !== "particular" && (p.nif || p.nombre);
    const g = esEmpresa ? { nombre: p!.nombre ?? "", nif: p!.nif ?? "", nima: p!.nima ?? "", tipo: p!.nima ? "G01" : "P04" }
      : c.procedenciaEntradas === "particulares" ? { nombre: "PARTICULARES", nif: "", nima: "", tipo: "P05" }
      : { nombre: c.razonSocial || c.nombre, nif: c.nif ?? "", nima: c.nima, tipo: "G01" };
    const k = [g.nombre, g.nif, g.nima].join("|");
    const prev = grupos.get(k) ?? { ...g, kg: 0 };
    prev.kg += pesoVehiculo(v);
    grupos.set(k, prev);
  }
  for (const g of grupos.values()) {
    entradasMAG.push({ ler: "16 01 04*", descripcion: "Vehículos al final de su vida útil", t: t3(g.kg), kg: g.kg, nima: g.nima, nif: g.nif, razonSocial: g.nombre, tipoInscripcion: g.tipo, operacion: c.operacionAutorizada || "R1201", pais: "España", provincia: c.provincia, municipio: c.municipio ?? "", peligroso: true, faltan: [] });
  }

  // ── Stock de residuos ──
  const st = db.stocks ?? [];
  const lers = [...new Set(st.filter((x) => x.ejercicio === e || x.ejercicio === e - 1).map((x) => x.ler))];
  const stockResiduos = lers.map((ler) => ({ ler, descripcion: infoLER(ler)?.desc ?? "", kgFinal: st.find((x) => x.ejercicio === e && x.ler === ler)?.kg ?? 0, kgInicial: st.find((x) => x.ejercicio === e - 1 && x.ler === ler)?.kg ?? 0, peligroso: esPeligroso(ler) }));

  // ── Avisos para presentar ──
  if (!c.nif) avisos.push("Falta el NIF del centro (Ajustes)");
  if (!c.nima) avisos.push("Falta el NIMA del centro (Ajustes)");
  if (!c.razonSocial) avisos.push("Falta la razón social (Ajustes)");
  if (!vehiculos.balanceOk) avisos.push("El balance de vehículos no cuadra: stock inicial + entradas ≠ tratados + stock final");
  if (vehiculos.sinPeso) avisos.push(`${vehiculos.sinPeso} vehículo(s) sin peso`);
  if (vehiculos.sinFechaDescontaminacion) avisos.push(`${vehiculos.sinFechaDescontaminacion} vehículo(s) tratados sin fecha de descontaminación (se usa la de entrada)`);
  const sinDatos = [...salidasPeligrosos, ...salidasNoPeligrosos].filter((f) => f.faltan.length);
  if (sinDatos.length) avisos.push(`${sinDatos.length} línea(s) de salida sin ${[...new Set(sinDatos.flatMap((f) => f.faltan))].join(", ")}`);
  if (tratadosKg && porcentajes.reutilizacion < objetivo) avisos.push(`Piezas para reutilización: ${porcentajes.reutilizacion} % del peso tratado; el objetivo es al menos el ${objetivo} % (RD 265/2021)`);
  if (!tratadosKg && (salidas.length || entradas.length)) avisos.push("No hay vehículos tratados en el ejercicio: los % no se pueden calcular (indica la fecha de descontaminación de los vehículos)");
  if (!medidoFrag && tratadosKg) avisos.push("No hay salidas a fragmentadora registradas: su % se calcula por diferencia");

  return {
    ejercicio: e, centro: c, vehiculos, porcentajes, kg, fragmentadoraPorDiferencia: !medidoFrag,
    objetivoPiezas: { objetivo, actual: porcentajes.reutilizacion, cumple: porcentajes.reutilizacion >= objetivo },
    entradasMAG, salidasPeligrosos, salidasNoPeligrosos, stockResiduos,
    neumaticos: { segundaManoKg: sumN("segunda_mano", "kg"), segundaManoUds: sumN("segunda_mano", "unidades"), aCambioKg: sumN("nfu_a_cambio", "kg"), aCambioUds: sumN("nfu_a_cambio", "unidades"), certificadoKg: sumN("certificado_7_5", "kg"), certificadoUds: sumN("certificado_7_5", "unidades"), filas: neum },
    avisos,
  };
}

export { ETIQUETA_DESTINO };
