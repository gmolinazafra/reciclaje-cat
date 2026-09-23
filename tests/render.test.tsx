/** Render SSR de todas las pantallas con datos demo. `npx tsx tests/render.test.tsx` */
import { renderToString } from "react-dom/server";
import assert from "node:assert/strict";
import { datosDemo } from "../app/lib/repo";
import * as R from "../app/components/screens/Resumen";
import * as D from "../app/components/screens/Documentos";
import * as V from "../app/components/screens/Vehiculos";
import * as P from "../app/components/screens/Piezas";
import * as S from "../app/components/screens/Residuos";
import * as I from "../app/components/screens/Informes";
import * as H from "../app/page";

// Interop CJS/ESM según cómo transpile tsx: toma la función exportada por defecto.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const def = (m: any): React.ComponentType<any> => (typeof m.default === "function" ? m.default : m.default?.default ?? m);

const db = datosDemo(2026);
const set = () => {};
let n = 0;
const chk = (nombre: string, el: React.ReactElement, re: RegExp) => {
  const h = renderToString(el);
  assert.match(h, re, nombre);
  n++;
  console.log("  ✔ render", nombre, h.length, "chars");
};
const Resumen = def(R), Documentos = def(D), Vehiculos = def(V), Piezas = def(P), Residuos = def(S), Informes = def(I), Home = def(H);
chk("Resumen", <Resumen db={db} ir={() => {}} />, /DEMO/);
chk("Documentos", <Documentos db={db} set={set} />, /Pendiente de revisar/);
chk("Vehículos", <Vehiculos db={db} set={set} />, /1234 ABC/);
chk("Piezas", <Piezas db={db} set={set} />, /Importar desde Excel de facturación/);
chk("Residuos", <Residuos db={db} set={set} />, /16 06 01/);
chk("Informes", <Informes db={db} />, /MEMORIA ANUAL 2026/);
chk("Home", <Home />, /ReciclaCat_/);
console.log(`\n✔ ${n} pantallas renderizan`);
