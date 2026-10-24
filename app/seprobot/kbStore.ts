/**
 * SeproBot — almacén de fichas.
 *
 * Combina la base de conocimiento definida en código (knowledgeBase.ts + knowledgeBaseApp.ts)
 * con las ediciones que el técnico hace desde el panel, guardadas en localStorage del navegador.
 * En Node (tests) no hay localStorage: se usa solo la base de código.
 *
 * El técnico puede exportar sus ediciones a JSON para que el desarrollador las consolide en código.
 */

import { knowledgeBase } from "./knowledgeBase";
import type { EstadoFicha, Ficha } from "./types";

const CLAVE = "seprobot.fichas.overrides.v1";

type Overrides = Record<string, Ficha>; // id → ficha completa (nueva o editada)

function leerOverrides(): Overrides {
  try {
    if (typeof window === "undefined" || !window.localStorage) return {};
    const raw = window.localStorage.getItem(CLAVE);
    return raw ? (JSON.parse(raw) as Overrides) : {};
  } catch {
    return {};
  }
}

function escribirOverrides(o: Overrides): boolean {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    window.localStorage.setItem(CLAVE, JSON.stringify(o));
    window.dispatchEvent(new Event("seprobot:fichas"));
    return true;
  } catch {
    return false;
  }
}

/** Base de código + ediciones del técnico. */
export function getFichas(): Ficha[] {
  const ov = leerOverrides();
  const vistas = new Set<string>();
  const out: Ficha[] = knowledgeBase.map((f) => {
    vistas.add(f.id);
    return ov[f.id] ?? f;
  });
  for (const id of Object.keys(ov)) if (!vistas.has(id)) out.push(ov[id]);
  return out;
}

export function getFichaPorId(id: string): Ficha | undefined {
  return getFichas().find((f) => f.id === id);
}

export function guardarFicha(f: Ficha): boolean {
  const ov = leerOverrides();
  ov[f.id] = { ...f, fechaRevision: new Date().toISOString().slice(0, 10) };
  return escribirOverrides(ov);
}

export function cambiarEstado(id: string, estado: EstadoFicha): boolean {
  const f = getFichaPorId(id);
  if (!f) return false;
  return guardarFicha({ ...f, estado });
}

/** ¿La ficha tiene ediciones locales del técnico? */
export function tieneOverride(id: string): boolean {
  return id in leerOverrides();
}

/** Elimina las ediciones locales de una ficha (vuelve a la versión de código) o la borra si era nueva. */
export function restaurarFicha(id: string): boolean {
  const ov = leerOverrides();
  delete ov[id];
  return escribirOverrides(ov);
}

export function exportarOverridesJSON(): string {
  return JSON.stringify(Object.values(leerOverrides()), null, 2);
}

export function importarOverridesJSON(json: string): number {
  const lista = JSON.parse(json) as Ficha[];
  if (!Array.isArray(lista)) throw new Error("El JSON debe ser una lista de fichas.");
  const ov = leerOverrides();
  for (const f of lista) if (f && typeof f.id === "string") ov[f.id] = f;
  escribirOverrides(ov);
  return lista.length;
}

export function contarPorEstado(fichas: Ficha[] = getFichas()): Record<EstadoFicha, number> {
  const c: Record<EstadoFicha, number> = { Vigente: 0, "En revisión": 0, Obsoleta: 0, "No aplica": 0 };
  for (const f of fichas) c[f.estado]++;
  return c;
}

/** Plantilla para una ficha nueva creada desde el panel. */
export function fichaVacia(): Ficha {
  return {
    id: "nueva-" + Date.now().toString(36),
    titulo: "",
    dominio: "app",
    entidades: [],
    acciones: [],
    frasesEjemplo: [],
    respuesta: "",
    pasos: [],
    tipoDocumento: "Ayuda de la aplicación",
    ambitoTerritorial: "Aplicación",
    materia: "Uso de la aplicación",
    etiquetas: [],
    sinonimos: [],
    resumen: "",
    requisitos: [],
    estado: "En revisión",
    fechaRevision: new Date().toISOString().slice(0, 10),
    fuente: "",
    version: "0.1",
  };
}
