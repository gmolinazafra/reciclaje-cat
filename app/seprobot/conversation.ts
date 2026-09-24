/**
 * SeproBot — máquina de estados conversacional.
 *
 * Pipeline por mensaje:
 *   1. Si hay flujo de trámite activo → rellenar el siguiente dato.
 *   2. Si hay aclaración pendiente → resolver con la opción elegida.
 *   3. Clasificar (intención + entidad + acción) con intentClassifier.ts.
 *   4. Si es ambigua → preguntar con botones.
 *   5. Resolver por dominio: app → ficha de aplicación; normativa → ficha legal; tramite → flujo.
 *   6. Sin ficha Vigente → derivar al técnico.
 *
 * Función pura: (estado, texto) → (nuevo estado, mensajes). Nunca asume ubicación.
 */

import { getFichas } from "./kbStore";
import { MENSAJE_SIN_FICHA } from "./knowledgeBase";
import { clasificar } from "./intentClassifier";
import { buscar, normalizar, tokenizar } from "./searchEngine";
import type {
  Accion,
  Clasificacion,
  DestinoAgua,
  Entidad,
  EstadoConversacion,
  Ficha,
  Intencion,
  MensajeBot,
  MotivoTramite,
  RespuestaMotor,
} from "./types";

export const estadoInicial: EstadoConversacion = {
  tema: null,
  aclaracion: null,
  aplicabilidadPendiente: null,
  fichaActiva: null,
  flujoActivo: null,
  flujoSugerido: null,
  ubicacion: null,
  destinoAgua: null,
  motivo: null,
  pasosCompletados: [],
};

/** Saludo según la hora local. */
export function saludoPorHora(fecha: Date = new Date()): string {
  const h = fecha.getHours();
  if (h >= 6 && h < 14) return "Buenos días";
  if (h >= 14 && h < 21) return "Buenas tardes";
  return "Buenas noches";
}

/** Accesos iniciales del chat. Cada texto se envía tal cual y debe resolver a una ficha Vigente. */
export const ACCESOS_INICIALES: { etiqueta: string; texto: string }[] = [
  { etiqueta: "Piezas desde factura", texto: "cómo registro las piezas vendidas" },
  { etiqueta: "Importar Excel de facturación", texto: "cómo importo las ventas desde Excel" },
  { etiqueta: "Subir y revisar documento", texto: "cómo subo y reviso un documento" },
  { etiqueta: "Registrar un DI", texto: "registrar un DI en ReciclaCat_Gest" },
  { etiqueta: "Situación anual", texto: "cómo consulto la situación anual" },
  { etiqueta: "Funcionamiento de la app", texto: "cómo funciona la aplicación" },
];

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

// ─── Selección de fichas por dominio ────────────────────────────────────────

const vigentes = (): Ficha[] => getFichas().filter((f) => f.estado === "Vigente");

function puntuarFrases(f: Ficha, texto: string): number {
  const q = new Set(tokenizar(texto));
  let mejor = 0;
  for (const fr of f.frasesEjemplo) {
    const t = tokenizar(fr);
    if (!t.length) continue;
    const comunes = t.filter((x) => q.has(x)).length;
    mejor = Math.max(mejor, comunes / t.length);
  }
  return mejor;
}

/** Ficha de aplicación: entidad + acción deciden; frases de ejemplo desempatan. */
function fichaApp(c: Clasificacion, texto: string): Ficha | null {
  const cand = vigentes().filter((f) => f.dominio === "app");
  const conEntidad = cand.filter((f) => f.entidades.includes(c.entidad));
  const conAccion = conEntidad.filter((f) => !f.acciones.length || f.acciones.includes(c.accion));
  const pool = conAccion.length ? conAccion : conEntidad.length ? conEntidad : cand;
  if (!pool.length) return null;
  // Desempate: frases de ejemplo, luego sinónimos/etiquetas (searchEngine), luego primera.
  const ordenado = pool
    .map((f) => ({ f, s: puntuarFrases(f, texto) * 100 + (buscar(texto, [f])[0]?.puntuacion ?? 0) }))
    .sort((a, b) => b.s - a.s);
  const top = ordenado[0];
  if (!conEntidad.length && top.s === 0) return null;
  return top.f;
}

/** Ficha normativa: entidad primero; si no hay, búsqueda por sinónimos. */
function fichaNormativa(c: Clasificacion, texto: string): Ficha | null {
  const cand = vigentes().filter((f) => f.dominio === "normativa");
  const conEntidad = cand.filter((f) => f.entidades.includes(c.entidad));
  if (conEntidad.length === 1) return conEntidad[0];
  if (conEntidad.length > 1) return buscar(texto, conEntidad)[0]?.ficha ?? conEntidad[0];
  // Entidad reconocida pero sin ficha vigente: no se responde con otra norma "parecida".
  if (c.entidad !== "desconocida") return null;
  return buscar(texto, cand)[0]?.ficha ?? null;
}

function fichaTramite(entidad: Entidad): Ficha | null {
  return vigentes().find((f) => f.dominio === "tramite" && f.entidades.includes(entidad)) ?? null;
}

// ─── Composición ────────────────────────────────────────────────────────────

function pieFicha(f: Ficha): string {
  return `Fuente: ${f.fuente} · Estado: ${f.estado} · Revisión ${f.fechaRevision} · v${f.version}`;
}

function respuestaApp(f: Ficha): MensajeBot {
  return {
    texto: `**${f.titulo}**\n\n${f.respuesta || f.resumen}`,
    pasos: f.pasos,
    pie: `Ayuda de ReciclaCat_Gest · v${f.version}`,
  };
}

function respuestaNormativa(f: Ficha): MensajeBot {
  const partes = [`**${f.titulo}**`, f.resumen];
  if (f.requisitos.length) partes.push("Puntos a revisar:\n" + f.requisitos.map((r) => `• ${r}`).join("\n"));
  return { texto: partes.join("\n\n"), pie: pieFicha(f) };
}

function derivarAlTecnico(texto: string): MensajeBot {
  const pendiente = buscar(texto, getFichas(), { estados: ["En revisión"] })[0]?.ficha;
  const extra = pendiente ? ` Existe documentación sobre «${pendiente.titulo}» pendiente de validación.` : "";
  return { texto: MENSAJE_SIN_FICHA + extra };
}

const ETIQUETA_ENTIDAD: Partial<Record<Entidad, string>> = {
  DI: "un DI", residuo: "un residuo", baja: "una baja", vehiculo: "un vehículo", traslado: "un traslado",
};

function preguntaAclaracion(c: Clasificacion): { estado: Partial<EstadoConversacion>; mensaje: MensajeBot } {
  const nombre = ETIQUETA_ENTIDAD[c.entidad] ?? "esto";
  const opciones = [
    { etiqueta: `Registrar ${nombre} en ReciclaCat_Gest`, intencion: "uso_app" as Intencion },
    { etiqueta: `Consultar normativa de ${nombre.replace(/^(un|una) /, "")}`, intencion: "normativa" as Intencion },
  ];
  return {
    estado: { aclaracion: { entidad: c.entidad, accion: c.accion, opciones } },
    mensaje: {
      texto: `¿Te refieres a registrar ${nombre} en ReciclaCat_Gest o a consultar la normativa de ${nombre.replace(/^(un|una) /, "")}?`,
      opciones: opciones.map((o) => o.etiqueta),
    },
  };
}

// ─── Aplicabilidad (razonamiento determinista) ──────────────────────────────

const PROVINCIAS_ANDALUCIA = ["almeria", "cadiz", "cordoba", "granada", "huelva", "jaen", "malaga", "sevilla", "andalucia"];
const MUNICIPIOS_ANDALUCIA = ["marbella", "jerez", "algeciras", "dos hermanas", "roquetas", "el ejido", "mijas", "fuengirola", "torremolinos", "velez", "estepona", "motril", "linares", "utrera", "alcala de guadaira", "chiclana", "san fernando", "el puerto", "sanlucar", "cartama", "alhaurin", "antequera", "ronda", "lucena", "andujar", "ubeda"];

function ambitoDe(f: Ficha): "andalucia" | "espana" | "ue" | "municipal" | "otro" {
  const a = normalizar(f.ambitoTerritorial);
  if (a.includes("andalucia")) return "andalucia";
  if (a.includes("municipal")) return "municipal";
  if (a.includes("union europea") || a === "ue") return "ue";
  if (a.includes("españa") || a.includes("espana") || a.includes("estado")) return "espana";
  return "otro";
}

/** Extrae una provincia/municipio conocido citado en el texto ("en Sevilla", "centro de Cádiz"). */
export function extraerUbicacion(texto: string): string | null {
  const n = normalizar(texto);
  const conocidas = [...PROVINCIAS_ANDALUCIA.filter((p) => p !== "andalucia"), ...MUNICIPIOS_ANDALUCIA, "madrid", "barcelona", "valencia", "murcia", "badajoz", "caceres", "toledo", "bilbao", "zaragoza", "alicante", "castellon", "ceuta", "melilla", "valladolid", "salamanca", "leon", "burgos", "santander", "oviedo", "gijon", "vigo", "a coruna", "pamplona", "logrono", "palma", "las palmas", "tenerife"];
  const hit = conocidas.sort((a, b) => b.length - a.length).find((c) => new RegExp(`\\b${c}\\b`).test(n));
  return hit ? capitalizar(hit) : null;
}

function estaEnAndalucia(ubicacion: string): boolean | null {
  const u = normalizar(ubicacion);
  if (PROVINCIAS_ANDALUCIA.some((p) => u.includes(p)) || MUNICIPIOS_ANDALUCIA.some((m) => u.includes(m))) return true;
  // Comunidades / capitales claramente fuera.
  const fuera = ["madrid", "barcelona", "valencia", "murcia", "extremadura", "badajoz", "caceres", "castilla", "toledo", "galicia", "asturias", "cantabria", "pais vasco", "euskadi", "bilbao", "navarra", "aragon", "zaragoza", "cataluna", "catalunya", "baleares", "canarias", "rioja", "leon", "burgos", "salamanca", "valladolid", "alicante", "castellon", "ceuta", "melilla", "portugal"];
  if (fuera.some((f) => u.includes(f))) return false;
  return null; // no se puede determinar
}

/** ¿Necesita ubicación para decidir? Solo las normas autonómicas o municipales. */
function necesitaUbicacion(f: Ficha): boolean {
  const a = ambitoDe(f);
  return a === "andalucia" || a === "municipal";
}

function respuestaAplicabilidad(f: Ficha, ubicacion: string | null): MensajeBot {
  const ambito = ambitoDe(f);
  const lineas: string[] = [];
  let veredicto = "";

  // 1) Razonamiento territorial.
  if (ambito === "andalucia") {
    const en = ubicacion ? estaEnAndalucia(ubicacion) : null;
    if (en === false) {
      veredicto = `No aplica directamente: es una norma de ámbito andaluz y el centro está en ${ubicacion}, fuera de Andalucía. En su comunidad rige la norma autonómica equivalente.`;
      return { texto: `**¿Aplica la ${f.titulo}?**\n\n${veredicto}`, pie: pieFicha(f) };
    }
    lineas.push(`Es una norma de ámbito **andaluz** y el centro está en ${ubicacion}, dentro de Andalucía.`);
  } else if (ambito === "espana") {
    lineas.push("Es una norma **estatal**: aplica en todo el territorio español, con independencia de la comunidad autónoma.");
  } else if (ambito === "ue") {
    lineas.push("Es un **reglamento europeo** de aplicación directa en España, sin necesidad de transposición.");
  } else if (ambito === "municipal") {
    lineas.push(`Es normativa **municipal**: depende de la ordenanza del municipio del centro${ubicacion ? ` (${ubicacion})` : ""}.`);
  }

  // 2) Razonamiento por actividad (ficha).
  const ap = f.aplicabilidad;
  if (ap) {
    if (ap.aplica === "si") veredicto = "**Sí, aplica a tu centro.** " + ap.porque;
    else if (ap.aplica === "depende") veredicto = "**Depende.** " + ap.porque;
    else veredicto = "**No aplica a un CAT.** " + ap.porque;
    if (ap.condiciones?.length) lineas.push("Comprueba en tu centro:\n" + ap.condiciones.map((c) => `• ${c}`).join("\n"));
  } else {
    veredicto = `**Está dentro de su ámbito.** La ficha validada no detalla condiciones de aplicación a CAT; el técnico debe completarlas. Mientras tanto, revisa en la fuente si tu actividad está en su ámbito de aplicación.`;
  }

  return { texto: `**¿Aplica la ${f.titulo}?**\n\n${veredicto}\n\n${lineas.join("\n\n")}`, pie: pieFicha(f) };
}

// ─── Flujo de vertidos ──────────────────────────────────────────────────────

function avanzarFlujoVertidos(e: EstadoConversacion): RespuestaMotor {
  const ficha = fichaTramite("vertido");
  if (!ficha) return { estado: estadoInicial, mensajes: [{ texto: MENSAJE_SIN_FICHA }] };
  if (!e.ubicacion) return { estado: e, mensajes: [preguntaUbicacion()] };
  if (!e.destinoAgua) return { estado: e, mensajes: [preguntaDestino(e.ubicacion)] };
  if (!e.motivo) return { estado: e, mensajes: [preguntaMotivo()] };
  const final: EstadoConversacion = {
    ...e,
    pasosCompletados: [...e.pasosCompletados, "respuesta"],
    flujoActivo: null,
    flujoSugerido: "vertidos",
  };
  return { estado: final, mensajes: [respuestaVertidos(final, ficha)] };
}

function iniciarFlujoVertidos(base: EstadoConversacion, motivo: MotivoTramite | null, destino: DestinoAgua | null): RespuestaMotor {
  const f = fichaTramite("vertido");
  if (!f) return { estado: estadoInicial, mensajes: [{ texto: MENSAJE_SIN_FICHA }] };
  return avanzarFlujoVertidos({
    ...base,
    tema: "Vertidos",
    fichaActiva: f.id,
    flujoActivo: "vertidos",
    flujoSugerido: null,
    aclaracion: null,
    motivo: motivo ?? base.motivo,
    destinoAgua: destino ?? base.destinoAgua,
    pasosCompletados: [...base.pasosCompletados, "inicio"],
  });
}

function continuarFlujoVertidos(estado: EstadoConversacion, texto: string): RespuestaMotor | null {
  let e = { ...estado };
  if (!e.ubicacion) {
    if (pareceUbicacion(texto)) {
      e = { ...e, ubicacion: capitalizar(texto), pasosCompletados: [...e.pasosCompletados, "ubicacion"] };
      return avanzarFlujoVertidos(e);
    }
    const d = detectarDestinoAgua(texto);
    const m = detectarMotivo(texto);
    if (d || m) return avanzarFlujoVertidos({ ...e, destinoAgua: d ?? e.destinoAgua, motivo: m ?? e.motivo });
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
    return { estado: e, mensajes: [{ texto: "Indica el destino del agua para continuar.", opciones: OPCIONES_DESTINO }] };
  }
  if (!e.motivo) {
    const m = detectarMotivo(texto);
    if (m) return avanzarFlujoVertidos({ ...e, motivo: m, pasosCompletados: [...e.pasosCompletados, "motivo"] });
    return { estado: e, mensajes: [{ texto: "Indica el motivo para continuar.", opciones: OPCIONES_MOTIVO }] };
  }
  return null;
}

// ─── Resolución por intención ───────────────────────────────────────────────

function resolver(estado: EstadoConversacion, c: Clasificacion, texto: string): RespuestaMotor {
  const limpio: EstadoConversacion = { ...estadoInicial, ubicacion: estado.ubicacion };

  if (c.intencion === "uso_app") {
    const f = fichaApp(c, texto);
    if (f) return { estado: { ...limpio, tema: f.materia, fichaActiva: f.id }, mensajes: [respuestaApp(f)] };
    return { estado: limpio, mensajes: [derivarAlTecnico(texto)] };
  }

  if (c.intencion === "tramite") {
    if (c.entidad === "vertido") return iniciarFlujoVertidos({ ...estadoInicial, ubicacion: extraerUbicacion(texto) }, null, null);
    return { estado: limpio, mensajes: [derivarAlTecnico(texto)] };
  }

  if (c.intencion === "normativa") {
    const f = fichaNormativa(c, texto) ?? (c.entidad === "vertido" ? fichaTramite("vertido") : null);
    // "¿Qué me aplica en Sevilla sobre vertidos?" → el flujo guiado (ubicación, destino, motivo) decide qué aplica.
    if (f && c.accion === "aplicar" && c.entidad === "vertido") {
      const ubic = extraerUbicacion(texto);
      return iniciarFlujoVertidos({ ...estadoInicial, ubicacion: ubic }, detectarMotivo(texto), detectarDestinoAgua(texto));
    }
    if (f && c.accion === "aplicar") {
      const ubicTexto = extraerUbicacion(texto);
      if (ubicTexto) return { estado: { ...limpio, ubicacion: ubicTexto, tema: f.materia, fichaActiva: f.id }, mensajes: [respuestaAplicabilidad(f, ubicTexto)] };
      if (necesitaUbicacion(f) && !estado.ubicacion) {
        return {
          estado: { ...limpio, tema: f.materia, fichaActiva: f.id, aplicabilidadPendiente: f.id },
          mensajes: [{ texto: `Para saber si te aplica necesito un dato: ¿en qué provincia o municipio está el centro?` }],
        };
      }
      return { estado: { ...limpio, tema: f.materia, fichaActiva: f.id }, mensajes: [respuestaAplicabilidad(f, estado.ubicacion)] };
    }
    if (f && f.dominio === "normativa") return { estado: { ...limpio, tema: f.materia, fichaActiva: f.id }, mensajes: [respuestaNormativa(f)] };
    // Pregunta general sobre vertidos: ficha de trámite en modo explicación.
    if (c.entidad === "vertido") {
      const t = fichaTramite("vertido");
      if (t) {
        return {
          estado: { ...limpio, tema: t.materia, fichaActiva: t.id, flujoSugerido: "vertidos" },
          mensajes: [{ ...respuestaNormativa(t), opciones: t.preguntasSeguimiento }],
        };
      }
    }
    return { estado: limpio, mensajes: [derivarAlTecnico(texto)] };
  }

  // desconocida: último intento por sinónimos en cualquier dominio vigente (sin fichas legales
  // si la entidad es exclusiva de la app).
  const f = buscar(texto, vigentes())[0]?.ficha ?? null;
  if (f) {
    const msg = f.dominio === "app" ? respuestaApp(f) : f.dominio === "tramite" ? { ...respuestaNormativa(f), opciones: f.preguntasSeguimiento } : respuestaNormativa(f);
    return { estado: { ...limpio, tema: f.materia, fichaActiva: f.id, flujoSugerido: f.flujo ?? null }, mensajes: [msg] };
  }
  return { estado: limpio, mensajes: [derivarAlTecnico(texto)] };
}

// ─── Motor principal ────────────────────────────────────────────────────────

export function procesar(estado: EstadoConversacion, textoUsuario: string): RespuestaMotor {
  const texto = textoUsuario.trim();
  if (!texto) return { estado, mensajes: [] };
  const c = clasificar(texto);

  // 1) Flujo de trámite activo.
  if (estado.flujoActivo === "vertidos") {
    const cambioDeTema = c.intencion !== "desconocida" && c.entidad !== "vertido" && c.entidad !== "desconocida";
    if (!cambioDeTema) {
      const r = continuarFlujoVertidos(estado, texto);
      if (r) return r;
    }
  }

  // 1b) Aplicabilidad pendiente de ubicación.
  if (estado.aplicabilidadPendiente) {
    const f = vigentes().find((x) => x.id === estado.aplicabilidadPendiente);
    if (f && pareceUbicacion(texto)) {
      const ubic = capitalizar(texto);
      return { estado: { ...estado, ubicacion: ubic, aplicabilidadPendiente: null }, mensajes: [respuestaAplicabilidad(f, ubic)] };
    }
    estado = { ...estado, aplicabilidadPendiente: null };
  }

  // 2) Aclaración pendiente: el usuario pulsa un botón o escribe algo equivalente.
  if (estado.aclaracion) {
    const n = normalizar(texto);
    const elegida = estado.aclaracion.opciones.find((o) => normalizar(o.etiqueta) === n)
      ?? (c.marcadorApp ? estado.aclaracion.opciones.find((o) => o.intencion === "uso_app") : null)
      ?? (c.marcadorNormativa ? estado.aclaracion.opciones.find((o) => o.intencion === "normativa") : null);
    if (elegida) {
      const cc: Clasificacion = { ...c, intencion: elegida.intencion, entidad: estado.aclaracion.entidad, accion: estado.aclaracion.accion, ambigua: false };
      return resolver({ ...estado, aclaracion: null }, cc, texto);
    }
    // Si escribe otra cosa, se descarta la aclaración y se procesa normalmente.
    estado = { ...estado, aclaracion: null };
  }

  // 3) Flujo sugerido: tras la ficha de vertidos, el usuario concreta motivo/destino.
  if (estado.flujoSugerido === "vertidos") {
    const m = detectarMotivo(texto);
    const d = detectarDestinoAgua(texto);
    if ((m || d) && (c.entidad === "vertido" || c.entidad === "desconocida" || c.intencion === "tramite")) {
      return iniciarFlujoVertidos(estado, m, d);
    }
  }

  // 4) Ambigüedad real → preguntar.
  if (c.ambigua) {
    const { estado: parcial, mensaje } = preguntaAclaracion(c);
    return { estado: { ...estadoInicial, ...parcial }, mensajes: [mensaje] };
  }

  // 5) Resolver.
  return resolver(estado, c, texto);
}
