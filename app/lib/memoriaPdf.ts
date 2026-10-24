/**
 * Memoria anual en PDF (jsPDF + autotable), generada en el propio equipo.
 * Reglas: peligrosos y no peligrosos SIEMPRE en tablas y totales separados; las piezas solo como
 * «kilos gestionados piezas», sin describirlas.
 */
import { alertas, resumenAnual } from "./informes";
import type { BaseDatos } from "./types";

const VERDE: [number, number, number] = [13, 121, 105];
const ROJO: [number, number, number] = [155, 44, 44];
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const kg = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 1 }) + " kg";

export async function memoriaPdf(db: BaseDatos, ejercicio = db.ejercicio): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const { autoTable } = await import("jspdf-autotable");
  const r = resumenAnual(db, ejercicio);
  const al = alertas(db, ejercicio);
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
  y += 5; doc.text([db.centro.nima ? `NIMA ${db.centro.nima}` : "NIMA sin indicar", db.centro.provincia].filter(Boolean).join(" · "), 14, y);
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

  const tablaLER = (titulo: string, peligroso: boolean) => {
    const filas = r.porLER.filter((x) => x.peligroso === peligroso);
    const total = peligroso ? r.kgPeligrosos : r.kgNoPeligrosos;
    autoTable(doc, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      startY: (doc as any).lastAutoTable.finalY + 8, theme: "striped",
      head: [[{ content: titulo, colSpan: 3 }], ["LER", "Descripción", { content: "Cantidad", styles: { halign: "right" } }]],
      body: filas.length ? filas.map((x) => [x.ler, x.descripcion, kg(x.kg)]) : [[{ content: "Sin registros en el ejercicio", colSpan: 3 }]],
      foot: [[{ content: "Total", colSpan: 2 }, kg(total)]],
      headStyles: { fillColor: peligroso ? ROJO : VERDE }, footStyles: { fillColor: [240, 244, 242], textColor: [23, 55, 47] },
      styles: { fontSize: 9 }, columnStyles: { 0: { cellWidth: 26 }, 2: { halign: "right", cellWidth: 32 } },
    });
  };
  tablaLER("Residuos PELIGROSOS por código LER", true);
  tablaLER("Residuos NO PELIGROSOS por código LER", false);

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
