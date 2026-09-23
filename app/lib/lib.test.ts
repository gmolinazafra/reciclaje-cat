/** Pruebas de la lógica de negocio. `npx tsx app/lib/lib.test.ts` */
import assert from "node:assert/strict";
import { clasificarPorNombre, DemoOcrProvider, camposPorTipo } from "./ocr";
import { mapeoAutomatico, parsearCSV, validarFilas } from "./importExcel";
import { buscarPeso, pesoDiccionario, taraEstimada, TARAS_INICIALES } from "./pesos";
import { DICCIONARIO_PESOS } from "./diccionarioPesos";
import { alertas, memoriaAnualTexto, resumenAnual } from "./informes";
import { datosDemo, ops } from "./repo";
import type { Venta } from "./types";

let n = 0;
const caso = (nombre: string, fn: () => void | Promise<void>) => Promise.resolve(fn()).then(() => { n++; console.log("  ✔", nombre); });

(async () => {
  await caso("clasificación por nombre: DI, baja, factura, venta, otro", () => {
    assert.equal(clasificarPorNombre("DI_aceites_marzo.pdf", "application/pdf"), "DI");
    assert.equal(clasificarPorNombre("baja_1234ABC.jpg", "image/jpeg"), "Certificado de destrucción / baja");
    assert.equal(clasificarPorNombre("factura_gestor_03.pdf", "application/pdf"), "Factura");
    assert.equal(clasificarPorNombre("ventas_marzo.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"), "Venta de piezas");
    assert.equal(clasificarPorNombre("IMG_2031.heic", "image/heic"), "Otro");
  });

  await caso("OCR demo: campos por tipo, marcado demo, no guarda; error en formato no admitido", async () => {
    const ocr = new DemoOcrProvider();
    const r = await ocr.extraer(new File(["x"], "DI_prueba.pdf", { type: "application/pdf" }));
    assert.equal(r.origen, "demo"); assert.equal(r.tipo, "DI");
    assert.deepEqual(r.campos.map((c) => c.clave), camposPorTipo("DI").map((c) => c.clave));
    assert.ok(r.campos.some((c) => c.confianza < 0.7), "hay campos de baja confianza para ejercitar la revisión");
    const e = await ocr.extraer(new File(["x"], "archivo.docx"));
    assert.ok(e.error);
    const v = await ocr.extraer(new File([], "vacio.pdf", { type: "application/pdf" }));
    assert.ok(v.error);
  });

  await caso("diccionario de pesos (pesos.xls): exacto, aproximado, mayúsculas/tildes, sin coincidencia", () => {
    const faro = DICCIONARIO_PESOS.find((a) => a.articulo === "FARO DERECHO")!;
    assert.equal(pesoDiccionario("faro derecho"), faro.kg);
    assert.equal(pesoDiccionario("Faro derecho Clio 2015"), faro.kg);
    assert.equal(pesoDiccionario("MOTOR COMPLETO"), 150);
    assert.equal(pesoDiccionario("PUERTA DELANTERA DERECHA"), 20);
    assert.equal(pesoDiccionario("Kit chuchería inexistente"), null);
    assert.ok(DICCIONARIO_PESOS.length > 1000);
    assert.ok(DICCIONARIO_PESOS.every((a) => a.kg < 200), "ningún peso volumétrico absurdo");
    assert.ok(buscarPeso("faro derecho")?.exacta);
    // corrección del usuario prevalece
    assert.equal(pesoDiccionario("FARO DERECHO", "", [{ articulo: "FARO DERECHO", kg: 3.2 }]), 3.2);
    assert.equal(buscarPeso("FARO DERECHO", "", [{ articulo: "FARO DERECHO", kg: 3.2 }])?.origen, "usuario");
  });

  await caso("taras: tabla (Clio 1050), segmento (Hilux pickup 2000), desconocido por defecto; tabla del usuario prevalece", () => {
    assert.equal(taraEstimada("Renault", "Clio").kg, 1050);
    assert.equal(taraEstimada("Renault", "Clio").origen, "tabla");
    assert.equal(taraEstimada("Toyota", "Hilux").kg, 2000);
    assert.equal(taraEstimada("Toyota", "Hilux").origen, "tabla");
    assert.ok(TARAS_INICIALES.length > 150);
    assert.equal(taraEstimada("Marca", "Rara").origen, "defecto");
    assert.equal(taraEstimada("Renault", "Clio", [{ id: "x", marca: "Renault", modelo: "Clio", tara: 999, origen: "usuario" }]).kg, 999);
  });

  await caso("residuos: peligrosos y no peligrosos nunca se mezclan en totales ni memoria", () => {
    const db = datosDemo(2026);
    const r = resumenAnual(db);
    assert.equal(r.kgPeligrosos, 800); // 320 baterías + 480 aceite
    assert.equal(r.kgNoPeligrosos, 640); // neumáticos
    assert.equal(+(r.kgPeligrosos + r.kgNoPeligrosos).toFixed(2), r.kgResiduos);
    assert.ok(r.porLER.every((x) => x.peligroso === x.ler.endsWith("*")));
    const txt = memoriaAnualTexto(db);
    assert.match(txt, /Residuos peligrosos: 800/); assert.match(txt, /Residuos no peligrosos: 640/); assert.match(txt, /Kilos gestionados piezas/);
  });

  await caso("importación CSV: mapeo automático, filas con error, pesos real/estimado/pendiente", () => {
    const csv = "Referencia;Descripcion;Cantidad;Importe;Kg\nK9K;MOTOR COMPLETO;1;650;\nX1;PUERTA DELANTERA DERECHA;2;90;44\n;;1;10;\nZZ;Chuchería inexistente;1;120;";
    const { encabezados, filas } = parsearCSV(csv);
    const m = mapeoAutomatico(encabezados);
    assert.equal(m.descripcion, "Descripcion"); assert.equal(m.cantidad, "Cantidad"); assert.equal(m.peso, "Kg"); assert.equal(m.precio, "Importe");
    const v = validarFilas(filas, m, 2026, 3);
    assert.equal(v.length, 4);
    assert.equal(v[0].venta?.origenPeso, "estimado"); assert.ok((v[0].venta?.pesoKg ?? 0) > 0);
    assert.equal(v[1].venta?.origenPeso, "real"); assert.equal(v[1].venta?.pesoKg, 44);
    assert.equal(v[2].venta, null); assert.match(v[2].errores.join(), /descripción/i);
    assert.equal(v[3].venta?.origenPeso, "pendiente");
    assert.equal(v[0].venta?.fecha, "2026-03-01");
  });

  await caso("resumen anual e informes: ventas alimentan kilos, alertas de completitud, memoria en texto", () => {
    let db = datosDemo(2026);
    const antes = resumenAnual(db);
    const venta: Venta = { id: "t1", ejercicio: 2026, fecha: "2026-05-05", mes: 5, pieza: "Radiador", referencia: "", descripcion: "Radiador", cantidad: 1, precio: 40, pesoKg: 5, origenPeso: "estimado", origen: "factura" };
    db = ops.addVentas(db, [venta]);
    const despues = resumenAnual(db);
    assert.equal(despues.kgPiezas, +(antes.kgPiezas + 5).toFixed(2));
    assert.equal(despues.porMes[4].kgPiezas, 5);
    const al = alertas(db);
    assert.ok(al.some((a) => /pendientes de revisar/.test(a)));
    assert.ok(al.some((a) => /sin DI/.test(a)));
    assert.ok(al.some((a) => /sin peso/.test(a)));
    const txt = memoriaAnualTexto(db);
    assert.match(txt, /MEMORIA ANUAL 2026/); assert.match(txt, /16 06 01\*/); assert.match(txt, /Pendiente para cerrar/);
  });

  await caso("repositorio: datos demo marcados y operaciones puras", () => {
    const db = datosDemo(2026);
    assert.ok(db.documentos.every((d) => d.demo) && db.ventas.every((v) => v.demo));
    const d2 = ops.delVenta(db, "demo-ven-1");
    assert.equal(d2.ventas.length, db.ventas.length - 1);
    assert.equal(db.ventas.length, 4, "la operación no muta el original");
  });

  console.log(`\n✔ ${n} pruebas de lógica pasan`);
})().catch((e) => { console.error(e); process.exit(1); });
