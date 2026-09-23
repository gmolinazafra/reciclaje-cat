/** Pruebas de la lógica de negocio. `npx tsx app/lib/lib.test.ts` */
import assert from "node:assert/strict";
import { clasificarPorNombre, DemoOcrProvider, camposPorTipo } from "./ocr";
import { mapeoAutomatico, parsearCSV, validarFilas } from "./importExcel";
import { pesoDiccionario, taraEstimada } from "./pesos";
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

  await caso("diccionario de pesos: coincidencia más larga y sin coincidencia", () => {
    assert.equal(pesoDiccionario("Puerta delantera izquierda"), 22);
    assert.equal(pesoDiccionario("Motor completo 1.6"), 160);
    assert.equal(pesoDiccionario("Alternador"), 6);
    assert.equal(pesoDiccionario("Kit embrague"), null);
  });

  await caso("taras: Clio urbano, Transit furgón, desconocido por defecto", () => {
    assert.equal(taraEstimada("Renault", "Clio").kg, 950);
    assert.equal(taraEstimada("Ford", "Transit").kg, 2100);
    assert.match(taraEstimada("Marca", "Rara").segmento, /defecto/);
  });

  await caso("importación CSV: mapeo automático, filas con error, pesos real/estimado/pendiente", () => {
    const csv = "Referencia;Descripcion;Cantidad;Importe;Kg\nK9K;Motor 1.5 dCi;1;650;\nX1;Puerta delantera;2;90;44\n;;1;10;\nZZ;Kit embrague;1;120;";
    const { encabezados, filas } = parsearCSV(csv);
    const m = mapeoAutomatico(encabezados);
    assert.equal(m.descripcion, "Descripcion"); assert.equal(m.cantidad, "Cantidad"); assert.equal(m.peso, "Kg"); assert.equal(m.precio, "Importe");
    const v = validarFilas(filas, m, 2026, 3);
    assert.equal(v.length, 4);
    assert.equal(v[0].venta?.origenPeso, "estimado"); assert.equal(v[0].venta?.pesoKg, 140);
    assert.equal(v[1].venta?.origenPeso, "real"); assert.equal(v[1].venta?.pesoKg, 44);
    assert.equal(v[2].venta, null); assert.match(v[2].errores.join(), /descripción/i);
    assert.equal(v[3].venta?.origenPeso, "pendiente");
    assert.equal(v[0].venta?.fecha, "2026-03-01");
  });

  await caso("resumen anual e informes: ventas alimentan kilos, alertas de completitud, memoria en texto", () => {
    let db = datosDemo(2026);
    const antes = resumenAnual(db);
    const venta: Venta = { id: "t1", ejercicio: 2026, fecha: "2026-05-05", mes: 5, pieza: "Radiador", referencia: "", descripcion: "Radiador", cantidad: 1, precio: 40, pesoKg: 5, origenPeso: "estimado", origen: "manual" };
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
