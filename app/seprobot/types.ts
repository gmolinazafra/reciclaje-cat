/**
 * SeproBot — tipos del dominio.
 * Sin dependencias de React ni de servicios externos.
 */

export type EstadoFicha = "Vigente" | "En revisión" | "Obsoleta";

export type TipoDocumento =
  | "Ley"
  | "Real Decreto"
  | "Real Decreto Legislativo"
  | "Reglamento UE"
  | "Orden"
  | "Plan"
  | "Ficha técnica"
  | "Ayuda de la aplicación";

export type Materia =
  | "Normativa ambiental"
  | "Vertidos"
  | "Residuos"
  | "Vehículos al final de su vida útil"
  | "Neumáticos"
  | "Baterías"
  | "Garantías financieras"
  | "Planificación"
  | "Uso de la aplicación";

/** Flujos conversacionales guiados que una ficha puede activar. */
export type FlujoId = "vertidos";

export interface Ficha {
  id: string;
  titulo: string;
  tipoDocumento: TipoDocumento;
  ambitoTerritorial: string;
  materia: Materia;
  etiquetas: string[];
  sinonimos: string[];
  resumen: string;
  requisitos: string[];
  estado: EstadoFicha;
  fechaRevision: string; // ISO yyyy-mm-dd
  fuente: string;
  version: string;
  /** Preguntas que el bot puede proponer tras responder. */
  preguntasSeguimiento?: string[];
  /** Flujo guiado asociado (solo si la consulta es un trámite concreto). */
  flujo?: FlujoId;
  /** Notas internas para el técnico (no se muestran al usuario). */
  notasTecnico?: string;
}

export interface ResultadoBusqueda {
  ficha: Ficha;
  puntuacion: number;
}

export type DestinoAgua = "red" | "cauce" | "sin";
export type MotivoTramite = "alta" | "renovacion" | "modificacion" | "inspeccion";

export interface EstadoConversacion {
  tema: Materia | null;
  fichaActiva: string | null;
  flujoActivo: FlujoId | null;
  /** Ficha con flujo recién respondida en modo general; permite entrar al flujo si el usuario concreta. */
  flujoSugerido: FlujoId | null;
  ubicacion: string | null;
  destinoAgua: DestinoAgua | null;
  motivo: MotivoTramite | null;
  pasosCompletados: string[];
}

export interface MensajeBot {
  texto: string;
  /** Opciones sugeridas (chips); nunca son obligatorias, el usuario puede escribir libremente. */
  opciones?: string[];
  /** Pie con fuente y estado de validación. */
  pie?: string;
}

export interface RespuestaMotor {
  estado: EstadoConversacion;
  mensajes: MensajeBot[];
}
