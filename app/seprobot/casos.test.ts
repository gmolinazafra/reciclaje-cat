/**
 * Casos de prueba de SeproBot. Sin framework: `npx tsx app/seprobot/casos.test.ts`
 */
import assert from "node:assert/strict";
import { estadoInicial, procesar } from "./conversation";
import { MENSAJE_SIN_FICHA } from "./knowledgeBase";
import type { EstadoConversacion } from "./types";

let e: EstadoConversacion = estadoInicial;
const di = (t: string) => { const r = procesar(e, t); e = r.estado; return r.mensajes.map((m) => m.texto).join("\n"); };
const reset = () => { e = estadoInicial; };

// 1. GICA
let r = di("¿Qué es la Ley GICA?");
assert.match(r, /Ley 7\/2007/); assert.match(r, /AAU/); assert.doesNotMatch(r, /Indica el asunto/);

// 2-5. Flujo de vertidos con contexto
reset();
assert.match(di("Necesito renovar una autorización de vertido"), /provincia o municipio/i);
assert.match(di("Sevilla"), /Sevilla.*aguas/s);
assert.match(di("Red de saneamiento"), /motivo/i);
r = di("Renovación");
assert.match(r, /Sevilla/); assert.match(r, /ordenanza/i); assert.match(r, /entidad gestora/i);
assert.match(r, /arqueta/i); assert.match(r, /autorización individual/i);
assert.doesNotMatch(r, /Málaga/);

// 6. Ayuda de la aplicación
reset();
r = di("¿Cómo subo un Excel de piezas?");
assert.match(r, /Documentos/); assert.match(r, /Guardar/);

// 7. Sin ficha vigente → derivar al técnico, sin inventar
reset();
r = di("¿qué dice el reglamento de baterías?");
assert.ok(r.startsWith(MENSAJE_SIN_FICHA));
assert.doesNotMatch(r, /DOUE/); // no se filtra contenido de la ficha en revisión
reset();
assert.equal(di("cuántos años tiene el rey"), MENSAJE_SIN_FICHA);

// Extra: pregunta general de vertidos no lanza interrogatorio
reset();
r = di("¿qué es una autorización de vertido?");
assert.match(r, /Consultas generales/); assert.doesNotMatch(r, /provincia/i);

// Extra: nunca se asume ubicación
reset();
di("alta nueva de vertido");
assert.equal(e.ubicacion, null);

// Extra: cambio de tema en mitad del flujo
reset();
di("modificación de vertido");
assert.match(di("qué es la ley gica"), /Ley 7\/2007/);

console.log("✔ Todos los casos de SeproBot pasan");
