/**
 * Memoria anual en PDF (jsPDF + autotable), generada en el propio equipo.
 * Reglas: peligrosos y no peligrosos SIEMPRE en tablas y totales separados; las piezas solo como
 * «kilos gestionados piezas», sin describirlas.
 */
import { alertas, resumenAnual } from "./informes";
import { memoriaSIRA } from "./memoria";
import type { BaseDatos } from "./types";

const VERDE: [number, number, number] = [13, 121, 105];
const ROJO: [number, number, number] = [155, 44, 44];
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const kg = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 1 }) + " kg";

export async function memoriaPdf(db: BaseDatos, ejercicio = db.ejercicio): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const { autoTable } = await import("jspdf-autotable");
  const r = resumenAnual(db, ejercicio);
  const m = memoriaSIRA(db, ejercicio);
  const al = [...new Set([...alertas(db, ejercicio), ...m.avisos])];
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let y = 18;

  // Logo de ReciclaCat_Gest en la cabecera (si no se puede cargar, el PDF sale igual sin él).
  try {
    const b = await (await fetch("/logo-simbolo.png")).blob();
    const url = await new Promise<string>((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = ko; r.readAsDataURL(b); });
    doc.addImage(url, "PNG", W - 30, 8, 16, 16);
  } catch { /* sin logo */ }
  doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.setTextColor(...VERDE);
  doc.text(`Memoria anual ${ejercicio}`, 14, y);
  doc.setFontSize(11); doc.setTextColor(23, 55, 47);
  y += 7; doc.text(db.centro.nombre || "Centro", 14, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(90, 110, 104);
  y += 5; doc.text([db.centro.razonSocial, db.centro.nif ? `NIF ${db.centro.nif}` : "", db.centro.nima ? `NIMA ${db.centro.nima}` : "NIMA sin indicar", db.centro.municipio, db.centro.provincia].filter(Boolean).join(" · "), 14, y);
  doc.text(`Generada el ${new Date().toLocaleDateString("es-ES")}`, W - 14, y, { align: "right" });

  y += 8;
  autoTable(doc, {
    startY: y, theme: "grid", head: [["Resumen del ejercicio", ""]],
    body: [
      ["Vehículos recibidos", `${r.vehiculos}${r.vehiculosSinBaja ? ` (${r.vehiculosSinBaja} sin documento de baja)` : ""}`],
      ["Kilos gestionados piezas", `${kg(r.kgPiezas)}  (reales ${kg(r.kgPiezasReal)} · estimados por diccionario ${kg(r.kgPiezasEstimado)})`],
      ["Residuos peligrosos", kg(r.kgPeligrosos)],
      ["Residuos no peligrosos", kg(r.kgNoPeligrosos)],
      ["Documentos de identificación (DI)", String(r.dis)],
    ],
    headStyles: { fillColor: VERDE }, styles: { fontSize: 9.5 }, columnStyles: { 0: { fontStyle: "bold", cellWidth: 70 } },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sig = () => (doc as any).lastAutoTable.finalY + 8;
  const t = (n: number) => (n / 1000).toLocaleString("es-ES", { maximumFractionDigits: 3 }) + " t";
  const p = m.porcentajes;
  autoTable(doc, {
    startY: sig(), theme: "grid", head: [[{ content: "Vehículos tratados (formulario de SIRA)", colSpan: 2 }]],
    body: [
      ["Nº de vehículos tratados / peso total", `${m.vehiculos.tratados} · ${t(m.vehiculos.tratadosKg)}`],
      ["Balance de vehículos", `stock inicial ${m.vehiculos.stockInicial} + entradas ${m.vehiculos.entradas} = tratados ${m.vehiculos.tratados} + stock final ${m.vehiculos.stockFinal} ${m.vehiculos.balanceOk ? "(cuadra)" : "(NO CUADRA)"}`],
      ["% enviado a reutilización", `${p.reutilizacion} %  (objetivo ≥ ${m.objetivoPiezas.objetivo} % · ${m.objetivoPiezas.cumple ? "cumple" : "NO cumple"})`],
      ["% enviado a reciclaje", `${p.reciclaje} %`], ["% enviado a valorización energética", `${p.valorizacion} %`], ["% enviado a eliminación", `${p.eliminacion} %`],
      ["% enviado a otros gestores de VFU / fragmentadora", `${p.otrosGestores} % / ${p.fragmentadora} %${m.fragmentadoraPorDiferencia ? " (por diferencia)" : ""}`],
      ["Método del peso total", db.centro.metodoPeso || "Suma de tara de ficha técnica (o báscula cuando existe)"],
      ["Método de los elementos a reutilización", db.centro.metodoReutilizacion || "Kilos de piezas vendidas según facturas (diccionario de pesos y báscula)"],
    ],
    headStyles: { fillColor: VERDE }, styles: { fontSize: 9 }, columnStyles: { 0: { fontStyle: "bold", cellWidth: 70 } },
  });
  autoTable(doc, {
    startY: sig(), theme: "striped", head: [[{ content: "Entradas de vehículos · gestor de residuos peligrosos (MAG)", colSpan: 5 }], ["LER", "Procedencia", "NIMA", "Operación", { content: "Cantidad", styles: { halign: "right" } }]],
    body: m.entradasMAG.length ? m.entradasMAG.map((f) => [f.ler, f.razonSocial, f.nima, f.operacion, t(f.kg)]) : [[{ content: "Sin entradas en el ejercicio", colSpan: 5 }]],
    headStyles: { fillColor: ROJO }, styles: { fontSize: 8.5 }, columnStyles: { 4: { halign: "right" } },
  });
  const tablaSalidas = (titulo: string, peligroso: boolean) => {
    const filas = peligroso ? m.salidasPeligrosos : m.salidasNoPeligrosos;
    const total = filas.reduce((a, f) => a + f.kg, 0);
    autoTable(doc, {
      startY: sig(), theme: "striped",
      head: [[{ content: titulo, colSpan: 6 }], ["LER", "Gestor de destino", "NIMA", "Inscr.", "Operación", { content: "Cantidad", styles: { halign: "right" } }]],
      body: filas.length ? filas.map((f) => [f.ler, f.razonSocial + (f.faltan.length ? `  (falta: ${f.faltan.join(", ")})` : ""), f.nima, f.tipoInscripcion, f.operacion, t(f.kg)]) : [[{ content: "Sin registros en el ejercicio", colSpan: 6 }]],
      foot: [[{ content: "Total", colSpan: 5 }, t(total)]],
      headStyles: { fillColor: peligroso ? ROJO : VERDE }, footStyles: { fillColor: [240, 244, 242], textColor: [23, 55, 47] },
      styles: { fontSize: 8.5 }, columnStyles: { 0: { cellWidth: 22 }, 5: { halign: "right", cellWidth: 24 } },
    });
  };
  tablaSalidas("Residuos PELIGROSOS enviados a gestor · productor (MAP peligrosos)", true);
  tablaSalidas("Residuos NO PELIGROSOS enviados a gestor · productor (MAP no peligrosos)", false);
  const n = m.neumaticos;
  autoTable(doc, {
    startY: sig(), theme: "grid", head: [[{ content: "Información complementaria del CAT", colSpan: 2 }]],
    body: [
      ["Neumáticos preparados para la reutilización (segunda mano)", `${t(n.segundaManoKg)} · ${n.segundaManoUds} uds`],
      ["NFU entregados a cambio", `${t(n.aCambioKg)} · ${n.aCambioUds} uds`],
      ["Certificado de tratamiento (art. 7.5 RD 265/2021)", `${t(n.certificadoKg)} · ${n.certificadoUds} uds`],
      ["Stock de residuos a 31/12", m.stockResiduos.length ? m.stockResiduos.map((s) => `${s.ler}: ${t(s.kgFinal)}`).join(" · ") : "Sin stock registrado"],
    ],
    headStyles: { fillColor: VERDE }, styles: { fontSize: 9 }, columnStyles: { 0: { fontStyle: "bold", cellWidth: 90 } },
  });

  const meses = r.porMes.filter((m) => m.kgPiezas || m.kgResiduos || m.vehiculos);
  autoTable(doc, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    startY: (doc as any).lastAutoTable.finalY + 8, theme: "striped",
    head: [["Mes", ...["Kilos gestionados piezas", "Residuos (kg)", "Vehículos"].map((t) => ({ content: t, styles: { halign: "right" as const } }))]],
    body: meses.length ? meses.map((m) => [MESES[m.mes - 1], kg(m.kgPiezas), kg(m.kgResiduos), String(m.vehiculos)]) : [[{ content: "Sin actividad registrada", colSpan: 4 }]],
    headStyles: { fillColor: VERDE }, styles: { fontSize: 9 }, columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
  });

  if (al.length) {
    autoTable(doc, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      startY: (doc as any).lastAutoTable.finalY + 8, theme: "plain",
      head: [["Pendiente antes de presentar la memoria"]], body: al.map((a) => ["• " + a]),
      headStyles: { textColor: [146, 64, 14], fontStyle: "bold" }, styles: { fontSize: 9, textColor: [146, 64, 14] },
    });
  }

  const paginas = doc.getNumberOfPages();
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i);
    const H = doc.internal.pageSize.getHeight();
    doc.setFontSize(8); doc.setTextColor(120, 140, 132);
    doc.text("ReciclaCat_Gest · Documento de trabajo: compruebe los datos antes de presentarlos a la administración.", 14, H - 10);
    doc.text(`Página ${i} de ${paginas}`, W - 14, H - 10, { align: "right" });
    doc.text("Powered by Limonada Web", W / 2, H - 5.5, { align: "center" });
  }
  return doc.output("blob");
}
