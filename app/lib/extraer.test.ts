/** Pruebas de extracción por reglas. `npx tsx app/lib/extraer.test.ts` (datos de ejemplo inventados). */
import assert from "node:assert/strict";
import { buscarLER, buscarMatricula, buscarVIN, clasificarTexto, extraerDeTexto, lineasFactura, normalizarFecha, numeroES } from "./extraer";

let n = 0;
const ok = (nombre: string, fn: () => void) => { fn(); n++; console.log("  ✔", nombre); };
const val = (r: ReturnType<typeof extraerDeTexto>, k: string) => r.campos.find((c) => c.clave === k)?.valorFinal ?? "(no existe)";

const DI = `DOCUMENTO DE IDENTIFICACIÓN DE RESIDUOS
Nº DI: DI-2900099999-2026-0001234      Fecha de inicio del traslado: 14/03/2026
OPERADOR DEL TRASLADO  Ejemplo Desguaces S.L.  NIMA: 2900099999
INSTALACIÓN DE DESTINO  Gestor: Reciclajes Ejemplo del Sur S.A.  NIMA: 4100088888
Transportista: Transportes Ficticios S.L.
Código LER: 13 02 08*   Descripción del residuo: Aceites de motor usados
Cantidad: 1.250 kg`;

const BAJA = `CERTIFICADO DE DESTRUCCIÓN
Nº certificado: CD-2026-00456
Matrícula: 1234-BCD   Bastidor: VF1RFB00X12345678
Marca: RENAULT  CLIO
Fecha de baja: 02/02/2026`;

const FACTURA = `Desguaces Ejemplo S.L. CIF B00000000
FACTURA Nº F-2026/0123     Fecha: 05/04/2026
Cliente: Taller Inventado
Cant Concepto Importe
1 MOTOR COMPLETO 650,00 €
2 FARO DERECHO 80,00
1 PUERTA DELANTERA IZQUIERDA 90,00
1 CAJA DE CAMBIOS 250,00
1 Mano de obra 30,00
Base imponible 850,00
IVA 21% 178,50
TOTAL 1.028,50 €`;

ok("números en formato español", () => { assert.equal(numeroES("1.250"), 1250); assert.equal(numeroES("1.028,50"), 1028.5); assert.equal(numeroES("12,5"), 12.5); });
ok("fechas dd/mm/aaaa → ISO", () => { assert.equal(normalizarFecha("14/03/2026"), "2026-03-14"); assert.equal(normalizarFecha("2-2-26"), "2026-02-02"); assert.equal(normalizarFecha("31/13/2026"), ""); });
ok("LER con y sin asterisco", () => { assert.deepEqual(buscarLER("LER 160601*"), ["16 06 01*"]); assert.deepEqual(buscarLER("residuo 16 01 03 neumáticos"), ["16 01 03"]); });
ok("una fecha 14/03/2026 no se confunde con un LER", () => assert.deepEqual(buscarLER("fecha 14 03 2026"), []));
ok("matrícula actual y antigua", () => { assert.deepEqual(buscarMatricula("matrícula 1234-BCD"), { valor: "1234 BCD", fiable: true }); assert.equal(buscarMatricula("MA 1234 BC").valor, "MA-1234-BC"); });
ok("matrícula con vocales no vale (formato actual)", () => assert.equal(buscarMatricula("1234 ABC").fiable, false));
ok("VIN de 17 caracteres", () => assert.equal(buscarVIN("Bastidor: VF1RFB00X12345678"), "VF1RFB00X12345678"));
ok("clasifica por contenido", () => { assert.equal(clasificarTexto(DI), "DI"); assert.equal(clasificarTexto(BAJA), "Certificado de destrucción / baja"); assert.equal(clasificarTexto(FACTURA), "Factura"); });

ok("DI: número, fecha, LER, kg, NIMA origen/destino, gestor, transportista", () => {
  const r = extraerDeTexto(DI);
  assert.equal(r.tipo, "DI");
  assert.match(val(r, "numero"), /^DI-2900099999/);
  assert.equal(val(r, "fecha"), "2026-03-14");
  assert.equal(val(r, "ler"), "13 02 08*");
  assert.equal(val(r, "cantidadKg"), "1250");
  assert.equal(val(r, "nimaOrigen"), "2900099999");
  assert.equal(val(r, "nimaDestino"), "4100088888");
  assert.match(val(r, "gestor"), /Reciclajes Ejemplo/);
  assert.match(val(r, "transportista"), /Transportes Ficticios/);
  assert.match(val(r, "descripcion"), /Aceites/);
});

ok("baja: matrícula, VIN, marca, modelo, fecha, nº certificado", () => {
  const r = extraerDeTexto(BAJA);
  assert.equal(val(r, "matricula"), "1234 BCD");
  assert.equal(val(r, "vin"), "VF1RFB00X12345678");
  assert.equal(val(r, "marca"), "Renault");
  assert.equal(val(r, "modelo"), "Clio");
  assert.equal(val(r, "fecha"), "2026-02-02");
  assert.equal(val(r, "numeroCertificado"), "CD-2026-00456");
});

ok("factura: número, fecha, emisor, total", () => {
  const r = extraerDeTexto(FACTURA);
  assert.equal(val(r, "numero"), "F-2026/0123");
  assert.equal(val(r, "fecha"), "2026-04-05");
  assert.equal(val(r, "emisor"), "Desguaces Ejemplo S.L.");
  assert.equal(val(r, "importe"), "1028.5");
});

ok("factura: líneas de piezas con kilos del diccionario (sin mano de obra ni totales)", () => {
  const l = lineasFactura(FACTURA);
  assert.equal(l.length, 4, JSON.stringify(l));
  const motor = l.find((x) => /MOTOR/.test(x.pieza))!;
  assert.equal(motor.cantidad, 1); assert.ok(motor.kg > 50); assert.equal(motor.exacta, true);
  assert.ok(l.some((x) => x.articulo === "CAJA CAMBIOS"), "«caja de cambios» = «CAJA CAMBIOS»");
  const faro = l.find((x) => /FARO/.test(x.pieza))!;
  assert.equal(faro.cantidad, 2); assert.equal(faro.kg, +(faro.kgUnidad * 2).toFixed(2)); assert.equal(faro.importe, 80);
  assert.ok(!l.some((x) => /mano de obra|total|iva/i.test(x.pieza)));
});

ok("OCR de baja calidad baja la confianza", () => {
  const alta = extraerDeTexto(DI).campos.find((c) => c.clave === "ler")!.confianza;
  const baja = extraerDeTexto(DI, { calidad: 0.5 }).campos.find((c) => c.clave === "ler")!.confianza;
  assert.ok(baja < 0.7 && alta >= 0.85, `${alta} / ${baja}`);
});

ok("campos no encontrados quedan vacíos con confianza 0 (se resaltan)", () => {
  const r = extraerDeTexto("Documento sin datos útiles", { tipo: "DI" });
  assert.ok(r.campos.every((c) => c.valorFinal === "" ? c.confianza === 0 : true));
  assert.equal(val(r, "ler"), "");
});

console.log(`\n✔ ${n} pruebas de extracción pasan`);
