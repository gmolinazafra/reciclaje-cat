/**
 * SeproBot — base de conocimiento.
 *
 * Única fuente de respuestas del bot. El técnico de la asociación mantiene este
 * archivo: añade fichas, valida (estado "Vigente") o marca "En revisión"/"Obsoleta".
 *
 * REGLAS:
 * - El bot SOLO responde con fichas en estado "Vigente".
 * - "En revisión" y "Obsoleta" nunca se usan como fuente de respuesta.
 * - No incluir municipios ni provincias concretas en fichas generales.
 * - No inventar contenido legal: si no está en la fuente, no va en la ficha.
 */

import type { Ficha } from "./types";

export const MENSAJE_SIN_FICHA =
  "No tengo una ficha validada para esta consulta. La he derivado al técnico para su revisión.";

export const knowledgeBase: Ficha[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // FICHAS VALIDADAS (Vigente)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "vertidos-consultas-generales",
    titulo: "Consultas generales sobre autorización de vertidos",
    tipoDocumento: "Ficha técnica",
    ambitoTerritorial: "España",
    materia: "Vertidos",
    etiquetas: ["vertidos", "autorización de vertido", "aguas residuales", "saneamiento", "cauce", "arqueta"],
    sinonimos: [
      "vertido",
      "vertidos",
      "autorizacion de vertido",
      "autorizacion vertido",
      "permiso de vertido",
      "aguas residuales",
      "agua residual",
      "vertido industrial",
      "vertido a red",
      "vertido a cauce",
      "renovar vertido",
      "renovacion de vertido",
    ],
    resumen:
      "Todo CAT genera aguas residuales (lavado, pluviales contaminadas, zonas de descontaminación) que requieren una autorización de vertido. El régimen aplicable depende del destino del agua: a red de saneamiento la otorga la entidad gestora o el ayuntamiento conforme a su ordenanza; a cauce, terreno o infiltración la otorga el organismo de cuenca conforme a la Ley de Aguas. Los requisitos concretos (límites, analíticas, frecuencia, arqueta, tratamiento) los fija la autorización individual de cada centro.",
    requisitos: [
      "Identificar el destino del agua: red de saneamiento, cauce/terreno/infiltración, o sin vertido (gestión íntegra como residuo).",
      "Localizar la autorización de vertido vigente del centro y su fecha de caducidad.",
      "Comprobar límites de emisión, parámetros y frecuencia de analíticas exigidos.",
      "Mantener operativa la arqueta de control de vertido y el sistema de tratamiento (separador de hidrocarburos, decantador).",
      "Conservar registros de mantenimiento, retirada de lodos y analíticas.",
    ],
    estado: "Vigente",
    fechaRevision: "2026-09-23",
    fuente: "Ficha técnica de la asociación (elaboración propia a partir de RDL 1/2001 y ordenanzas municipales de vertido).",
    version: "1.0",
    preguntasSeguimiento: ["Alta nueva", "Renovación", "Modificación", "Inspección"],
    flujo: "vertidos",
  },
  {
    id: "ayuda-subir-documentos",
    titulo: "Cómo subir un documento (Excel, CSV, PDF, imagen o foto)",
    tipoDocumento: "Ayuda de la aplicación",
    ambitoTerritorial: "Aplicación",
    materia: "Uso de la aplicación",
    etiquetas: ["subir", "cargar", "importar", "documento", "excel", "csv", "pdf", "foto", "imagen", "piezas", "inventario"],
    sinonimos: [
      "subir excel",
      "subir un excel",
      "cargar excel",
      "importar excel",
      "subir csv",
      "importar csv",
      "subir pdf",
      "subir foto",
      "subir imagen",
      "añadir documento",
      "anadir documento",
      "adjuntar documento",
      "excel de piezas",
      "importar piezas",
      "cargar piezas",
      "subir inventario",
    ],
    resumen:
      "Para subir un archivo al centro: 1) Entra en la pestaña «Documentos». 2) Pulsa «+ Documento». 3) Selecciona el archivo (Excel .xlsx/.xls, CSV, PDF, imagen o haz una foto desde el móvil). 4) Revisa los datos detectados antes de confirmar. 5) Pulsa «Guardar». El documento queda asociado al ejercicio en curso y disponible para vehículos, piezas, residuos e informes.",
    requisitos: [
      "Formatos admitidos: .xlsx, .xls, .csv, .pdf, .jpg, .png o foto directa.",
      "En archivos de piezas, la primera fila debe contener los encabezados (referencia, descripción, cantidad, precio).",
      "Revisar la vista previa antes de guardar: los datos incorrectos pueden corregirse en ese paso.",
    ],
    estado: "Vigente",
    fechaRevision: "2026-09-23",
    fuente: "Manual de usuario ReciclaCat_Gest.",
    version: "1.0",
  },

  {
    id: "ley-7-2007-gica",
    titulo: "Ley 7/2007, de 9 de julio, de Gestión Integrada de la Calidad Ambiental de Andalucía (GICA)",
    tipoDocumento: "Ley",
    ambitoTerritorial: "Andalucía",
    materia: "Normativa ambiental",
    etiquetas: ["GICA", "calidad ambiental", "AAU", "AAUS", "AAI", "calificación ambiental", "prevención ambiental"],
    sinonimos: [
      "gica",
      "ley gica",
      "ley 7/2007",
      "ley 7 2007",
      "calidad ambiental andalucia",
      "gestion integrada de la calidad ambiental",
      "autorizacion ambiental andalucia",
      "autorizacion ambiental unificada",
      "aau",
      "aaus",
      "aai",
      "calificacion ambiental",
    ],
    resumen:
      "La Ley 7/2007 (GICA) es la norma marco de Andalucía en materia ambiental. Regula los instrumentos de prevención y control ambiental de las actividades: según la actividad y el expediente puede intervenir la Autorización Ambiental Integrada (AAI), la Autorización Ambiental Unificada (AAU), la AAU simplificada (AAUS), la Calificación Ambiental (CA) u otro instrumento aplicable. También regula la calidad del aire, aguas, suelos, residuos y el régimen sancionador. Los CAT quedan sometidos, con carácter general, a los instrumentos de prevención ambiental previstos en su Anexo I según su capacidad y ubicación.",
    requisitos: [
      "Identificar en el Anexo I de la ley el instrumento de prevención ambiental que corresponde a la actividad del centro.",
      "Conservar la resolución ambiental vigente del centro (AAU, AAUS o CA) y sus condicionados.",
      "Comunicar modificaciones sustanciales de la actividad al órgano ambiental competente.",
    ],
    estado: "Vigente",
    fechaRevision: "2026-09-23",
    fuente: "BOJA núm. 143, de 20/07/2007. BOE núm. 190, de 09/08/2007. Texto consolidado en BOE.",
    version: "1.0",
    notasTecnico:
      "Validada provisionalmente para el caso de prueba «¿Qué es la Ley GICA?». El técnico debe confirmar contra el texto consolidado y modificaciones posteriores (Ley 3/2023, Decreto-ley 2/2020).",
  },
  // ─────────────────────────────────────────────────────────────────────────
  // FICHAS PENDIENTES DE VALIDACIÓN (En revisión) — NO se usan para responder
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "ley-3-2023-economia-circular",
    titulo: "Ley 3/2023, de 30 de marzo, de Economía Circular de Andalucía",
    tipoDocumento: "Ley",
    ambitoTerritorial: "Andalucía",
    materia: "Residuos",
    etiquetas: ["economía circular", "residuos", "Andalucía", "subproducto", "fin de condición de residuo"],
    sinonimos: [
      "ley 3/2023",
      "ley 3 2023",
      "economia circular",
      "ley de economia circular",
      "economia circular andalucia",
    ],
    resumen:
      "Norma andaluza que regula la prevención, reutilización, reciclado y gestión de residuos bajo el enfoque de economía circular, en desarrollo de la Ley 7/2022 estatal. Modifica parcialmente la Ley 7/2007 (GICA) y afecta a la gestión de residuos por los CAT.",
    requisitos: [],
    estado: "En revisión",
    fechaRevision: "2026-09-23",
    fuente: "BOJA núm. 65, de 05/04/2023.",
    version: "0.1",
    notasTecnico: "Pendiente de redactar requisitos aplicables a CAT.",
  },
  {
    id: "rd-265-2021-vfu",
    titulo: "Real Decreto 265/2021, de 13 de abril, sobre los vehículos al final de su vida útil",
    tipoDocumento: "Real Decreto",
    ambitoTerritorial: "España",
    materia: "Vehículos al final de su vida útil",
    etiquetas: ["VFU", "CAT", "baja", "certificado de destrucción", "descontaminación", "reutilización"],
    sinonimos: [
      "vfu",
      "vehiculos al final de su vida util",
      "vehiculo al final de su vida util",
      "baja vehiculo",
      "baja de vehiculo",
      "dar de baja",
      "cat",
      "centro autorizado de tratamiento",
      "certificado destruccion",
      "certificado de destruccion",
      "descontaminacion",
      "rd 265/2021",
      "real decreto 265/2021",
    ],
    resumen:
      "Regula las obligaciones de los CAT: recepción de VFU, emisión del certificado de destrucción, descontaminación en plazo, objetivos de reutilización, reciclado y valorización, y comunicación a la DGT. Deroga el RD 1383/2002.",
    requisitos: [],
    estado: "En revisión",
    fechaRevision: "2026-09-23",
    fuente: "BOE núm. 89, de 14/04/2021.",
    version: "0.1",
  },
  {
    id: "rd-553-2020-traslados",
    titulo: "Real Decreto 553/2020, de 2 de junio, por el que se regula el traslado de residuos en el interior del territorio del Estado",
    tipoDocumento: "Real Decreto",
    ambitoTerritorial: "España",
    materia: "Residuos",
    etiquetas: ["traslado", "DI", "NT", "notificación previa", "eSIR"],
    sinonimos: [
      "traslado de residuos",
      "traslados",
      "documento de identificacion",
      "di",
      "npt",
      "notificacion previa de traslado",
      "notificacion de traslado",
      "esir",
      "rd 553/2020",
      "real decreto 553/2020",
    ],
    resumen:
      "Regula el traslado de residuos entre comunidades autónomas y dentro de ellas: documento de identificación (DI), notificación previa (NT) para residuos peligrosos y contratos de tratamiento. Implantación a través de la plataforma eSIR.",
    requisitos: [],
    estado: "En revisión",
    fechaRevision: "2026-09-23",
    fuente: "BOE núm. 171, de 19/06/2020.",
    version: "0.1",
  },
  {
    id: "rdl-1-2001-ley-aguas",
    titulo: "Real Decreto Legislativo 1/2001, de 20 de julio, texto refundido de la Ley de Aguas",
    tipoDocumento: "Real Decreto Legislativo",
    ambitoTerritorial: "España",
    materia: "Vertidos",
    etiquetas: ["Ley de Aguas", "vertido a cauce", "dominio público hidráulico", "organismo de cuenca", "art. 100"],
    sinonimos: [
      "ley de aguas",
      "rdl 1/2001",
      "real decreto legislativo 1/2001",
      "texto refundido ley de aguas",
      "dominio publico hidraulico",
      "organismo de cuenca",
      "confederacion hidrografica",
      "vertido a cauce",
      "vertido a terreno",
      "infiltracion",
    ],
    resumen:
      "Norma estatal que regula el dominio público hidráulico. Su artículo 100 exige autorización administrativa previa del organismo de cuenca para cualquier vertido directo o indirecto a aguas continentales o al terreno.",
    requisitos: [],
    estado: "En revisión",
    fechaRevision: "2026-09-23",
    fuente: "BOE núm. 176, de 24/07/2001. Texto consolidado en BOE.",
    version: "0.1",
  },
  {
    id: "rd-712-2025-neumaticos",
    titulo: "Real Decreto 712/2025 sobre neumáticos al final de su vida útil",
    tipoDocumento: "Real Decreto",
    ambitoTerritorial: "España",
    materia: "Neumáticos",
    etiquetas: ["NFU", "neumáticos fuera de uso", "responsabilidad ampliada del productor"],
    sinonimos: ["nfu", "neumaticos", "neumaticos fuera de uso", "neumaticos al final de su vida util", "rd 712/2025", "real decreto 712/2025"],
    resumen:
      "Regula la gestión de neumáticos al final de su vida útil y el régimen de responsabilidad ampliada del productor, sustituyendo al RD 1619/2005.",
    requisitos: [],
    estado: "En revisión",
    fechaRevision: "2026-09-23",
    fuente: "BOE (pendiente de confirmar número y fecha de publicación).",
    version: "0.1",
    notasTecnico: "Confirmar referencia BOE, entrada en vigor y obligaciones para CAT.",
  },
  {
    id: "reglamento-ue-2023-1542-baterias",
    titulo: "Reglamento (UE) 2023/1542 relativo a las pilas y baterías y a sus residuos",
    tipoDocumento: "Reglamento UE",
    ambitoTerritorial: "Unión Europea",
    materia: "Baterías",
    etiquetas: ["baterías", "pilas", "baterías de vehículo eléctrico", "pasaporte de batería"],
    sinonimos: ["baterias", "pilas", "bateria electrica", "baterias vehiculo electrico", "reglamento 2023/1542", "reglamento baterias"],
    resumen:
      "Reglamento europeo de aplicación directa que regula todo el ciclo de vida de pilas y baterías, incluidas las de vehículos eléctricos: diseño, etiquetado, pasaporte digital, recogida y reciclado. Deroga la Directiva 2006/66/CE.",
    requisitos: [],
    estado: "En revisión",
    fechaRevision: "2026-09-23",
    fuente: "DOUE L 191, de 28/07/2023.",
    version: "0.1",
  },
  {
    id: "rd-208-2022-garantias",
    titulo: "Real Decreto 208/2022, de 22 de marzo, sobre las garantías financieras en materia de residuos",
    tipoDocumento: "Real Decreto",
    ambitoTerritorial: "España",
    materia: "Garantías financieras",
    etiquetas: ["garantía financiera", "fianza", "seguro de responsabilidad", "gestor de residuos"],
    sinonimos: ["garantias financieras", "garantia financiera", "fianza residuos", "seguro residuos", "rd 208/2022", "real decreto 208/2022"],
    resumen:
      "Establece las garantías financieras (fianza y seguro) exigibles a gestores de residuos, incluidos los CAT, para responder de las obligaciones ambientales y de restauración.",
    requisitos: [],
    estado: "En revisión",
    fechaRevision: "2026-09-23",
    fuente: "BOE núm. 70, de 23/03/2022.",
    version: "0.1",
  },
  {
    id: "pirec-2030",
    titulo: "Plan Integral de Residuos de Andalucía. Hacia una Economía Circular en el Horizonte 2030 (PIREC 2030)",
    tipoDocumento: "Plan",
    ambitoTerritorial: "Andalucía",
    materia: "Planificación",
    etiquetas: ["PIREC", "plan de residuos", "Andalucía", "Decreto 131/2021"],
    sinonimos: ["pirec", "pirec 2030", "pire c 2030", "plan integral de residuos", "plan de residuos andalucia", "decreto 131/2021"],
    resumen:
      "Instrumento de planificación de la Junta de Andalucía en materia de residuos con horizonte 2030, aprobado por Decreto 131/2021.",
    requisitos: [],
    estado: "En revisión",
    fechaRevision: "2026-09-23",
    fuente: "BOJA núm. 71, de 15/04/2021.",
    version: "0.1",
  },
  {
    id: "orden-mam-304-2002-ler",
    titulo: "Orden MAM/304/2002 y Lista Europea de Residuos (LER)",
    tipoDocumento: "Orden",
    ambitoTerritorial: "España / Unión Europea",
    materia: "Residuos",
    etiquetas: ["LER", "código LER", "lista europea de residuos", "valorización", "eliminación"],
    sinonimos: ["ler", "codigo ler", "codigos ler", "lista europea de residuos", "orden mam/304/2002", "orden mam 304 2002", "operaciones de valorizacion"],
    resumen:
      "La Orden MAM/304/2002 publicó las operaciones de valorización y eliminación y la Lista Europea de Residuos. La LER vigente es la de la Decisión 2014/955/UE; la Orden ha sido parcialmente desplazada por la Ley 7/2022. REVISAR VIGENCIA Y ACTUALIZACIONES POSTERIORES ANTES DE VALIDAR.",
    requisitos: [],
    estado: "En revisión",
    fechaRevision: "2026-09-23",
    fuente: "BOE núm. 43, de 19/02/2002. Decisión 2014/955/UE.",
    version: "0.1",
    notasTecnico:
      "MARCADA EXPRESAMENTE PARA REVISIÓN DE VIGENCIA. Comprobar derogaciones por Ley 7/2022 y actualizaciones de la LER antes de validar.",
  },
];

/** Devuelve la ficha por id (cualquier estado). Uso interno y área técnica. */
export function getFicha(id: string): Ficha | undefined {
  return knowledgeBase.find((f) => f.id === id);
}
