/* Pruebas de la doble autenticación (node escritorio/seguridad.test.cjs). */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const s = require("./seguridad.cjs");

let n = 0;
const prueba = (nombre, fn) => { fn(); n++; console.log("✓", nombre); };

// Vectores oficiales RFC 6238 (SHA-1), recortados a 6 cifras.
const SEC = s.base32(Buffer.from("12345678901234567890"));
prueba("base32 ida y vuelta", () => { assert.equal(SEC, "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"); assert.equal(s.desdeBase32(SEC).toString(), "12345678901234567890"); });
prueba("TOTP RFC 6238", () => {
  assert.equal(s.totp(SEC, 59e3), "287082");
  assert.equal(s.totp(SEC, 1111111109e3), "081804");
  assert.equal(s.totp(SEC, 1234567890e3), "005924");
  assert.equal(s.totp(SEC, 2000000000e3), "279037");
});
prueba("margen de ±30 s y no reutilización", () => {
  const t = 1111111109e3;
  const c = s.totp(SEC, t);
  assert.ok(s.verificarTotp(SEC, c, t + 25e3) >= 0);
  assert.equal(s.verificarTotp(SEC, c, t + 95e3), -1);
  const paso = s.verificarTotp(SEC, c, t);
  assert.equal(s.verificarTotp(SEC, c, t, paso), -1);
  assert.equal(s.verificarTotp(SEC, "12345", t), -1);
});
prueba("URI otpauth", () => assert.match(s.uriOtpauth(SEC, "Desguace Ejemplo"), /^otpauth:\/\/totp\/ReciclaCat_Gest:Desguace%20Ejemplo\?secret=GEZD.*issuer=ReciclaCat_Gest/));

// Flujo completo con archivo temporal y reloj simulado.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rcg-seg-"));
const archivo = path.join(dir, "seguridad.json");
let reloj = 1_800_000_000_000;
const prot = { cifrar: (t) => ({ dpapi: false, dato: Buffer.from(t).toString("base64") }), descifrar: (o) => Buffer.from(o.dato, "base64").toString(), ahora: () => reloj };
const g = s.crearGestor(archivo, prot);
let secreto, codigos;

prueba("configuración: validaciones", () => {
  assert.equal(g.estado().activa, false);
  assert.equal(g.preparar("corta", "corta").ok, false);
  assert.equal(g.preparar("contraseña-larga", "otra-distinta").ok, false);
  const r = g.preparar("contraseña-larga", "contraseña-larga", "Desguace Ejemplo");
  assert.ok(r.ok); secreto = r.secreto.replace(/\s/g, "");
  assert.equal(fs.existsSync(archivo), false, "no se guarda nada hasta confirmar");
  assert.equal(g.confirmar("000000").ok, s.totp(secreto, reloj) === "000000");
});
prueba("configuración: confirmar con código bueno", () => {
  const r = g.confirmar(s.totp(secreto, reloj), 30);
  assert.ok(r.ok); codigos = r.codigos;
  assert.equal(codigos.length, 8);
  const guardado = fs.readFileSync(archivo, "utf8");
  assert.ok(!guardado.includes("contraseña-larga") && !guardado.includes(secreto) && !guardado.includes(codigos[0]), "nada en claro");
  assert.deepEqual([g.estado().activa, g.estado().minutosBloqueo, g.estado().recuperacionRestantes], [true, 30, 8]);
});
prueba("desbloqueo con contraseña + código", () => {
  reloj += 60e3;
  assert.equal(g.comprobar("mala-clave", s.totp(secreto, reloj)).ok, false);
  assert.equal(g.comprobar("contraseña-larga", "123").ok, false);
  assert.ok(g.comprobar("contraseña-larga", s.totp(secreto, reloj)).ok);
  assert.equal(g.comprobar("contraseña-larga", s.totp(secreto, reloj)).ok, false, "el mismo código no vale dos veces");
});
prueba("código de recuperación de un solo uso", () => {
  reloj += 60e3;
  const r = g.comprobar("contraseña-larga", codigos[0].toLowerCase());
  assert.ok(r.ok && r.usadoRecuperacion && r.recuperacionRestantes === 7);
  assert.equal(g.comprobar("contraseña-larga", codigos[0]).ok, false);
});
prueba("freno tras 5 fallos", () => {
  reloj += 60e3;
  for (let i = 0; i < 5; i++) g.comprobar("mala", "000000");
  const r = g.comprobar("contraseña-larga", s.totp(secreto, reloj));
  assert.equal(r.ok, false); assert.match(r.error, /Espera/);
  reloj += 31e3;
  assert.ok(g.comprobar("contraseña-larga", s.totp(secreto, reloj)).ok);
});
prueba("nuevos códigos y desactivar", () => {
  reloj += 60e3;
  const r = g.nuevosCodigos("contraseña-larga", s.totp(secreto, reloj));
  assert.ok(r.ok); assert.equal(g.estado().recuperacionRestantes, 8);
  assert.equal(g.comprobar("contraseña-larga", codigos[1]).ok, false, "los antiguos ya no valen");
  reloj += 60e3;
  assert.equal(g.desactivar("mala", s.totp(secreto, reloj)).ok, false);
  assert.ok(g.desactivar("contraseña-larga", r.codigos[3]).ok);
  assert.equal(g.estado().activa, false);
  assert.equal(fs.existsSync(archivo), false);
});
fs.rmSync(dir, { recursive: true, force: true });
console.log(`seguridad: ${n} pruebas correctas`);
