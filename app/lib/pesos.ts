/**
 * Pesos de piezas y taras de vehículos.
 * - Piezas: diccionario de pesos REALES (diccionarioPesos.ts; lista de artículos del inventario, pesos aproximados
 *   por tipo; los volumétricos del Excel no se usan). El usuario corrige pesos desde la app (overrides). Coincidencia
 *   exacta por nombre normalizado; si no, el artículo más largo contenido en el texto; pesos 0 = pendientes.
 * - Taras: tabla editable por el usuario (guardada en la base de datos) + valores por defecto por segmento.
 */

import { DICCIONARIO_PESOS } from "./diccionarioPesos";
import type { ArticuloPeso } from "./diccionarioPesos";
import type { PesoUsuario, TaraVehiculo } from "./types";

/** Normaliza para comparar: minúsculas, sin acentos ni signos y sin palabras vacías («caja de cambios» = «caja cambios»). */
const norm = (s: string) => (" " + s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ") + " ")
  .replace(/ (de|del|la|el|los|las|y|con|para) /g, " ").replace(/ (de|del|la|el|los|las|y|con|para) /g, " ").replace(/\s+/g, " ").trim();

export interface CoincidenciaPeso { kg: number; articulo: string; familia: string; exacta: boolean; origen: "usuario" | "diccionario" }

/** Diccionario efectivo: base + correcciones del usuario (por nombre de artículo). */
export function diccionarioEfectivo(overrides: PesoUsuario[] = []): ArticuloPeso[] {
  const ov = new Map(overrides.map((o) => [norm(o.articulo), o]));
  const base = DICCIONARIO_PESOS.map((a) => { const o = ov.get(norm(a.articulo)); return o ? { ...a, kg: o.kg } : a; });
  const extra = overrides.filter((o) => !DICCIONARIO_PESOS.some((a) => norm(a.articulo) === norm(o.articulo))).map((o) => ({ familia: o.familia ?? "USUARIO", articulo: o.articulo, kg: o.kg }));
  return [...base, ...extra];
}

let cacheKey = "";
let ARTICULOS: (ArticuloPeso & { n: string })[] = [];
let EXACTO = new Map<string, number>();
function preparar(overrides: PesoUsuario[]) {
  const key = overrides.map((o) => o.articulo + "=" + o.kg).join("|");
  if (key === cacheKey && ARTICULOS.length) return;
  cacheKey = key;
  ARTICULOS = diccionarioEfectivo(overrides).filter((a) => a.kg > 0).map((a) => ({ ...a, n: norm(a.articulo) })).sort((a, b) => b.n.length - a.n.length);
  EXACTO = new Map(ARTICULOS.map((a) => [a.n, a.kg]));
}

/** Busca el peso unitario de una pieza en el diccionario (con correcciones del usuario). */
export function buscarPeso(pieza: string, descripcion = "", overrides: PesoUsuario[] = []): CoincidenciaPeso | null {
  preparar(overrides);
  const esUsuario = (art: string) => overrides.some((o) => norm(o.articulo) === norm(art));
  const textos = [norm(pieza), norm(descripcion), norm(pieza + " " + descripcion)].filter(Boolean);
  for (const t of textos) {
    const kg = EXACTO.get(t);
    if (kg !== undefined) { const a = ARTICULOS.find((x) => x.n === t)!; return { kg, articulo: a.articulo, familia: a.familia, exacta: true, origen: esUsuario(a.articulo) ? "usuario" : "diccionario" }; }
  }
  const t = textos[textos.length - 1] ?? "";
  for (const a of ARTICULOS) if (a.n.length >= 4 && (" " + t + " ").includes(" " + a.n + " ")) return { kg: a.kg, articulo: a.articulo, familia: a.familia, exacta: false, origen: esUsuario(a.articulo) ? "usuario" : "diccionario" };
  for (const a of ARTICULOS) if (a.n.length >= 5 && t.includes(a.n)) return { kg: a.kg, articulo: a.articulo, familia: a.familia, exacta: false, origen: esUsuario(a.articulo) ? "usuario" : "diccionario" };
  return null;
}

/** Peso unitario o null. */
export function pesoDiccionario(pieza: string, descripcion = "", overrides: PesoUsuario[] = []): number | null {
  return buscarPeso(pieza, descripcion, overrides)?.kg ?? null;
}

export const FAMILIAS = [...new Set(DICCIONARIO_PESOS.map((a) => a.familia))].sort();

// ─── Taras ──────────────────────────────────────────────────────────────────

export const TARAS_SEGMENTO: Record<string, number> = {
  moto: 180, ciclomotor: 90, microcoche: 450, urbano: 950, compacto: 1200, berlina: 1400, familiar: 1450,
  suv: 1550, todoterreno: 1900, monovolumen: 1500, furgoneta: 1700, furgon: 2100, pickup: 2000, "camion ligero": 3000,
};

export { TARAS_INICIALES } from "./tarasVehiculos";
import { TARAS_INICIALES } from "./tarasVehiculos";

const MODELOS: [RegExp, string][] = [
  [/\b(yaris|ibiza|polo|clio|208|207|c3|fiesta|micra|corsa|i20|swift|jazz|fabia|sandero|aygo|c1|107|108|up|ka|twingo|panda|500)\b/i, "urbano"],
  [/\b(golf|leon|astra|focus|megane|308|307|civic|corolla|auris|i30|octavia|ceed|bravo|stilo|tipo|a3|serie 1|clase a)\b/i, "compacto"],
  [/\b(passat|mondeo|insignia|laguna|talisman|508|407|accord|avensis|a4|a6|serie 3|serie 5|clase c|clase e|toledo|exeo|superb|mazda6|camry)\b/i, "berlina"],
  [/\b(qashqai|tucson|sportage|tiguan|ateca|3008|2008|5008|kuga|rav4|cr-v|hr-v|x1|x3|q3|q5|kadjar|captur|juke|arona|kona|yeti|karoq|kodiaq|c-hr|duster)\b/i, "suv"],
  [/\b(land cruiser|pajero|montero|patrol|discovery|defender|range rover|x5|x-trail|santa fe|sorento|touareg|cayenne|terrano|vitara|jimny)\b/i, "todoterreno"],
  [/\b(scenic|picasso|touran|sharan|alhambra|galaxy|s-max|zafira|verso|espace|carens)\b/i, "monovolumen"],
  [/\b(caddy|berlingo|partner|kangoo|doblo|combo|connect|courier|bipper|nemo|fiorino|dokker)\b/i, "furgoneta"],
  [/\b(transit|sprinter|ducato|boxer|jumper|crafter|master|trafic|vivaro|daily|transporter|t5|t6|hiace|nv300|nv400|h1)\b/i, "furgon"],
  [/\b(hilux|navara|ranger|l200|amarok|d-max)\b/i, "pickup"],
];

export interface TaraResultado { kg: number; origen: "tabla" | "segmento" | "defecto"; detalle: string }

/** Estima la tara: 1) tabla del usuario (marca+modelo), 2) segmento por modelo, 3) compacto por defecto. */
export function taraEstimada(marca: string, modelo: string, tabla: TaraVehiculo[] = TARAS_INICIALES): TaraResultado {
  const m = norm(marca), mo = norm(modelo);
  const fila = tabla.find((t) => norm(t.marca) === m && norm(t.modelo) === mo) ?? tabla.find((t) => mo && norm(t.modelo) === mo);
  if (fila) return { kg: fila.tara, origen: "tabla", detalle: `${fila.marca} ${fila.modelo} (tabla de taras)` };
  const t = `${marca} ${modelo}`;
  for (const [re, seg] of MODELOS) if (re.test(t)) return { kg: TARAS_SEGMENTO[seg], origen: "segmento", detalle: `segmento ${seg}` };
  if (/\b(moto|motocicleta|scooter)\b/i.test(t)) return { kg: TARAS_SEGMENTO.moto, origen: "segmento", detalle: "moto" };
  return { kg: TARAS_SEGMENTO.compacto, origen: "defecto", detalle: "compacto por defecto: revisa la tabla de taras" };
}
