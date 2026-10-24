/**
 * SeproBot — tipos del dominio.
 * Sin dependencias de React ni de servicios externos.
 */

export type EstadoFicha = "Vigente" | "En revisión" | "Obsoleta" | "No aplica";
export const ESTADOS: EstadoFicha[] = ["Vigente", "En revisión", "Obsoleta", "No aplica"];

/** Dominio de la ficha: decide qué tipo de consulta puede responder. */
export type Dominio = "app" | "normativa" | "tramite";
export const DOMINIOS: { id: Dominio; etiqueta: string }[] = [
  { id: "app", etiqueta: "Uso de la aplicación" },
  { id: "normativa", etiqueta: "Normativa" },
  { id: "tramite", etiqueta: "Trámite" },
];

/** Intención detectada en el mensaje del usuario. */
export type Intencion = "uso_app" | "normativa" | "tramite" | "desconocida";

/** Entidades reconocidas (vocabulario cerrado, ampliable en intentClassifier.ts). */
export type Entidad =
  | "DI"
  | "piezas_vendidas"
  | "excel_ventas"
  | "vehiculo"
  | "baja"
  | "foto_baja"
  | "residuo"
  | "vertido"
  | "informe"
  | "situacion_anual"
  | "documento"
  | "ocr"
  | "GICA"
  | "VFU"
  | "traslado"
  | "neumaticos"
  | "baterias"
  | "garantias"
  | "aguas"
  | "LER"
  | "economia_circular"
  | "PIREC"
  | "aplicacion"
  | "desconocida";

export type Accion =
  | "registrar"
  | "importar"
  | "subir"
  | "consultar"
  | "renovar"
  | "modificar"
  | "revisar"
  | "eliminar"
  | "corregir"
  | "generar"
  | "explicar"
  | "aplicar"
  | "ninguna";

export interface Clasificacion {
  intencion: Intencion;
  entidad: Entidad;
  accion: Accion;
  /** true cuando hay dos lecturas plausibles (app vs normativa) y hay que preguntar. */
  ambigua: boolean;
  /** Marcadores explícitos detectados. */
  marcadorApp: boolean;
  marcadorNormativa: boolean;
}

export type TipoDocumento =
  | "Ley"
  | "Real Decreto"
  | "Real Decreto Legislativo"
  | "Reglamento UE"
  | "Orden"
  | "Decreto"
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
  | "Actividad y sector"
  | "Prevención de riesgos y datos"
  | "Uso de la aplicación";

/** Flujos conversacionales guiados que una ficha puede activar. */
export type FlujoId = "vertidos";

export interface Ficha {
  id: string;
  titulo: string;
  /** app | normativa | tramite. Obligatorio. */
  dominio: Dominio;
  /** Entidades que responde esta ficha (p. ej. ["DI"]). */
  entidades: Entidad[];
  /** Acciones que responde (p. ej. ["registrar"]). Vacío = cualquiera. */
  acciones: Accion[];
  /** Frases de ejemplo que un gerente escribiría. Se usan para desempatar. */
  frasesEjemplo: string[];
  /** Respuesta directa (introducción) para fichas de aplicación. */
  respuesta?: string;
  /** Pasos numerados (fichas de aplicación y trámites). */
  pasos: string[];
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
  /** Regla de aplicabilidad para responder "¿me aplica esta norma?" sin IA. */
  aplicabilidad?: Aplicabilidad;
}

export interface Aplicabilidad {
  /** si = aplica a todo CAT dentro del ámbito; depende = según condiciones; no = no aplica a CAT. */
  aplica: "si" | "depende" | "no";
  /** Explicación en una o dos frases. */
  porque: string;
  /** Condiciones que el centro debe comprobar (para "depende"). */
  condiciones?: string[];
}

export interface ResultadoBusqueda {
  ficha: Ficha;
  puntuacion: number;
}

export type DestinoAgua = "red" | "cauce" | "sin";
export type MotivoTramite = "alta" | "renovacion" | "modificacion" | "inspeccion";

export interface AclaracionPendiente {
  entidad: Entidad;
  accion: Accion;
  opciones: { etiqueta: string; intencion: Intencion }[];
}

export interface EstadoConversacion {
  tema: Materia | null;
  /** Pregunta de aclaración pendiente de respuesta. */
  aclaracion: AclaracionPendiente | null;
  /** Ficha cuya aplicabilidad se responderá cuando el usuario indique la ubicación. */
  aplicabilidadPendiente: string | null;
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
  /** Pasos numerados a renderizar como lista. */
  pasos?: string[];
  /** Opciones sugeridas (chips); nunca son obligatorias, el usuario puede escribir libremente. */
  opciones?: string[];
  /** Pie con fuente y estado de validación. */
  pie?: string;
}

export interface RespuestaMotor {
  estado: EstadoConversacion;
  mensajes: MensajeBot[];
}
