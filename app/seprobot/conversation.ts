/**
 * SeproBot — máquina de estados conversacional.
 *
 * Función pura: (estado, texto del usuario) → (nuevo estado, mensajes del bot).
 * Mantiene contexto entre mensajes (tema, ubicación, destino del agua, motivo).
 * Solo pregunta datos cuando son imprescindibles para el flujo activo.
 * No asume ubicación por defecto en ningún caso.
 */

import { knowledgeBase, MENSAJE_SIN_FICHA } from "./knowledgeBase";
import { coincideConFichaNoVigente, mejorFichaVigente, normalizar, tokenizar } from "./searchEngine";
import type {
  DestinoAgua,
  EstadoConversacion,
  Ficha,
  MensajeBot,
  MotivoTramite,
  RespuestaMotor,
} from "./types";

export const estadoInicial: EstadoConversacion = {
  tema: null,
  fichaActiva: null,
  flujoActivo: null,
  flujoSugerido: null,
  ubicacion: null,
  destinoAgua: null,
  motivo: null,
  pasosCompletados: [],
};

// ─── Detectores de intención (deterministas) ────────────────────────────────

const PALABRAS_TRAMITE = [
  "renovar", "renovacion", "alta", "nueva", "nuevo", "solicitar", "solicitud", "tramitar", "tramite",
  "modificar", "modificacion", "ampliar", "ampliacion", "inspeccion", "inspeccionar", "caduca", "caducado",
  "vence", "vencido", "presentar", "expediente",
];

/** ¿La consulta describe un trámite concreto (y no una pregunta general)? */
export function esConsultaDeTramite(texto: string): boolean {
  const tokens = new Set(tokenizar(texto));
  const n = normalizar(texto);
  if (/^(que|qué) es\b/.test(n) || /\ben que consiste\b/.test(n) || /\bque significa\b/.test(n)) return false;
  return PALABRAS_TRAMITE.some((p) => tokens.has(p) || n.includes(p));
}

export function detectarDestinoAgua(texto: string): DestinoAgua | null {
  const n = normalizar(texto);
  if (/\b(sin vertido|no vierto|no hay vertido|no vertemos|sin verter|gestor|cisterna|cuba)\b/.test(n)) return "sin";
  if (/\b(red|saneamiento|alcantarillado|colector|emasa|emacsa|depuradora municipal|edar)\b/.test(n)) return "red";
  if (/\b(cauce|terreno|rio|arroyo|infiltracion|suelo|pozo|dominio publico|confederacion)\b/.test(n)) return "cauce";
  return null;
}

export function detectarMotivo(texto: string): MotivoTramite | null {
  const n = normalizar(texto);
  if (/\b(renov)/.test(n)) return "renovacion";
  if (/\b(modific|ampli|cambio)/.test(n)) return "modificacion";
  if (/\b(inspecc|visita|requerimiento)/.test(n)) return "inspeccion";
  if (/\b(alta|nuev|primera vez|inicio|iniciar)/.test(n)) return "alta";
  return null;
}

/** Ubicación libre: cualquier texto corto sin palabras de otros slots ni de trámite. */
function pareceUbicacion(texto: string): boolean {
  const n = normalizar(texto);
  if (!n || n.length > 60) return false;
  if (detectarDestinoAgua(n) || detectarMotivo(n)) return false;
  if (esConsultaDeTramite(n)) return false;
  return tokenizar(n).length <= 4;
}

function capitalizar(texto: string): string {
  return texto
    .trim()
    .split(/\s+/)
    .map((p) => (p.length > 2 ? p[0].toUpperCase() + p.slice(1) : p))
    .join(" ");
}

// ─── Composición de mensajes ────────────────────────────────────────────────

function pieFicha(f: Ficha): string {
  return `Fuente: ${f.fuente} · Estado: ${f.estado} · Revisión ${f.fechaRevision} · v${f.version}`;
}

function respuestaFicha(f: Ficha): MensajeBot {
  const partes = [`**${f.titulo}**`, f.resumen];
  if (f.requisitos.length) partes.push("Puntos a revisar:\n" + f.requisitos.map((r) => `• ${r}`).join("\n"));
  return {
    texto: partes.join("\n\n"),
    pie: pieFicha(f),
    opciones: f.flujo ? f.preguntasSeguimiento : undefined,
  };
}

const ETIQUETA_DESTINO: Record<DestinoAgua, string> = {
  red: "red de saneamiento",
  cauce: "cauce, terreno o infiltración",
  sin: "sin vertido",
};

const ETIQUETA_MOTIVO: Record<MotivoTramite, string> = {
  alta: "alta nueva",
  renovacion: "renovación",
  modificacion: "modificación",
  inspeccion: "inspección",
};

const OPCIONES_DESTINO = ["Red de saneamiento", "Cauce o terreno", "Sin vertido"];
const OPCIONES_MOTIVO = ["Alta nueva", "Renovación", "Modificación", "Inspección"];

function preguntaUbicacion(): MensajeBot {
  return { texto: "¿En qué provincia o municipio está el centro?" };
}
function preguntaDestino(ubicacion: string): MensajeBot {
  return {
    texto: `Anotado: ${ubicacion}. ¿A dónde van las aguas del centro?`,
    opciones: OPCIONES_DESTINO,
  };
}
function preguntaMotivo(): MensajeBot {
  return { texto: "¿Cuál es el motivo de la consulta?", opciones: OPCIONES_MOTIVO };
}

/** Respuesta final del flujo de vertidos. Contenido general; los detalles los fija la autorización del centro. */
function respuestaVertidos(e: EstadoConversacion, ficha: Ficha): MensajeBot {
  const destino = e.destinoAgua as DestinoAgua;
  const motivo = e.motivo as MotivoTramite;
  const cab = `Caso: ${e.ubicacion} · ${ETIQUETA_DESTINO[destino]} · ${ETIQUETA_MOTIVO[motivo]}.`;

  const lineas: string[] = [];
  if (destino === "red") {
    lineas.push("El centro debe revisar la autorización de vertido industrial aplicable a red de saneamiento.");
    lineas.push(`Comprobar la ordenanza de vertidos y la entidad gestora de saneamiento correspondiente al municipio (${e.ubicacion}).`);
    lineas.push("Verificar vigencia, límites de emisión, analíticas exigidas, arqueta de control y mantenimiento del sistema de tratamiento.");
  } else if (destino === "cauce") {
    lineas.push("El vertido a cauce, terreno o infiltración requiere autorización previa del organismo de cuenca (art. 100 de la Ley de Aguas).");
    lineas.push("Verificar vigencia, límites, programa de control, tratamiento previo y arqueta de control.");
  } else {
    lineas.push("Si no existe vertido, las aguas residuales se gestionan íntegramente como residuo a través de gestor autorizado.");
    lineas.push("Conservar contratos de tratamiento, documentos de traslado y justificantes de retirada.");
  }

  if (motivo === "renovacion") {
    lineas.push("En renovación: iniciar el trámite antes de la caducidad indicada en la autorización y aportar las analíticas del último periodo.");
  } else if (motivo === "alta") {
    lineas.push("En alta nueva: preparar memoria descriptiva del vertido, caracterización de las aguas y descripción del sistema de tratamiento.");
  } else if (motivo === "modificacion") {
    lineas.push("En modificación: comunicar el cambio (caudal, puntos de vertido, tratamiento) y comprobar si exige nueva autorización.");
  } else {
    lineas.push("Ante inspección: tener localizables autorización, analíticas, registros de mantenimiento y justificantes de retirada de residuos.");
  }

  lineas.push("Los requisitos concretos dependen de la autorización individual del centro; contrástalos con el documento vigente.");

  return {
    texto: cab + "\n\n" + lineas.map((l) => `• ${l}`).join("\n"),
    pie: pieFicha(ficha),
  };
}

// ─── Motor principal ────────────────────────────────────────────────────────

function fichaDeFlujo(): Ficha | null {
  return knowledgeBase.find((f) => f.flujo === "vertidos" && f.estado === "Vigente") ?? null;
}

function avanzarFlujoVertidos(e: EstadoConversacion): RespuestaMotor {
  const ficha = fichaDeFlujo();
  if (!ficha) return { estado: estadoInicial, mensajes: [{ texto: MENSAJE_SIN_FICHA }] };

  if (!e.ubicacion) return { estado: e, mensajes: [preguntaUbicacion()] };
  if (!e.destinoAgua) return { estado: e, mensajes: [preguntaDestino(e.ubicacion)] };
  if (!e.motivo) return { estado: e, mensajes: [preguntaMotivo()] };

  // Tras responder, el flujo queda "sugerido": si el usuario cambia el motivo o el destino,
  // se reutilizan los datos ya dados sin repetir preguntas.
  const final: EstadoConversacion = {
    ...e,
    pasosCompletados: [...e.pasosCompletados, "respuesta"],
    flujoActivo: null,
    flujoSugerido: "vertidos",
  };
  return { estado: final, mensajes: [respuestaVertidos(final, ficha)] };
}

function derivarAlTecnico(texto: string): MensajeBot {
  const pendiente = coincideConFichaNoVigente(texto, knowledgeBase);
  const extra = pendiente
    ? ` Existe documentación sobre «${pendiente.titulo}» pendiente de validación por el técnico.`
    : "";
  return { texto: MENSAJE_SIN_FICHA + extra };
}

/**
 * Procesa un mensaje del usuario.
 */
export function procesar(estado: EstadoConversacion, textoUsuario: string): RespuestaMotor {
  const texto = textoUsuario.trim();
  if (!texto) return { estado, mensajes: [] };

  // 1) Flujo de vertidos activo: intentar rellenar el siguiente dato.
  if (estado.flujoActivo === "vertidos") {
    // Cambio de tema claro: si la consulta encaja con otra ficha vigente distinta, se atiende.
    const otra = mejorFichaVigente(texto, knowledgeBase);
    const cambioDeTema = otra && otra.ficha.id !== estado.fichaActiva && otra.puntuacion >= 12;

    if (!cambioDeTema) {
      let e = { ...estado };
      if (!e.ubicacion) {
        if (pareceUbicacion(texto)) {
          e = { ...e, ubicacion: capitalizar(texto), pasosCompletados: [...e.pasosCompletados, "ubicacion"] };
          return avanzarFlujoVertidos(e);
        }
        // El usuario no ha dado ubicación pero puede haber dado otro dato; lo guardamos y repreguntamos.
        const d = detectarDestinoAgua(texto);
        const m = detectarMotivo(texto);
        if (d || m) {
          e = { ...e, destinoAgua: d ?? e.destinoAgua, motivo: m ?? e.motivo };
          return avanzarFlujoVertidos(e);
        }
        return { estado: e, mensajes: [{ texto: "Necesito la provincia o municipio del centro para orientarte." }] };
      }
      if (!e.destinoAgua) {
        const d = detectarDestinoAgua(texto);
        if (d) {
          e = { ...e, destinoAgua: d, pasosCompletados: [...e.pasosCompletados, "destino"] };
          const m = detectarMotivo(texto);
          if (m) e = { ...e, motivo: m, pasosCompletados: [...e.pasosCompletados, "motivo"] };
          return avanzarFlujoVertidos(e);
        }
        return {
          estado: e,
          mensajes: [{ texto: "Indica el destino del agua para continuar.", opciones: OPCIONES_DESTINO }],
        };
      }
      if (!e.motivo) {
        const m = detectarMotivo(texto);
        if (m) {
          e = { ...e, motivo: m, pasosCompletados: [...e.pasosCompletados, "motivo"] };
          return avanzarFlujoVertidos(e);
        }
        return { estado: e, mensajes: [{ texto: "Indica el motivo para continuar.", opciones: OPCIONES_MOTIVO }] };
      }
    }
    // Si hay cambio de tema, cae a la búsqueda general con estado limpio.
    estado = estadoInicial;
  }

  // 2) Flujo sugerido: el usuario acaba de recibir la ficha de vertidos y concreta un motivo o destino.
  if (estado.flujoSugerido === "vertidos") {
    const m = detectarMotivo(texto);
    const d = detectarDestinoAgua(texto);
    if ((m || d) && !mejorFichaVigente(texto, knowledgeBase)) {
      const e: EstadoConversacion = {
        ...estado,
        flujoActivo: "vertidos",
        flujoSugerido: null,
        tema: "Vertidos",
        fichaActiva: fichaDeFlujo()?.id ?? estado.fichaActiva,
        motivo: m ?? estado.motivo,
        destinoAgua: d ?? estado.destinoAgua,
      };
      return avanzarFlujoVertidos(e);
    }
  }

  // 3) Búsqueda general en fichas vigentes.
  const mejor = mejorFichaVigente(texto, knowledgeBase);
  if (!mejor) return { estado: { ...estado, flujoSugerido: null }, mensajes: [derivarAlTecnico(texto)] };

  const f = mejor.ficha;

  // 3a) Ficha con flujo y consulta de trámite → entrar en flujo, aprovechando datos ya dados.
  if (f.flujo === "vertidos" && esConsultaDeTramite(texto)) {
    // Se piden los tres datos en orden (ubicación, destino, motivo) aunque la frase
    // inicial insinúe alguno: así el usuario confirma cada paso.
    const e: EstadoConversacion = {
      ...estadoInicial,
      tema: f.materia,
      fichaActiva: f.id,
      flujoActivo: "vertidos",
      pasosCompletados: ["inicio"],
    };
    return avanzarFlujoVertidos(e);
  }

  // 3b) Respuesta directa con la ficha.
  return {
    estado: {
      ...estadoInicial,
      tema: f.materia,
      fichaActiva: f.id,
      flujoSugerido: f.flujo ?? null,
    },
    mensajes: [respuestaFicha(f)],
  };
}
