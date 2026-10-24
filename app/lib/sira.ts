/**
 * Excel para cargar en SIRA (Junta de Andalucía), con las hojas y columnas de la guía de memoria anual de gestores:
 * Entradas, Salidas, Stock de entrada, Stock de salida e Información complementaria (solo CAT).
 * Se genera uno por memoria: gestor de peligrosos (MAG), productor de peligrosos (MAP) y productor de no peligrosos.
 */
import { lerSIRA } from "./memoria";
import type { FilaSIRA, MemoriaSIRA } from "./memoria";

export type TipoMemoriaSIRA = "MAG-peligrosos" | "MAP-peligrosos" | "MAP-no-peligrosos";

export const NOMBRE_MEMORIA: Record<TipoMemoriaSIRA, string> = {
  "MAG-peligrosos": "Memoria anual de gestor de residuos peligrosos (entradas de vehículos)",
  "MAP-peligrosos": "Memoria anual de productor de residuos peligrosos",
  "MAP-no-peligrosos": "Memoria anual de productor de residuos no peligrosos",
};

function cabecera(m: MemoriaSIRA, titulo: string): (string | number)[][] {
  const c = m.centro;
  return [
    [titulo],
    ["NIF", c.nif ?? "", "NIMA", c.nima, "Año", m.ejercicio],
    ["Empresa", c.razonSocial || c.nombre, "Centro", c.nombre, "Municipio", c.municipio ?? ""],
    [],
  ];
}

const filasEntradas = (f: FilaSIRA[]) => f.map((x) => [lerSIRA(x.ler, true), x.t, x.pais, x.operacion, x.tipoInscripcion, x.nif, x.razonSocial, x.nima, x.razonSocial, x.provincia, x.municipio]);
const filasSalidas = (f: FilaSIRA[]) => f.map((x) => [lerSIRA(x.ler, false), x.t, x.pais, x.tipoInscripcion, "", x.razonSocial, x.nima, x.razonSocial, x.operacion]);

export async function excelSIRA(m: MemoriaSIRA, tipo: TipoMemoriaSIRA): Promise<Blob> {
  const XLSX = await import("xlsx");
  const libro = XLSX.utils.book_new();
  const hoja = (nombre: string, filas: (string | number)[][], anchos: number[]) => {
    const h = XLSX.utils.aoa_to_sheet(filas);
    h["!cols"] = anchos.map((w) => ({ wch: w }));
    // NIMA como texto (10 cifras, sin perder ceros)
    XLSX.utils.book_append_sheet(libro, h, nombre.slice(0, 31));
  };
  const hEntradas = ["Código LER", "Cantidad (t)", "País", "Operación R/D", "Tipo inscripción origen", "NIF/NIE o código extranjero", "Razón social", "NIMA", "Nombre del centro", "Provincia", "Municipio"];
  const hSalidas = ["Código LER", "Cantidad (t)", "País destino", "Tipo inscripción destino", "Código extranjero", "Razón social", "NIMA destino", "Nombre del centro", "Operación R/D"];
  const titulo = NOMBRE_MEMORIA[tipo];
  const peligrosos = tipo !== "MAP-no-peligrosos";
  const salidas = peligrosos ? m.salidasPeligrosos : m.salidasNoPeligrosos;
  const stock = m.stockResiduos.filter((s) => s.peligroso === peligrosos);

  if (tipo === "MAG-peligrosos") {
    hoja("Entradas", [...cabecera(m, titulo + " · Hoja 1: Entradas"), hEntradas, ...filasEntradas(m.entradasMAG)], [12, 12, 10, 14, 22, 22, 36, 14, 36, 14, 18]);
    hoja("Salidas", [...cabecera(m, titulo + " · Hoja 2: Salidas (excepcionales en un CAT)"), hSalidas], [12, 12, 12, 22, 16, 36, 14, 36, 14]);
    hoja("Stock entrada", [...cabecera(m, titulo + " · Hoja 3: Stock de entrada"), ["Código LER", "Cantidad almacenada 31/12 (t)", "Stock 31/12 año anterior (t)"],
      ["160104*", +(m.vehiculos.stockFinalKg / 1000).toFixed(3), +(m.vehiculos.stockInicialKg / 1000).toFixed(3)]], [12, 28, 28]);
  } else {
    hoja("Salidas", [...cabecera(m, titulo + " · Residuos enviados a gestor"), hSalidas, ...filasSalidas(salidas)], [12, 12, 12, 22, 16, 36, 14, 36, 14]);
    hoja("Stock salida", [...cabecera(m, titulo + " · Stock de salida a 31/12"), ["Código LER", "Cantidad almacenada 31/12 (t)", "Stock 31/12 año anterior (t)"],
      ...stock.map((s) => [lerSIRA(s.ler, s.peligroso), +(s.kgFinal / 1000).toFixed(3), +(s.kgInicial / 1000).toFixed(3)])], [12, 28, 28]);
  }
  if (tipo !== "MAP-peligrosos") {
    const n = m.neumaticos;
    hoja("Info complementaria CAT", [...cabecera(m, titulo + " · Información complementaria (solo CAT)"),
      ["Neumáticos preparados para la reutilización"], ["País", "Provincia", "Cantidad (t)", "Unidades", "Destinatario", "Razón social", "NIF"],
      ...n.filas.filter((x) => x.tipo === "segunda_mano").map((x) => ["España", m.centro.provincia, +(x.kg / 1000).toFixed(3), x.unidades, x.tipoDestinatario === "domestico" ? "Doméstico" : "Profesional", x.destinatario, x.nif ?? ""]),
      [], ["NFU entregados a cambio", "Cantidad (t)", +(n.aCambioKg / 1000).toFixed(3), "Unidades", n.aCambioUds],
      ["Certificado de tratamiento (art. 7.5 RD 265/2021)", "Cantidad (t)", +(n.certificadoKg / 1000).toFixed(3), "Unidades", n.certificadoUds],
    ], [40, 14, 14, 12, 16, 36, 14]);
  }
  // Formulario de SIRA (vehículos tratados y %), como referencia para copiar en pantalla
  const p = m.porcentajes;
  hoja("Formulario vehículos", [...cabecera(m, "Datos de vehículos tratados (se rellenan en el formulario de SIRA)"),
    ["Nº de vehículos tratados", m.vehiculos.tratados], ["Peso total (t)", +(m.vehiculos.tratadosKg / 1000).toFixed(3)], [],
    ["% enviado a reutilización", p.reutilizacion], ["% enviado a reciclaje", p.reciclaje], ["% enviado a valorización energética", p.valorizacion], ["% enviado a eliminación", p.eliminacion], [],
    ["% enviado a otros gestores de VFU", p.otrosGestores], ["% enviado a fragmentadora", p.fragmentadora + (m.fragmentadoraPorDiferencia ? " (por diferencia)" : "")], [],
    ["Método de cálculo del peso total", m.centro.metodoPeso || "Suma de tara de ficha técnica (o báscula cuando existe)"],
    ["Método de cálculo de los elementos enviados a reutilización", m.centro.metodoReutilizacion || "Kilos de piezas vendidas según facturas (diccionario de pesos y báscula)"],
  ], [52, 60]);
  const datos = XLSX.write(libro, { type: "array", bookType: "xlsx" });
  return new Blob([datos], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
