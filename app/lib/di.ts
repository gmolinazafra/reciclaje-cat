/** Convertir lo leído de un DI en registros de la app (DI + salida de residuo), sin duplicados. */
import { infoLER, normalizarLER, operacion4 } from "./ler";
import { uid } from "./repo";
import type { BaseDatos, DI, Residuo } from "./types";

export interface DatosDI {
  numero: string; fecha: string; ler: string; descripcion: string; cantidadKg: string;
  nimaOrigen: string; nimaDestino: string; gestor: string; nifDestino: string; operacionDestino: string;
  municipioDestino: string; provinciaDestino?: string; transportista: string; nifOrigen?: string; razonSocialOrigen?: string;
}

export const yaExisteDI = (db: BaseDatos, numero: string) => !!numero && db.dis.some((d) => d.numero.replace(/\s/g, "") === numero.replace(/\s/g, ""));

/** Salida si el remitente es este centro (o si no se sabe el NIMA del centro); entrada si el destino es este centro. */
export function sentidoDI(db: BaseDatos, nimaOrigen: string, nimaDestino: string): DI["sentido"] {
  const propio = db.centro.nima.replace(/\D/g, "");
  if (propio && nimaDestino.replace(/\D/g, "") === propio && nimaOrigen.replace(/\D/g, "") !== propio) return "entrada";
  return "salida";
}

/** Crea el DI y, si es una salida, el residuo asociado. Devuelve null si falta lo imprescindible o ya existe. */
export function registrosDesdeDI(db: BaseDatos, v: DatosDI, documentoId?: string): { di: DI; residuo?: Residuo } | null {
  const kg = parseFloat(String(v.cantidadKg).replace(",", "."));
  if (!v.numero || !v.ler || !(kg > 0) || yaExisteDI(db, v.numero)) return null;
  const ler = normalizarLER(v.ler);
  const fecha = v.fecha || new Date().toISOString().slice(0, 10);
  const ejercicio = parseInt(fecha.slice(0, 4), 10) || db.ejercicio;
  const sentido = sentidoDI(db, v.nimaOrigen, v.nimaDestino);
  const descripcion = v.descripcion || infoLER(ler)?.desc || "";
  const di: DI = {
    id: uid(), ejercicio, numero: v.numero.trim(), sentido, fecha, ler, descripcion, cantidadKg: kg,
    nimaOrigen: v.nimaOrigen, nimaDestino: v.nimaDestino, gestor: v.gestor, transportista: v.transportista, documentoId,
    nifDestino: v.nifDestino || undefined, operacionDestino: v.operacionDestino ? operacion4(v.operacionDestino) : infoLER(ler)?.operacion,
    tipoInscripcionDestino: ler.endsWith("*") ? "G01" : "G02", municipioDestino: v.municipioDestino || undefined, provinciaDestino: v.provinciaDestino || undefined,
    nifOrigen: v.nifOrigen || undefined, razonSocialOrigen: v.razonSocialOrigen || undefined,
  };
  if (sentido !== "salida") return { di };
  const residuo: Residuo = { id: uid(), ejercicio, fecha, ler, descripcion, cantidadKg: kg, gestor: v.gestor, diId: di.id, documentoId };
  di.residuoId = residuo.id;
  return { di, residuo };
}

/** Aplica varios DI a la base de datos de una vez. */
export function aplicarDIs(db: BaseDatos, lista: DatosDI[], documentoId?: string): { db: BaseDatos; creados: number; repetidos: number } {
  let d = db; let creados = 0; let repetidos = 0;
  for (const v of lista) {
    if (yaExisteDI(d, v.numero)) { repetidos++; continue; }
    const r = registrosDesdeDI(d, v, documentoId);
    if (!r) continue;
    d = { ...d, dis: [r.di, ...d.dis], residuos: r.residuo ? [r.residuo, ...d.residuos] : d.residuos };
    creados++;
  }
  return { db: d, creados, repetidos };
}
