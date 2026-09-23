/**
 * Casos de prueba obligatorios de SeproBot. Sin framework:
 *   npx tsx app/seprobot/casos.test.ts
 */
import assert from "node:assert/strict";
import { ACCESOS_INICIALES, estadoInicial, procesar } from "./conversation";
import { clasificar } from "./intentClassifier";
import { MENSAJE_SIN_FICHA } from "./knowledgeBase";
import type { EstadoConversacion } from "./types";

let e: EstadoConversacion = estadoInicial;
const di = (t: string) => {
  const r = procesar(e, t);
  e = r.estado;
  return {
    texto: r.mensajes.map((m) => [m.texto, ...(m.pasos ?? [])].join("\n")).join("\n"),
    pie: r.mensajes.map((m) => m.pie ?? "").join("\n"),
    opciones: r.mensajes[0]?.opciones ?? [],
  };
};
const reset = () => { e = estadoInicial; };
let n = 0;
const caso = (nombre: string, fn: () => void) => { fn(); n++; console.log("  ✔", nombre); };

caso("clasificador: 'como registro las piezas vendidas' → uso_app / piezas_vendidas / registrar", () => {
  const c = clasificar("como registro las piezas vendidas");
  assert.equal(c.intencion, "uso_app"); assert.equal(c.entidad, "piezas_vendidas"); assert.equal(c.accion, "registrar");
});

caso("'como registro las piezas vendidas' → guía de piezas, sin RD 553/2020", () => {
  reset(); const r = di("como registro las piezas vendidas");
  assert.match(r.texto, /factura/i); assert.match(r.texto, /pestaña «Piezas»/); assert.match(r.texto, /diccionario de pesos/);
  assert.match(r.texto, /diccionario de pesos/); assert.match(r.texto, /Guardar/);
  assert.doesNotMatch(r.texto, /553\/2020/); assert.doesNotMatch(r.texto, /Real Decreto/);
});

caso("'cómo importo el Excel de ventas' → importación / revisión / pesos", () => {
  reset(); const r = di("cómo importo el Excel de ventas");
  assert.match(r.texto, /Importar ventas desde Excel/); assert.match(r.texto, /vista previa/i); assert.match(r.texto, /pesos/);
});

caso("'cómo doy de alta un DI' → aclaración con dos botones", () => {
  reset(); const r = di("cómo doy de alta un DI");
  assert.match(r.texto, /registrar un DI en ReciclaCat_Gest o a consultar la normativa/);
  assert.equal(r.opciones.length, 2);
  assert.equal(r.opciones[0], "Registrar un DI en ReciclaCat_Gest");
  assert.equal(r.opciones[1], "Consultar normativa de DI");
});

caso("tras pulsar 'Registrar un DI en ReciclaCat_Gest' → guía sin volver a preguntar", () => {
  const r = di("Registrar un DI en ReciclaCat_Gest");
  assert.match(r.texto, /Registrar un DI/); assert.match(r.texto, /«Residuos»/); assert.equal(r.opciones.length, 0);
  assert.doesNotMatch(r.texto, /Te refieres/);
});

caso("tras aclaración, 'Consultar normativa de DI' → RD 553/2020", () => {
  reset(); di("cómo doy de alta un DI"); const r = di("Consultar normativa de DI");
  assert.match(r.texto, /553\/2020/); assert.doesNotMatch(r.texto, /Te refieres/);
});

caso("'registrar un DI en ReciclaCat_Gest' directo → guía de alta DI", () => {
  reset(); const r = di("registrar un DI en ReciclaCat_Gest");
  assert.match(r.texto, /Registrar un DI/); assert.match(r.texto, /OCR/);
});

caso("'consultar normativa del DI' → RD 553/2020", () => {
  reset(); const r = di("consultar normativa del DI");
  assert.match(r.texto, /Real Decreto 553\/2020/); assert.doesNotMatch(r.texto, /pestaña/);
});

caso("'qué es la Ley GICA' → explicación legal de GICA", () => {
  reset(); const r = di("qué es la Ley GICA");
  assert.match(r.texto, /Ley 7\/2007/); assert.match(r.texto, /AAU/); assert.match(r.pie, /Fuente:.*Estado: Vigente/);
});

caso("'renovar autorización de vertido' → pide ubicación", () => {
  reset(); const r = di("renovar autorización de vertido");
  assert.match(r.texto, /provincia o municipio/i);
});

caso("'Sevilla' → destino; 'red de saneamiento' → motivo; 'renovación' → respuesta Sevilla sin Málaga", () => {
  let r = di("Sevilla"); assert.match(r.texto, /Sevilla/); assert.match(r.texto, /aguas/); assert.equal(r.opciones.length, 3);
  r = di("red de saneamiento"); assert.match(r.texto, /motivo/i); assert.equal(r.opciones.length, 4);
  r = di("renovación");
  assert.match(r.texto, /Sevilla/); assert.match(r.texto, /ordenanza/i); assert.match(r.texto, /entidad gestora/i);
  assert.match(r.texto, /arqueta/i); assert.match(r.texto, /autorización individual/i); assert.doesNotMatch(r.texto, /Málaga/);
});

caso("'cómo subo una foto de baja' → guía de aplicación", () => {
  reset(); const r = di("cómo subo una foto de baja");
  assert.match(r.texto, /Registrar un vehículo y la foto de baja/); assert.match(r.texto, /«Vehículos»/); assert.doesNotMatch(r.texto, /Real Decreto/);
});

caso("pregunta sin ficha vigente → deriva al técnico sin inventar", () => {
  reset(); assert.equal(di("cuántos años tiene el rey").texto, MENSAJE_SIN_FICHA);
  reset(); const r = di("qué dice el reglamento de baterías");
  assert.ok(r.texto.startsWith(MENSAJE_SIN_FICHA)); assert.doesNotMatch(r.texto, /DOUE/);
});

caso("los seis accesos iniciales resuelven a una ficha funcional", () => {
  for (const a of ACCESOS_INICIALES) {
    reset(); const r = di(a.texto);
    assert.ok(!r.texto.startsWith(MENSAJE_SIN_FICHA), `acceso sin ficha: ${a.etiqueta}`);
    assert.doesNotMatch(r.texto, /Te refieres/, `acceso ambiguo: ${a.etiqueta}`);
  }
});

caso("otros flujos de app: residuos, OCR, situación anual, informe, corregir", () => {
  reset(); assert.match(di("cómo registro los residuos").texto, /Registrar residuos/);
  reset(); assert.match(di("el OCR ha leído mal la matrícula").texto, /OCR/);
  reset(); assert.match(di("cómo va el año").texto, /Situación|situación anual/i);
  reset(); assert.match(di("cómo genero la memoria anual").texto, /memoria anual/i);
  reset(); assert.match(di("cómo corrijo un documento importado").texto, /Corregir un documento/);
});

caso("nunca se asume ubicación", () => {
  reset(); di("alta nueva de vertido"); assert.equal(e.ubicacion, null);
});

caso("pregunta general de vertidos responde sin interrogatorio", () => {
  reset(); const r = di("¿qué es una autorización de vertido?");
  assert.match(r.texto, /Consultas generales/); assert.doesNotMatch(r.texto, /provincia/i);
});


caso("'cómo funciona la aplicación' (acceso) → ficha de funcionamiento", () => {
  reset(); const r = di("cómo funciona la aplicación");
  assert.match(r.texto, /Funcionamiento de ReciclaCat_Gest/); assert.match(r.texto, /«Piezas»/);
});

caso("'me aplica la ley gica?' → pide ubicación (norma andaluza) y razona con ella", () => {
  reset(); let r = di("me aplica la ley gica?");
  assert.match(r.texto, /provincia o municipio/i); assert.doesNotMatch(r.texto, /norma marco de Andalucía/);
  r = di("Sevilla");
  assert.match(r.texto, /¿Aplica la Ley 7\/2007/); assert.match(r.texto, /Sí, aplica/); assert.match(r.texto, /Sevilla/); assert.match(r.texto, /ámbito \*\*andaluz\*\*/);
  assert.match(r.texto, /AAU, AAUS o Calificación/);
});

caso("'me aplica la ley gica?' con centro fuera de Andalucía → no aplica directamente", () => {
  reset(); di("me aplica la ley gica?"); const r = di("Murcia");
  assert.match(r.texto, /No aplica directamente/); assert.match(r.texto, /Murcia/);
});

caso("'estoy obligado a cumplir el RD 553/2020?' (estatal) → responde sin pedir ubicación", () => {
  reset(); const r = di("estoy obligado a cumplir el RD 553/2020?");
  assert.match(r.texto, /Sí, aplica/); assert.match(r.texto, /estatal/); assert.doesNotMatch(r.texto, /provincia/i);
});

caso("'me aplica la autorización de vertido?' → depende, con condiciones", () => {
  reset(); const r = di("me aplica la autorización de vertido?");
  assert.match(r.texto, /Depende/); assert.match(r.texto, /red de saneamiento/);
});

caso("'me aplica el reglamento de baterías?' sin ficha vigente → deriva", () => {
  reset(); assert.ok(di("me aplica el reglamento de baterías?").texto.startsWith(MENSAJE_SIN_FICHA));
});

caso("'cómo importo ventas' → importación desde Excel", () => {
  reset(); assert.match(di("cómo importo ventas").texto, /Importar ventas desde Excel/);
});
caso("'cómo subo y reviso un documento' → flujo de revisión", () => {
  reset(); const r = di("cómo subo y reviso un documento"); assert.match(r.texto, /Subir y revisar/); assert.match(r.texto, /amarillo/);
});
caso("los seis accesos son distintos entre sí", () => {
  const titulos = new Set<string>();
  for (const a of ACCESOS_INICIALES) { reset(); titulos.add(di(a.texto).texto.split("\n")[0]); }
  assert.equal(titulos.size, ACCESOS_INICIALES.length);
});

console.log(`\n✔ ${n} casos de SeproBot pasan (total)`);
