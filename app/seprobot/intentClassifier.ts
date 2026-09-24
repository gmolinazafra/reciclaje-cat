/**
 * SeproBot — clasificador de intención (determinista).
 *
 * Cada mensaje se clasifica en intención + entidad + acción antes de buscar fichas.
 * Reglas, no ranking de palabras: una acción de programa ("cómo registro", "cómo subo")
 * fuerza la intención uso_app; un marcador legal ("qué dice", "normativa", "ley") fuerza
 * normativa; si la entidad existe en ambos dominios y no hay marcador, se pide aclaración.
 */

import { normalizar } from "./searchEngine";
import type { Accion, Clasificacion, Entidad, Intencion } from "./types";

// ─── Léxico ─────────────────────────────────────────────────────────────────

/** Verbos/expresiones de programa: si aparecen, la consulta es de uso de la aplicación. */
const ACCIONES_APP: [Accion, RegExp][] = [
  ["registrar", /\b(registro|registrar|registrando|apunto|apuntar|anoto|anotar|meto|meter|doy de alta|dar de alta|damos de alta|alta de|añado|anado|añadir|anadir|guardo|guardar|vendo|vender|creo|crear)\b/],
  ["importar", /\b(importo|importar|importacion|cargo|cargar|carga de)\b/],
  ["subir", /\b(subo|subir|subida|adjunto|adjuntar|escaneo|escanear|hago una foto|saco una foto)\b/],
  ["corregir", /\b(corrijo|corregir|arreglo|arreglar|rectifico|rectificar|edito|editar|me he equivocado|esta mal|leido mal|lee mal)\b/],
  ["eliminar", /\b(elimino|eliminar|borro|borrar|quito|quitar)\b/],
  ["generar", /\b(genero|generar|saco|sacar|exporto|exportar|descargo|descargar|imprimo|imprimir)\b/],
  ["revisar", /\b(reviso|revisar|compruebo|comprobar|verifico|verificar)\b/],
];

/** Acciones de trámite administrativo. */
const ACCIONES_TRAMITE: [Accion, RegExp][] = [
  ["renovar", /\b(renov\w*|caduc\w*|venc\w*|prorrog\w*)\b/],
  ["modificar", /\b(modific\w*|ampli\w*|cambio de|cambiar)\b/],
  ["revisar", /\b(inspecc\w*|visita de|requerimiento)\b/],
  ["registrar", /\b(alta nueva|nueva autorizacion|solicit\w*|tramit\w*|presentar|inicio de actividad|alta de actividad)\b/],
];

/** Acciones de consulta (neutras). */
const ACCIONES_CONSULTA: [Accion, RegExp][] = [
  ["consultar", /\b(consulto|consultar|veo|ver|miro|mirar|donde esta|donde veo|como va)\b/],
  ["explicar", /\b(que es|que son|que dice|que significa|en que consiste|explica\w*|resumen de|cuales son|cual es)\b/],
];

/** Pregunta de aplicabilidad: "¿me aplica…?", "¿estoy obligado…?", "¿tengo que cumplir…?". */
const PREGUNTA_APLICA = /\b(que me aplica|que nos aplica|que aplica|que normativa me aplica|me aplica|nos aplica|le aplica|aplica a mi|es aplicable|estoy obligad\w*|estamos obligad\w*|tengo que cumplir|debo cumplir|tenemos que cumplir|me afecta|nos afecta|afecta a mi|es obligatori\w* para|tengo que tener|necesito tener|me obliga|nos obliga)\b/;

/** Marcadores explícitos de dominio. */
const MARCADOR_APP = /\b(reciclacat|reciclacat_gest|reciclacatgest|la aplicacion|la app|el programa|en el programa|en la app|pestaña|pestana|boton|pantalla|formulario|ocr)\b/;
const MARCADOR_NORMATIVA = /\b(normativa|norma|ley|leyes|real decreto|rd \d|decreto|reglamento|directiva|orden|boe|boja|obligacion\w*|plazo\w*|requisito\w*|legal\w*|juridic\w*|que dice|que es|que son|sancion\w*|multa\w*)\b/;

/** Entidades: patrón → entidad. El orden importa (más específico primero). */
const ENTIDADES: [Entidad, RegExp][] = [
  ["aplicacion", /\b(como funciona|funcionamiento|que puedo hacer|para que sirve|como se usa|como se maneja|que hace)\b.*\b(app|aplicacion|programa|reciclacat\w*)\b|\b(app|aplicacion|programa|reciclacat\w*)\b.*\b(funciona|funcionamiento|que puedo hacer|para que sirve|como se usa)\b/],
  ["excel_ventas", /\b(excel|csv|hoja de calculo|listado)\b.*\b(venta\w*|pieza\w*)\b|\b(venta\w*|pieza\w*)\b.*\b(excel|csv|hoja de calculo)\b/],
  ["piezas_vendidas", /\b(pieza\w*|recambio\w*|repuesto\w*)\b.*\b(vend\w*|venta\w*)\b|\b(vend\w*|venta\w*)\b.*\b(pieza\w*|recambio\w*|repuesto\w*)\b|\bventa\w*\b|\bpieza\w*\b/],
  ["foto_baja", /\b(foto|imagen|pdf)\b.*\b(baja|destruccion)\b|\b(baja|destruccion)\b.*\b(foto|imagen)\b/],
  ["DI", /\b(di|dis|d\.i\.|documento de identificacion|documentos de identificacion|npt|nt|notificacion previa)\b/],
  ["ocr", /\bocr\b/],
  ["situacion_anual", /\b(situacion (anual|del año|del ano|del ejercicio)|resumen (anual|del año|del ano)|como va el (año|ano|ejercicio)|pendientes del (año|ano))\b/],
  ["informe", /\b(informe\w*|memoria\w*|reporte\w*)\b/],
  ["vertido", /\b(vertido\w*|verter|aguas residuales|saneamiento|arqueta)\b/],
  ["aguas", /\b(ley de aguas|dominio publico hidraulico|cauce|confederacion)\b/],
  ["GICA", /\b(gica|calidad ambiental|7\/2007|aau|aaus|calificacion ambiental)\b/],
  ["VFU", /\b(vfu|fin de (su )?vida util|265\/2021|2026\/1738|elv)\b/],
  ["baja", /\b(baja\w*|certificado de destruccion|destruccion)\b/],
  ["vehiculo", /\b(vehiculo\w*|coche\w*|moto\w*|furgon\w*|camion\w*|matricula|bastidor)\b/],
  ["traslado", /\b(traslado\w*|553\/2020|esir)\b/],
  ["neumaticos", /\b(neumatico\w*|nfu|712\/2025)\b/],
  ["baterias", /\b(bateria\w*|pila\w*|2023\/1542)\b/],
  ["garantias", /\b(garantia\w* financiera\w*|fianza\w*|208\/2022)\b/],
  ["LER", /\b(ler|lista europea|mam\/304)\b/],
  ["economia_circular", /\b(economia circular|3\/2023|7\/2022)\b/],
  ["PIREC", /\b(pirec|plan integral de residuos)\b/],
  ["residuo", /\b(residuo\w*|aceite\w*|chatarra|gestor\w*)\b/],
  ["documento", /\b(documento\w*|archivo\w*|excel|csv|pdf|foto\w*|imagen\w*|fichero\w*)\b/],
];

/** Entidades que existen tanto en el dominio app como en normativa: sin marcador, se pregunta. */
const ENTIDADES_AMBIGUAS = new Set<Entidad>(["DI", "residuo", "baja", "vehiculo", "traslado"]);

/** Entidades exclusivas de la aplicación (nunca se responden con normativa). */
const ENTIDADES_SOLO_APP = new Set<Entidad>(["aplicacion", "piezas_vendidas", "excel_ventas", "foto_baja", "ocr", "situacion_anual", "informe", "documento"]);

// ─── Clasificación ──────────────────────────────────────────────────────────

function detectar<T>(tabla: [T, RegExp][], n: string): T | null {
  for (const [v, re] of tabla) if (re.test(n)) return v;
  return null;
}

export function detectarEntidad(texto: string): Entidad {
  const n = normalizar(texto);
  return detectar(ENTIDADES, n) ?? "desconocida";
}

export function clasificar(texto: string): Clasificacion {
  const n = normalizar(texto);
  const marcadorApp = MARCADOR_APP.test(n);
  const marcadorNormativa = MARCADOR_NORMATIVA.test(n);
  const entidad = detectarEntidad(texto);

  const accionApp = detectar(ACCIONES_APP, n);
  const accionTramite = detectar(ACCIONES_TRAMITE, n);
  const accionConsulta = detectar(ACCIONES_CONSULTA, n);

  let intencion: Intencion = "desconocida";
  let accion: Accion = accionApp ?? accionTramite ?? accionConsulta ?? "ninguna";
  let ambigua = false;

  // 0) Pregunta de aplicabilidad sobre una norma → normativa / aplicar.
  if (PREGUNTA_APLICA.test(n) && !ENTIDADES_SOLO_APP.has(entidad)) {
    return { intencion: "normativa", entidad, accion: "aplicar", ambigua: false, marcadorApp, marcadorNormativa: true };
  }

  // 1) Marcador explícito de aplicación → uso_app.
  if (marcadorApp) {
    intencion = "uso_app";
    accion = accionApp ?? accionConsulta ?? "consultar";
  }
  // 2) Entidad exclusiva de la app → uso_app (aunque no haya verbo).
  else if (ENTIDADES_SOLO_APP.has(entidad) && !marcadorNormativa) {
    intencion = "uso_app";
    accion = accionApp ?? accionConsulta ?? "consultar";
  }
  // 3) Trámite: entidad de trámite + acción de trámite, sin pregunta de definición.
  else if (entidad === "vertido" && accionTramite && !/\b(que es|que son|en que consiste)\b/.test(n)) {
    intencion = "tramite";
    accion = accionTramite;
  }
  // 4) Acción de programa presente.
  else if (accionApp) {
    if (marcadorNormativa && !/\b(alta de|dar de alta|doy de alta)\b/.test(n)) {
      intencion = "normativa";
      accion = "explicar";
    } else if (ENTIDADES_AMBIGUAS.has(entidad) && !marcadorNormativa && /\b(doy de alta|dar de alta|damos de alta|alta de)\b/.test(n)) {
      // "cómo doy de alta un DI": "dar de alta" puede ser un alta en la app o un alta administrativa → aclarar.
      // Verbos claramente de programa ("cómo registro", "cómo subo", "dónde meto") no se aclaran.
      intencion = "desconocida";
      ambigua = true;
      accion = accionApp;
    } else if (ENTIDADES_AMBIGUAS.has(entidad) && marcadorNormativa) {
      intencion = "normativa";
      accion = "explicar";
    } else {
      intencion = "uso_app";
      accion = accionApp;
    }
  }
  // 5) Marcador de normativa o pregunta de definición → normativa.
  else if (marcadorNormativa || accionConsulta === "explicar") {
    intencion = "normativa";
    accion = "explicar";
  }
  // 6) Consulta neutra sobre entidad de app → uso_app; sobre entidad legal → normativa.
  else if (entidad !== "desconocida") {
    intencion = "normativa";
    accion = accionConsulta ?? "consultar";
  }

  return { intencion, entidad, accion, ambigua, marcadorApp, marcadorNormativa };
}
