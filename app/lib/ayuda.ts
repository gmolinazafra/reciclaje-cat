/**
 * Preguntas frecuentes y ayuda de ReciclaCat_Gest.
 * Texto plano (sin HTML) para poder buscar. «soloWindows» = solo tiene sentido en la versión instalada.
 * © Limonada Web.
 */

export interface PreguntaAyuda {
  p: string;
  r: string[];
  /** Palabras extra para el buscador (sinónimos). */
  claves?: string;
  soloWindows?: boolean;
}

export interface TemaAyuda {
  id: string;
  icono: string;
  titulo: string;
  preguntas: PreguntaAyuda[];
}

export const AYUDA: TemaAyuda[] = [
  {
    id: "empezar", icono: "🚀", titulo: "Primeros pasos",
    preguntas: [
      {
        p: "¿Por dónde empiezo?",
        r: [
          "1. Abre Ajustes (⚙️ arriba a la derecha) y rellena el nombre del centro, el NIMA y la provincia.",
          "2. En «Datos para la memoria anual (SIRA)» pon razón social, NIF, municipio, nº de autorización e inscripciones. Se usan en la memoria y en los Excel.",
          "3. Sube tus documentos (bajas, facturas, DI) desde Documentos o desde los accesos rápidos de Resumen.",
          "4. Revisa cada mes el Resumen: te dice qué falta para cerrar el año.",
        ],
        claves: "inicio comenzar configurar configuración centro",
      },
      {
        p: "¿Qué son los datos de demostración y cómo los quito?",
        r: [
          "Son datos inventados para ver cómo funciona el programa; llevan la etiqueta DEMO.",
          "Para empezar con tus datos: Ajustes → «Borrar todo». Si ya tenías datos tuyos, haz antes una copia de seguridad.",
        ],
        claves: "demo ejemplo borrar empezar de cero",
      },
      {
        p: "¿Cómo cambio de año (ejercicio)?",
        r: ["Con el selector de año de la cabecera. Puedes trabajar con años anteriores, por ejemplo para registrar DI del año pasado o preparar su memoria."],
        claves: "ejercicio año anterior selector",
      },
    ],
  },
  {
    id: "documentos", icono: "📄", titulo: "Documentos, facturas y DI",
    preguntas: [
      {
        p: "¿Qué documentos puedo subir?",
        r: [
          "PDF, fotos (JPG/PNG) y Excel: bajas de vehículos, facturas de venta de piezas, documentos de identificación (DI), certificados…",
          "El programa lee el texto (también de fotos y PDF escaneados) y te propone los datos para que los revises antes de guardarlos. Nada se guarda sin tu confirmación.",
        ],
        claves: "subir pdf foto excel escanear ocr leer",
      },
      {
        p: "¿Lee los DI oficiales de la Junta?",
        r: [
          "Sí. Reconoce el formato oficial del DI: remitente, gestor, residuo (LER), kilos aceptados, NIMA y operación.",
          "Si un PDF trae varios DI, los separa y te deja marcar cuáles registrar.",
          "Si marcas «Registrar también el DI y su salida de residuo», crea el DI y la salida del residuo a la vez. Si un DI ya existe, te avisa y no lo duplica.",
        ],
        claves: "di documento identificacion junta andalucia varios pdf duplicado",
      },
      {
        p: "¿Cómo se suben las facturas de venta de piezas?",
        r: [
          "En Documentos sube la factura (PDF, foto o Excel), o en Piezas usa «Piezas desde Excel».",
          "El programa reconoce las líneas de la factura y calcula los kilos de piezas con el diccionario de pesos. Lo que cuenta para la memoria son los kilos gestionados de piezas.",
          "Si un peso no es correcto, corrígelo en el diccionario: a partir de ahí se usa el tuyo (mejor si es de báscula).",
        ],
        claves: "factura venta piezas excel pesos kilos diccionario bascula",
      },
      {
        p: "El texto leído sale mal o con letras raras, ¿qué hago?",
        r: [
          "Corrige los campos en la pantalla de revisión antes de guardar.",
          "Con fotos: mejor luz, documento recto y sin sombras. Con PDF, mejor el original que una foto del papel.",
        ],
        claves: "ocr error lectura mal letras raras tildes",
      },
      {
        p: "¿Dónde queda el archivo original?",
        r: ["En la versión de Windows se guarda una copia del original en la carpeta de datos y puedes abrirlo desde la ficha del documento."],
        claves: "original adjunto archivo abrir",
        soloWindows: true,
      },
    ],
  },
  {
    id: "vehiculos", icono: "🚗", titulo: "Vehículos y residuos",
    preguntas: [
      {
        p: "¿Cómo registro un vehículo y su descontaminación?",
        r: [
          "Vehículos → alta: matrícula, fecha de entrada, procedencia y peso (tara). Cuando lo descontamines, pon la fecha de descontaminación.",
          "Si pasan más de 30 días sin descontaminar, el programa lo marca para que no se te pase.",
        ],
        claves: "alta vehiculo matricula descontaminacion tara 30 dias",
      },
      {
        p: "¿Cómo registro la salida a la fragmentadora?",
        r: [
          "Vehículos → «Salida a fragmentadora»: marca los vehículos, el gestor, su NIF y NIMA.",
          "Si tienes el peso total de báscula, escríbelo y se reparte entre los vehículos según su peso. Por defecto se usa la operación R1203.",
        ],
        claves: "fragmentadora salida 160106 r1203 bascula",
      },
      {
        p: "¿Por qué no se suman juntos los residuos peligrosos y los no peligrosos?",
        r: ["Porque la normativa los trata por separado: los LER con asterisco (*) son peligrosos y nunca se mezclan en totales, listados, DI ni informes."],
        claves: "peligroso no peligroso asterisco ler mezclar",
      },
      {
        p: "¿Dónde registro los neumáticos y el stock a 31 de diciembre?",
        r: [
          "En Residuos: neumáticos de segunda mano, recibidos a cambio y entregados con certificado (art. 7.5 RD 265/2021).",
          "El stock de residuos a 31/12 también se registra allí; sale en la memoria.",
        ],
        claves: "neumaticos nfu stock 31 diciembre segunda mano",
      },
    ],
  },
  {
    id: "memoria", icono: "📊", titulo: "Memoria anual (SIRA)",
    preguntas: [
      {
        p: "¿Qué prepara el programa para la memoria anual?",
        r: [
          "Informes → «Memoria SIRA»: vehículos tratados (número y peso), cuadre de stock, porcentajes de reutilización, reciclaje, valorización, eliminación y fragmentadora, y el objetivo de piezas para reutilización.",
          "Las tablas de entradas (gestor de peligrosos) y salidas (productor de peligrosos y de no peligrosos) con LER, gestor, NIMA, inscripción y operación.",
          "Descarga un Excel por memoria y la memoria en PDF.",
        ],
        claves: "memoria anual sira junta excel pdf informe",
      },
      {
        p: "¿Cuál es el objetivo de piezas para reutilización?",
        r: ["Al menos el 10 % del peso de los vehículos tratados, y el 15 % desde el 1 de enero de 2026. La pantalla de la memoria te avisa si no llegas."],
        claves: "objetivo 15 10 por ciento reutilizacion piezas",
      },
      {
        p: "¿Cuándo hay que presentarla y qué más hace falta?",
        r: [
          "Comprueba el plazo con tu Delegación: según la comunidad puede ser el 1 de marzo o el 1 de mayo. Lo prudente es presentarla antes del 1 de marzo.",
          "Necesitas pagar la tasa (modelo 046) y cargar los datos en SIRA. La pantalla de la memoria tiene una lista de comprobación.",
          "El programa ayuda a prepararla, pero la responsabilidad de revisar y presentar los datos es del centro.",
        ],
        claves: "plazo marzo mayo tasa 046 presentar",
      },
      {
        p: "La memoria dice «faltan datos», ¿qué significa?",
        r: ["Que hay DI o vehículos sin algún dato que pide SIRA (NIMA, NIF del gestor, operación, fecha de descontaminación…). Pulsa el aviso o busca la etiqueta en Residuos y Vehículos para completarlos."],
        claves: "faltan datos aviso incompleto",
      },
    ],
  },
  {
    id: "seguridad", icono: "🔐", titulo: "Copias de seguridad y doble autenticación",
    preguntas: [
      {
        p: "¿Dónde se guardan mis datos?",
        r: [
          "En tu ordenador, en la carpeta de datos de ReciclaCat_Gest (Ajustes → «Abrir carpeta de datos»). No se envían a ningún servidor.",
          "Cada día se hace una copia automática y se guardan las 30 últimas.",
        ],
        claves: "datos donde carpeta privacidad servidor nube",
        soloWindows: true,
      },
      {
        p: "¿Cómo hago una copia en un pendrive y cómo la recupero?",
        r: [
          "Ajustes → «Hacer copia de seguridad…» y elige el pendrive o disco externo. Hazlo de vez en cuando: si el ordenador se estropea, es lo único que conserva los datos.",
          "Para recuperarla: Ajustes → «Restaurar copia…» y elige la carpeta de la copia. Antes de restaurar se guarda una copia de lo actual.",
        ],
        claves: "copia seguridad pendrive restaurar recuperar ordenador nuevo",
        soloWindows: true,
      },
      {
        p: "¿Qué es la doble autenticación y cómo la activo?",
        r: [
          "Protege el programa con una contraseña y un código de 6 cifras que cambia cada 30 segundos en tu móvil (Google Authenticator, Microsoft Authenticator, Authy, 2FAS…). Funciona sin internet.",
          "Ajustes → «Doble autenticación» → «Activar»: elige contraseña, escanea el código QR y escribe el código de la app.",
          "Guarda los 8 códigos de recuperación: si pierdes el móvil, son la forma de entrar. Cada uno sirve una vez.",
        ],
        claves: "2fa doble factor autenticador contraseña codigo qr google microsoft",
        soloWindows: true,
      },
      {
        p: "¿Cuándo se bloquea el programa?",
        r: ["Al abrirlo, tras el rato sin usar el equipo que elijas (5, 15, 30 o 60 minutos, o nunca), al bloquear Windows (Windows + L), al suspender el equipo o con «Bloquear ahora»."],
        claves: "bloqueo inactividad minutos bloquear",
        soloWindows: true,
      },
      {
        p: "He perdido el móvil o no me acepta el código",
        r: [
          "Si no acepta el código, comprueba que la fecha y la hora de Windows y del móvil están bien (en automático).",
          "Sin móvil: en la pantalla de acceso pulsa «usar un código de recuperación». Después, en Ajustes, genera códigos nuevos o vuelve a configurar la app.",
          "Si has perdido la contraseña, el móvil y los códigos, contacta con soporte: tus datos no se pierden.",
        ],
        claves: "perdido movil codigo no funciona hora recuperacion olvidado contraseña",
        soloWindows: true,
      },
    ],
  },
  {
    id: "licencia", icono: "🔑", titulo: "Licencia, prueba y actualizaciones",
    preguntas: [
      {
        p: "¿Cómo funciona la prueba gratuita de 15 días?",
        r: [
          "Tienes todas las funciones durante 15 días, sin datos de pago. Al terminar, activa tu licencia y sigues con tus datos.",
          "La prueba solo se puede usar una vez por equipo.",
        ],
        claves: "prueba gratis 15 dias trial",
        soloWindows: true,
      },
      {
        p: "¿Cómo activo mi licencia?",
        r: [
          "En la pantalla de activación copia tu código de equipo y envíalo a Limonada Web. Te enviaremos una llave que empieza por RCG1.",
          "Pégala, acepta las condiciones y pulsa «Activar». La llave vale solo para ese ordenador.",
        ],
        claves: "licencia llave activar codigo equipo rcg1",
        soloWindows: true,
      },
      {
        p: "Voy a cambiar de ordenador, ¿qué hago?",
        r: [
          "1. En el ordenador antiguo haz una copia de seguridad en un pendrive.",
          "2. Instala ReciclaCat_Gest en el nuevo y envíanos su código de equipo para la llave nueva.",
          "3. Restaura la copia desde Ajustes.",
        ],
        claves: "cambiar ordenador nuevo equipo trasladar mover",
        soloWindows: true,
      },
      {
        p: "¿Cómo se actualiza el programa?",
        r: [
          "Solo. Con internet, busca versiones nuevas al abrir, las descarga y comprueba que son auténticas. Se instalan al cerrar o cuando pulses «Reiniciar ahora». Tus datos no se tocan.",
          "También puedes buscarlas en Ajustes → «Buscar actualizaciones».",
        ],
        claves: "actualizar actualizacion version nueva",
        soloWindows: true,
      },
      {
        p: "Windows dice «Windows protegió su PC» al instalar",
        r: [
          "Es el aviso SmartScreen de Windows con programas nuevos. Si lo has descargado de limonadaweb.com, pulsa «Más información» → «Ejecutar de todas formas».",
          "Descárgalo solo desde la web oficial de Limonada Web: otras copias pueden estar manipuladas.",
        ],
        claves: "smartscreen instalar aviso windows protegio descargar",
      },
    ],
  },
  {
    id: "soporte", icono: "💬", titulo: "SeproBot y soporte",
    preguntas: [
      {
        p: "¿Qué es SeproBot?",
        r: [
          "El asistente del programa (abajo a la derecha). Responde dudas de normativa y del programa con fichas revisadas.",
          "No usa inteligencia artificial externa ni envía tus datos a ningún sitio. Si una duda no está en sus fichas, te lo dice en lugar de inventar.",
        ],
        claves: "seprobot asistente bot chat normativa",
      },
      {
        p: "¿Cómo contacto con soporte?",
        r: ["Limonada Web · hola@limonadaweb.com · teléfono y WhatsApp 628 482 475. Si es sobre la licencia, indica tu código de equipo (lo verás en Ajustes)."],
        claves: "soporte contacto ayuda email telefono whatsapp",
      },
    ],
  },
];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Busca en preguntas, respuestas y claves. Todas las palabras deben aparecer. */
export function buscarAyuda(texto: string, escritorio: boolean): { tema: TemaAyuda; pregunta: PreguntaAyuda }[] {
  const palabras = norm(texto).split(/\s+/).filter((w) => w.length > 1);
  const res: { tema: TemaAyuda; pregunta: PreguntaAyuda }[] = [];
  for (const tema of AYUDA) {
    for (const pregunta of tema.preguntas) {
      if (pregunta.soloWindows && !escritorio) continue;
      const hay = norm([pregunta.p, ...pregunta.r, pregunta.claves ?? "", tema.titulo].join(" "));
      if (palabras.every((w) => hay.includes(w))) res.push({ tema, pregunta });
    }
  }
  return res;
}
