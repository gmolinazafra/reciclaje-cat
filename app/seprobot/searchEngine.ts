/**
 * SeproBot — motor de búsqueda determinista.
 *
 * Sin IA, sin red. Normaliza texto (minúsculas, tildes, plurales básicos),
 * compara con título, etiquetas, sinónimos y materia, y devuelve un ranking.
 * Solo se puede responder con fichas en estado "Vigente".
 */

import type { EstadoFicha, Ficha, ResultadoBusqueda } from "./types";

const STOPWORDS = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "al", "a", "en", "y", "o", "u",
  "que", "es", "son", "por", "para", "con", "sin", "sobre", "como", "cual", "cuales", "quien",
  "me", "mi", "mis", "tu", "tus", "su", "sus", "se", "lo", "le", "les", "hay", "tengo", "necesito",
  "quiero", "puedo", "debo", "hacer", "hago", "donde", "cuando", "cuanto", "cuanta", "este", "esta",
  "esto", "eso", "ese", "esa", "si", "no", "ya", "muy", "mas", "menos", "tambien", "pero", "porque",
  "explicame", "dime", "explica", "informacion", "info", "saber", "significa", "existe",
]);

/** Minúsculas, sin tildes, sin signos; conserva números y barras (7/2007). */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!.,;:()"'«»“”]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Singular aproximado en castellano: leyes→ley, vertidos→vertido, autorizaciones→autorizacion. */
export function singularizar(palabra: string): string {
  if (palabra.length <= 3) return palabra;
  if (/[^aeiou]es$/.test(palabra) && palabra.length > 5) return palabra.slice(0, -2);
  if (/[aeiou]s$/.test(palabra)) return palabra.slice(0, -1);
  return palabra;
}

export function tokenizar(texto: string): string[] {
  return normalizar(texto)
    .split(" ")
    .filter((t) => t && !STOPWORDS.has(t))
    .map(singularizar);
}

function normalizarFrase(frase: string): string {
  return tokenizar(frase).join(" ");
}

/** Puntúa una ficha frente a una consulta. 0 = sin relación. */
export function puntuar(ficha: Ficha, consulta: string): number {
  const qNorm = normalizar(consulta);
  const qTokens = tokenizar(consulta);
  const qFrase = qTokens.join(" ");
  if (!qTokens.length) return 0;

  let puntos = 0;

  // 1) Sinónimos: coincidencia de frase completa (la más fiable).
  for (const s of ficha.sinonimos) {
    const sNorm = normalizar(s);
    const sFrase = normalizarFrase(s);
    if (!sNorm) continue;
    if (qNorm.includes(sNorm) || (sFrase && qFrase.includes(sFrase))) {
      // Sinónimos más largos = más específicos = más puntos.
      puntos += 10 + Math.min(sFrase.split(" ").length, 4) * 3;
    }
  }

  // 2) Etiquetas y materia: por tokens.
  const etiquetasTokens = new Set(ficha.etiquetas.flatMap(tokenizar));
  const materiaTokens = new Set(tokenizar(ficha.materia));
  const tituloTokens = new Set(tokenizar(ficha.titulo));

  for (const t of qTokens) {
    if (etiquetasTokens.has(t)) puntos += 4;
    if (materiaTokens.has(t)) puntos += 3;
    if (tituloTokens.has(t)) puntos += 2;
  }

  // 3) Coincidencia exacta de referencia normativa en el título ("7/2007", "265/2021").
  const refs = ficha.titulo.match(/\d+\/\d{4}/g) ?? [];
  for (const r of refs) if (qNorm.includes(r)) puntos += 12;

  return puntos;
}

export interface OpcionesBusqueda {
  /** Estados admitidos como fuente de respuesta. Por defecto solo "Vigente". */
  estados?: EstadoFicha[];
  /** Puntuación mínima para considerar una coincidencia real. */
  umbral?: number;
}

/**
 * Busca fichas ordenadas por puntuación. Por defecto SOLO devuelve fichas Vigentes.
 */
export function buscar(consulta: string, fichas: Ficha[], opciones: OpcionesBusqueda = {}): ResultadoBusqueda[] {
  const estados = opciones.estados ?? ["Vigente"];
  const umbral = opciones.umbral ?? 6;
  return fichas
    .filter((f) => estados.includes(f.estado))
    .map((ficha) => ({ ficha, puntuacion: puntuar(ficha, consulta) }))
    .filter((r) => r.puntuacion >= umbral)
    .sort((a, b) => b.puntuacion - a.puntuacion);
}

/** Mejor ficha vigente para la consulta, o null si no hay ninguna. */
export function mejorFichaVigente(consulta: string, fichas: Ficha[]): ResultadoBusqueda | null {
  return buscar(consulta, fichas)[0] ?? null;
}

/**
 * Indica si la consulta encaja con alguna ficha NO vigente (en revisión u obsoleta).
 * Solo sirve para informar al usuario de que existe documentación pendiente; nunca para responder con ella.
 */
export function coincideConFichaNoVigente(consulta: string, fichas: Ficha[]): Ficha | null {
  return buscar(consulta, fichas, { estados: ["En revisión", "Obsoleta"] })[0]?.ficha ?? null;
}
