/** Pruebas de la memoria SIRA y de los DI oficiales (datos inventados). `npx tsx app/lib/memoria.test.ts` */
import assert from "node:assert/strict";
import { aplicarDIs } from "./di";
import { dividirDocumentos, extraerDIOficial, extraerDeTexto, limpiarTextoPdf } from "./extraer";
import { normalizarLER, operacion4 } from "./ler";
import { memoriaSIRA, OBJETIVO_PIEZAS } from "./memoria";
import { baseVacia } from "./repo";
import type { BaseDatos } from "./types";

let n = 0;
const ok = (nombre: string, fn: () => void) => { fn(); n++; console.log("  ✔", nombre); };

// DI con el mismo formato que los oficiales (RD 553/2020), datos inventados y con las tildes rotas de pdf.js.
const DI = (num: string, ler: string, kg: string, desc: string, op = "R13") => `DOCUMENTO DE IDENTIFICACIÓN
(Artíículo 6 Y Anexo I del RD 553/2020, BOE 19/06/2020)
Documento nº ${num}
A DATOS DEL REMITENTE
Razoín social : DESGUACES EJEMPLO, S.L. N.I.F: B00000001
NIMA: 2900000001
Provincia: 29 MAÁLAGA Municipio: Maílaga Nº Tel: 600000000
DATOS DEL RESIDUO QUE SE TRANSFIERE
Coídigo seguín Lista Europea de Residuos (L.E.R.), Anejo 2 Orden MAM/304/2002 (seis díígitos ) ${ler}
Codificacioín del Proceso .- Residuo en el productor: 99 - 999 ${desc}
Cantidad Kgs. Netos: ${kg} Kgs. brutos, incluso recipientes: ${kg}
Tabla 1: Tabla 2: Tabla 3: Tabla 4: Tabla 5: Tabla 6: Tabla 7:
Q5 ${op} P08 C51 HP5 A840 B00019
DATOS DEL GESTOR U OPERADOR A QUE SE ENVÍAN
Razoín social / Nombre: Gestora Inventada del Sur, S.L. N.I.F: B00000002
NIMA: 2900000002
Provincia: Malaga Municipio: Coíín
DATOS DEL TRANSPORTE COMPLETO PREVISTO
Primer traslado: Fecha de inicio: 26/12/24 Fecha de entrega: 26/12/24
Razoín social / Nombre:Transportes Ficticios, S.L. NIF: B00000003
B . DATOS A CUMPLIMENTAR POR EL DESTINATARIO
Kilos Netos Aceptados: ${kg}`;

ok("tildes rotas de pdf.js (Razón, Málaga, dígitos, Coín, MÁLAGA)", () => {
  const t = limpiarTextoPdf("Razoín social · Maílaga · díígitos · Coíín · MAÁLAGA · Pequenño");
  assert.equal(t, "Razón social · Málaga · dígitos · Coín · MÁLAGA · Pequeño");
  assert.equal(limpiarTextoPdf(t), t, "idempotente");
  assert.equal(limpiarTextoPdf("El país y el maíz"), "El país y el maíz", "no toca textos normales");
});
ok("LER peligroso por catálogo aunque el DI no lleve asterisco", () => {
  assert.equal(normalizarLER("130208"), "13 02 08*"); assert.equal(normalizarLER("160103"), "16 01 03"); assert.equal(normalizarLER("160601"), "16 06 01*");
  assert.equal(normalizarLER("130703"), "13 07 03*", "todo el capítulo 13 es peligroso");
});
ok("operación de 2 a 4 cifras", () => { assert.equal(operacion4("R13"), "R1301"); assert.equal(operacion4("R1201"), "R1201"); assert.equal(operacion4("d15"), "D1501"); });
ok("DI oficial: todas las casillas", () => {
  const v = extraerDIOficial(DI("DCS30000000000020240000001", "130208", "1.500,00", "Otros aceites de motor"));
  assert.equal(v.numero, "DCS30000000000020240000001"); assert.equal(v.fecha, "2024-12-26"); assert.equal(v.ler, "13 02 08*");
  assert.equal(v.cantidadKg, "1500"); assert.equal(v.nimaOrigen, "2900000001"); assert.equal(v.nimaDestino, "2900000002");
  assert.equal(v.gestor, "Gestora Inventada del Sur, S.L."); assert.equal(v.nifDestino, "B00000002"); assert.equal(v.operacionDestino, "R1301");
  assert.equal(v.municipioDestino, "Coín"); assert.equal(v.transportista, "Transportes Ficticios, S.L."); assert.equal(v.descripcion, "Otros aceites de motor");
});
ok("PDF con varios DI (uno por página) se divide", () => {
  const docs = dividirDocumentos([DI("DCS1000000001", "130208", "10,00", "Aceite"), DI("DCS1000000002", "160103", "840,00", "Neumáticos"), "página de anexo sin DI"]);
  assert.equal(docs.length, 2);
  assert.equal(extraerDeTexto(docs[1]).tipo, "DI");
});

// ── Memoria ──
function base(): BaseDatos {
  const db = baseVacia(2026);
  db.centro = { ...db.centro, nombre: "Desguace Ejemplo", razonSocial: "Desguaces Ejemplo, S.L.", nif: "B00000001", nima: "2900000001", provincia: "Málaga", municipio: "Málaga", operacionAutorizada: "R1201" };
  const v = (id: string, entrada: string, kg: number, desc?: string, extra = {}) => ({ id, ejercicio: 2026, matricula: id, marca: "Seat", modelo: "Ibiza", fechaEntrada: entrada, estado: desc ? "Descontaminado" as const : "Recibido" as const, pesoEstimadoKg: kg, fechaDescontaminacion: desc, ...extra });
  db.vehiculos = [
    v("A", "2025-12-20", 1000, "2026-01-10"), // stock inicial, tratado en 2026
    v("B", "2026-02-01", 1200, "2026-02-15", { salida: { fecha: "2026-03-01", gestor: "Fragmentadora Inventada", nima: "2900000009", kg: 1000 } }),
    v("C", "2026-03-01", 1300, "2026-03-20"),
    v("D", "2026-12-28", 900), // stock final
  ];
  db.ventas = [{ id: "v1", ejercicio: 2026, fecha: "2026-03-01", mes: 3, pieza: "MOTOR", referencia: "", descripcion: "MOTOR COMPLETO", cantidad: 1, precio: 500, pesoKg: 150, origenPeso: "estimado", origen: "factura" }];
  const r = aplicarDIs(db, [
    { numero: "DCS1", fecha: "2026-04-01", ler: "130208", descripcion: "Aceite", cantidadKg: "70", nimaOrigen: "2900000001", nimaDestino: "2900000002", gestor: "Gestora Inventada", nifDestino: "B00000002", operacionDestino: "R13", municipioDestino: "Coín", transportista: "" },
    { numero: "DCS2", fecha: "2026-04-01", ler: "160103", descripcion: "NFU", cantidadKg: "100", nimaOrigen: "2900000001", nimaDestino: "2900000002", gestor: "Gestora Inventada", nifDestino: "B00000002", operacionDestino: "R13", municipioDestino: "Coín", transportista: "" },
    { numero: "DCS3", fecha: "2026-05-01", ler: "130208", descripcion: "Aceite", cantidadKg: "30", nimaOrigen: "2900000001", nimaDestino: "2900000002", gestor: "Gestora Inventada", nifDestino: "B00000002", operacionDestino: "R13", municipioDestino: "Coín", transportista: "" },
  ]);
  assert.equal(r.creados, 3);
  const d = r.db;
  d.neumaticos = [{ id: "n1", ejercicio: 2026, fecha: "2026-06-01", tipo: "segunda_mano", kg: 50, unidades: 6, destinatario: "Taller Inventado", tipoDestinatario: "profesional" }];
  d.stocks = [{ id: "s1", ejercicio: 2026, ler: "13 02 08*", kg: 40 }];
  return d;
}

ok("DI repetidos no se duplican y crean su salida de residuo", () => {
  const d = base();
  assert.equal(d.residuos.length, 3);
  assert.equal(aplicarDIs(d, [{ numero: "DCS1" } as never]).repetidos, 1);
});
ok("vehículos: entradas, tratados, stock y balance", () => {
  const m = memoriaSIRA(base(), 2026).vehiculos;
  assert.equal(m.entradas, 3); assert.equal(m.tratados, 3); assert.equal(m.tratadosKg, 3500);
  assert.equal(m.stockInicial, 1); assert.equal(m.stockFinal, 1); assert.equal(m.balanceOk, true);
});
ok("% sobre el peso tratado y fragmentadora medida", () => {
  const m = memoriaSIRA(base(), 2026);
  assert.equal(m.kg.reutilizacion, 200, "150 kg piezas + 50 kg neumáticos de segunda mano");
  assert.equal(m.porcentajes.reutilizacion, 5.71);
  assert.equal(m.kg.reciclaje, 200, "aceite 100 + NFU 100");
  assert.equal(m.porcentajes.fragmentadora, 28.57);
  assert.equal(m.fragmentadoraPorDiferencia, false);
});
ok("objetivo de piezas: 10 % hasta 2025 y 15 % desde 2026, con aviso", () => {
  assert.equal(OBJETIVO_PIEZAS(2025), 10); assert.equal(OBJETIVO_PIEZAS(2026), 15);
  const m = memoriaSIRA(base(), 2026);
  assert.equal(m.objetivoPiezas.cumple, false);
  assert.ok(m.avisos.some((a) => a.includes("15 %")));
});
ok("salidas agrupadas como SIRA (LER + NIMA + operación), peligrosos y no peligrosos separados", () => {
  const m = memoriaSIRA(base(), 2026);
  assert.deepEqual(m.salidasPeligrosos.map((f) => [f.ler, f.t, f.operacion, f.nima]), [["13 02 08*", 0.1, "R1301", "2900000002"]]);
  assert.deepEqual(m.salidasNoPeligrosos.map((f) => f.ler), ["16 01 03", "16 01 06"]);
  assert.ok(!m.salidasNoPeligrosos.some((f) => f.peligroso));
});
ok("entradas MAG: 16 01 04* con la procedencia configurada", () => {
  const d = base();
  assert.equal(memoriaSIRA(d, 2026).entradasMAG[0].nima, "2900000001");
  d.centro.procedenciaEntradas = "particulares";
  const e = memoriaSIRA(d, 2026).entradasMAG[0];
  assert.equal(e.razonSocial, "PARTICULARES"); assert.equal(e.t, 3.4); assert.equal(e.operacion, "R1201");
});
ok("neumáticos y stock de residuos", () => {
  const m = memoriaSIRA(base(), 2026);
  assert.equal(m.neumaticos.segundaManoUds, 6);
  assert.deepEqual(m.stockResiduos.map((s) => [s.ler, s.kgFinal]), [["13 02 08*", 40]]);
});
ok("sin salidas a fragmentadora, su % se calcula por diferencia y se avisa", () => {
  const d = base(); d.vehiculos = d.vehiculos.map((v) => ({ ...v, salida: undefined }));
  const m = memoriaSIRA(d, 2026);
  assert.equal(m.fragmentadoraPorDiferencia, true);
  const p = m.porcentajes; assert.equal(+(p.reutilizacion + p.reciclaje + p.valorizacion + p.eliminacion + p.fragmentadora).toFixed(2), 100);
});
console.log(`\n✔ ${n} pruebas de memoria SIRA y DI oficiales pasan`);
