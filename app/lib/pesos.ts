/**
 * Pesos de piezas y taras de vehículos.
 * - Piezas: diccionario oficial generado desde pesos.xls (diccionarioPesos.ts). Coincidencia exacta por
 *   nombre de artículo normalizado; si no, el artículo más largo contenido en el texto; pesos 0 se ignoran.
 * - Taras: tabla editable por el usuario (guardada en la base de datos) + valores por defecto por segmento.
 */

import { DICCIONARIO_PESOS } from "./diccionarioPesos";
import type { TaraVehiculo } from "./types";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

const ARTICULOS = DICCIONARIO_PESOS.filter((a) => a.kg > 0).map((a) => ({ ...a, n: norm(a.articulo) })).sort((a, b) => b.n.length - a.n.length);
const EXACTO = new Map(ARTICULOS.map((a) => [a.n, a.kg]));

export interface CoincidenciaPeso { kg: number; articulo: string; familia: string; exacta: boolean }

/** Busca el peso unitario de una pieza en el diccionario. */
export function buscarPeso(pieza: string, descripcion = ""): CoincidenciaPeso | null {
  const textos = [norm(pieza), norm(descripcion), norm(pieza + " " + descripcion)].filter(Boolean);
  for (const t of textos) {
    const kg = EXACTO.get(t);
    if (kg !== undefined) { const a = ARTICULOS.find((x) => x.n === t)!; return { kg, articulo: a.articulo, familia: a.familia, exacta: true }; }
  }
  const t = textos[textos.length - 1] ?? "";
  for (const a of ARTICULOS) if (a.n.length >= 4 && (" " + t + " ").includes(" " + a.n + " ")) return { kg: a.kg, articulo: a.articulo, familia: a.familia, exacta: false };
  for (const a of ARTICULOS) if (a.n.length >= 5 && t.includes(a.n)) return { kg: a.kg, articulo: a.articulo, familia: a.familia, exacta: false };
  return null;
}

/** Peso unitario o null (compatibilidad). */
export function pesoDiccionario(pieza: string, descripcion = ""): number | null {
  return buscarPeso(pieza, descripcion)?.kg ?? null;
}

export const FAMILIAS = [...new Set(DICCIONARIO_PESOS.map((a) => a.familia))].sort();

// ─── Taras ──────────────────────────────────────────────────────────────────

export const TARAS_SEGMENTO: Record<string, number> = {
  moto: 180, ciclomotor: 90, microcoche: 450, urbano: 950, compacto: 1200, berlina: 1400, familiar: 1450,
  suv: 1550, todoterreno: 1900, monovolumen: 1500, furgoneta: 1700, furgon: 2100, pickup: 2000, "camion ligero": 3000,
};

/** Tabla de taras inicial (editable por el usuario). Valores orientativos de tara en orden de marcha. */
export const TARAS_INICIALES: TaraVehiculo[] = [
  { id: "t-renault-clio", marca: "Renault", modelo: "Clio", tara: 1050, origen: "defecto" },
  { id: "t-renault-megane", marca: "Renault", modelo: "Megane", tara: 1280, origen: "defecto" },
  { id: "t-seat-ibiza", marca: "Seat", modelo: "Ibiza", tara: 1080, origen: "defecto" },
  { id: "t-seat-leon", marca: "Seat", modelo: "León", tara: 1250, origen: "defecto" },
  { id: "t-vw-golf", marca: "Volkswagen", modelo: "Golf", tara: 1290, origen: "defecto" },
  { id: "t-vw-polo", marca: "Volkswagen", modelo: "Polo", tara: 1100, origen: "defecto" },
  { id: "t-peugeot-208", marca: "Peugeot", modelo: "208", tara: 1050, origen: "defecto" },
  { id: "t-peugeot-308", marca: "Peugeot", modelo: "308", tara: 1250, origen: "defecto" },
  { id: "t-citroen-c3", marca: "Citroën", modelo: "C3", tara: 1050, origen: "defecto" },
  { id: "t-ford-fiesta", marca: "Ford", modelo: "Fiesta", tara: 1100, origen: "defecto" },
  { id: "t-ford-focus", marca: "Ford", modelo: "Focus", tara: 1300, origen: "defecto" },
  { id: "t-ford-transit", marca: "Ford", modelo: "Transit", tara: 2100, origen: "defecto" },
  { id: "t-opel-corsa", marca: "Opel", modelo: "Corsa", tara: 1080, origen: "defecto" },
  { id: "t-opel-astra", marca: "Opel", modelo: "Astra", tara: 1300, origen: "defecto" },
  { id: "t-toyota-yaris", marca: "Toyota", modelo: "Yaris", tara: 1050, origen: "defecto" },
  { id: "t-toyota-corolla", marca: "Toyota", modelo: "Corolla", tara: 1300, origen: "defecto" },
  { id: "t-nissan-qashqai", marca: "Nissan", modelo: "Qashqai", tara: 1450, origen: "defecto" },
  { id: "t-hyundai-i30", marca: "Hyundai", modelo: "i30", tara: 1300, origen: "defecto" },
  { id: "t-kia-ceed", marca: "Kia", modelo: "Ceed", tara: 1300, origen: "defecto" },
  { id: "t-dacia-sandero", marca: "Dacia", modelo: "Sandero", tara: 1050, origen: "defecto" },
  { id: "t-fiat-punto", marca: "Fiat", modelo: "Punto", tara: 1050, origen: "defecto" },
  { id: "t-bmw-serie3", marca: "BMW", modelo: "Serie 3", tara: 1500, origen: "defecto" },
  { id: "t-audi-a3", marca: "Audi", modelo: "A3", tara: 1300, origen: "defecto" },
  { id: "t-audi-a4", marca: "Audi", modelo: "A4", tara: 1500, origen: "defecto" },
  { id: "t-mercedes-clase-c", marca: "Mercedes-Benz", modelo: "Clase C", tara: 1550, origen: "defecto" },
  { id: "t-citroen-berlingo", marca: "Citroën", modelo: "Berlingo", tara: 1450, origen: "defecto" },
  { id: "t-peugeot-partner", marca: "Peugeot", modelo: "Partner", tara: 1450, origen: "defecto" },
  { id: "t-mercedes-sprinter", marca: "Mercedes-Benz", modelo: "Sprinter", tara: 2300, origen: "defecto" },
  { id: "t-fiat-ducato", marca: "Fiat", modelo: "Ducato", tara: 2100, origen: "defecto" },
];

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
