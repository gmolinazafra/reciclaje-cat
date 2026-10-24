/**
 * Catálogo de códigos LER habituales en un CAT (Decisión 2014/955/UE) con lo que necesita la memoria anual:
 * si es peligroso, descripción, a qué se destina normalmente (para los % de la memoria) y la operación
 * en destino que suele figurar en SIRA. Todo es editable: son valores por defecto, no obligaciones.
 */

export type DestinoMemoria = "reutilizacion" | "reciclaje" | "valorizacion" | "eliminacion" | "fragmentadora";

export interface CodigoLER {
  cod: string; // "13 02 08*"
  desc: string;
  destino: DestinoMemoria;
  /** Operación en destino habitual (4 cifras) para la memoria. */
  operacion: string;
}

export const CATALOGO_LER: CodigoLER[] = [
  { cod: "13 01 10*", desc: "Aceites hidráulicos minerales no clorados", destino: "reciclaje", operacion: "R1301" },
  { cod: "13 02 05*", desc: "Aceites minerales no clorados de motor, transmisión y lubricación", destino: "reciclaje", operacion: "R1301" },
  { cod: "13 02 08*", desc: "Otros aceites de motor, de transmisión mecánica y lubricantes", destino: "reciclaje", operacion: "R1301" },
  { cod: "13 05 07*", desc: "Agua aceitosa procedente de separadores", destino: "eliminacion", operacion: "R1301" },
  { cod: "13 07 01*", desc: "Fuel oil y gasóleo", destino: "valorizacion", operacion: "R1301" },
  { cod: "13 07 02*", desc: "Gasolina", destino: "valorizacion", operacion: "R1301" },
  { cod: "13 07 03*", desc: "Otros combustibles (incluidas mezclas)", destino: "valorizacion", operacion: "R1301" },
  { cod: "14 06 01*", desc: "Clorofluorocarburos, HCFC, HFC (gases refrigerantes)", destino: "reciclaje", operacion: "R1301" },
  { cod: "15 01 10*", desc: "Envases que contienen restos de sustancias peligrosas", destino: "reciclaje", operacion: "R1301" },
  { cod: "15 02 02*", desc: "Absorbentes, trapos y ropas contaminados por sustancias peligrosas", destino: "valorizacion", operacion: "R1301" },
  { cod: "16 01 04*", desc: "Vehículos al final de su vida útil", destino: "fragmentadora", operacion: "R1201" },
  { cod: "16 01 07*", desc: "Filtros de aceite", destino: "reciclaje", operacion: "R1301" },
  { cod: "16 01 08*", desc: "Componentes que contienen mercurio", destino: "eliminacion", operacion: "R1301" },
  { cod: "16 01 09*", desc: "Componentes que contienen PCB", destino: "eliminacion", operacion: "R1301" },
  { cod: "16 01 10*", desc: "Componentes explosivos (airbags, pretensores)", destino: "eliminacion", operacion: "R1301" },
  { cod: "16 01 11*", desc: "Zapatas de freno que contienen amianto", destino: "eliminacion", operacion: "R1301" },
  { cod: "16 01 13*", desc: "Líquidos de frenos", destino: "reciclaje", operacion: "R1301" },
  { cod: "16 01 14*", desc: "Anticongelantes que contienen sustancias peligrosas", destino: "reciclaje", operacion: "R1301" },
  { cod: "16 01 21*", desc: "Componentes peligrosos distintos de los de 16 01 07 a 16 01 11, 16 01 13 y 16 01 14", destino: "reciclaje", operacion: "R1301" },
  { cod: "16 02 13*", desc: "Equipos desechados que contienen componentes peligrosos", destino: "reciclaje", operacion: "R1301" },
  { cod: "16 06 01*", desc: "Baterías de plomo", destino: "reciclaje", operacion: "R1301" },
  { cod: "16 06 02*", desc: "Acumuladores de Ni-Cd", destino: "reciclaje", operacion: "R1301" },
  { cod: "16 06 03*", desc: "Pilas que contienen mercurio", destino: "reciclaje", operacion: "R1301" },
  { cod: "16 08 07*", desc: "Catalizadores usados contaminados con sustancias peligrosas", destino: "reciclaje", operacion: "R1301" },
  { cod: "16 01 03", desc: "Neumáticos fuera de uso", destino: "reciclaje", operacion: "R1301" },
  { cod: "16 01 06", desc: "Vehículos al final de su vida útil descontaminados", destino: "fragmentadora", operacion: "R1203" },
  { cod: "16 01 12", desc: "Zapatas de freno distintas de las de 16 01 11", destino: "reciclaje", operacion: "R1301" },
  { cod: "16 01 15", desc: "Anticongelantes distintos de los de 16 01 14", destino: "reciclaje", operacion: "R1301" },
  { cod: "16 01 16", desc: "Depósitos para gases licuados", destino: "reciclaje", operacion: "R1301" },
  { cod: "16 01 17", desc: "Metales férreos", destino: "reciclaje", operacion: "R1301" },
  { cod: "16 01 18", desc: "Metales no férreos", destino: "reciclaje", operacion: "R1301" },
  { cod: "16 01 19", desc: "Plástico", destino: "reciclaje", operacion: "R1301" },
  { cod: "16 01 20", desc: "Vidrio", destino: "reciclaje", operacion: "R1301" },
  { cod: "16 01 22", desc: "Componentes no especificados en otra categoría", destino: "reciclaje", operacion: "R1301" },
  { cod: "16 01 99", desc: "Residuos no especificados en otra categoría", destino: "reciclaje", operacion: "R1301" },
  { cod: "16 06 04", desc: "Pilas alcalinas", destino: "reciclaje", operacion: "R1301" },
  { cod: "16 06 05", desc: "Otras pilas y acumuladores", destino: "reciclaje", operacion: "R1301" },
  { cod: "16 08 01", desc: "Catalizadores usados que contienen oro, plata, renio, rodio, paladio, iridio o platino", destino: "reciclaje", operacion: "R1301" },
  { cod: "15 01 01", desc: "Envases de papel y cartón", destino: "reciclaje", operacion: "R1301" },
  { cod: "15 01 02", desc: "Envases de plástico", destino: "reciclaje", operacion: "R1301" },
  { cod: "15 01 04", desc: "Envases metálicos", destino: "reciclaje", operacion: "R1301" },
  { cod: "20 01 02", desc: "Vidrio", destino: "reciclaje", operacion: "R1301" },
  { cod: "19 10 01", desc: "Residuos de hierro y acero", destino: "reciclaje", operacion: "R1301" },
  { cod: "20 01 21*", desc: "Tubos fluorescentes y otros residuos que contienen mercurio", destino: "reciclaje", operacion: "R1301" },
];

const sinAsterisco = (s: string) => s.replace(/\s|\*/g, "");
const PELIGROSOS = new Set(CATALOGO_LER.filter((c) => c.cod.endsWith("*")).map((c) => sinAsterisco(c.cod)));

/** Capítulos/subcapítulos en los que TODOS los códigos son peligrosos. */
const PREFIJOS_PELIGROSOS = ["13", "1406"];

/** Formatea «130208» o «13 02 08» como «13 02 08*» si es peligroso (aunque el DI no traiga el asterisco). */
export function normalizarLER(cod: string): string {
  const d = cod.replace(/\D/g, "").slice(0, 6);
  if (d.length !== 6) return cod.trim();
  const base = `${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 6)}`;
  const peligroso = /\*/.test(cod) || PELIGROSOS.has(d) || PREFIJOS_PELIGROSOS.some((p) => d.startsWith(p));
  return peligroso ? base + "*" : base;
}

export const infoLER = (cod: string): CodigoLER | undefined => {
  const n = sinAsterisco(normalizarLER(cod));
  return CATALOGO_LER.find((c) => sinAsterisco(c.cod) === n);
};

/** Operación de 2 cifras (p. ej. R13 de la tabla 2 del DI) → 4 cifras habitual en SIRA (R1301). */
export function operacion4(op: string): string {
  const m = op.toUpperCase().replace(/\s/g, "").match(/^([RD])(\d{1,2})(\d{2})?$/);
  if (!m) return op.toUpperCase().trim();
  if (m[3]) return `${m[1]}${m[2].padStart(2, "0")}${m[3]}`;
  return `${m[1]}${m[2].padStart(2, "0")}01`;
}

export const ETIQUETA_DESTINO: Record<DestinoMemoria, string> = {
  reutilizacion: "Reutilización", reciclaje: "Reciclaje", valorizacion: "Valorización energética", eliminacion: "Eliminación", fragmentadora: "Fragmentadora",
};

/** Tipos de inscripción de SIRA más habituales para destinos y procedencias. */
export const TIPOS_INSCRIPCION = ["G01", "G02", "G04", "G05", "G06", "P01", "P02", "P03", "P04", "P05"];
export const DESC_INSCRIPCION: Record<string, string> = {
  G01: "Centro gestor de residuos peligrosos", G02: "Centro gestor de residuos no peligrosos", G04: "Centro de tratamiento (valorización/eliminación)",
  G05: "Centro de almacenamiento", G06: "Otros centros gestores", P01: "Productor de residuos peligrosos", P02: "Pequeño productor de residuos peligrosos",
  P03: "Productor de residuos no peligrosos", P04: "Productor sin obligación de inscripción", P05: "Particular / sin NIMA",
};
