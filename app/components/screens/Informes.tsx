"use client";
/** Informes: memoria anual, kilos por LER y por mes; exportación TXT/CSV (el PDF llegará con backend). */
import { useState } from "react";
import { alertas, memoriaAnualTexto, resumenAnual } from "../../lib/informes";
import type { BaseDatos } from "../../lib/types";
import { Aviso, Boton, eur, kg } from "../ui";

interface Props { db: BaseDatos }

function descargar(nombre: string, contenido: string, mime = "text/plain") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([contenido], { type: mime + ";charset=utf-8" }));
  a.download = nombre; a.click();
}

export default function Informes({ db }: Props) {
  const [tipo, setTipo] = useState<"memoria" | "residuos" | "piezas" | "vehiculos">("memoria");
  const r = resumenAnual(db);
  const al = alertas(db);
  const csv = (filas: string[][]) => filas.map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");

  const exportar = () => {
    if (tipo === "memoria") return descargar(`memoria_${db.ejercicio}.txt`, memoriaAnualTexto(db));
    if (tipo === "residuos") return descargar(`residuos_${db.ejercicio}.csv`, csv([["Categoría", "LER", "Descripción", "kg"], ...r.porLER.map((x) => [x.peligroso ? "Peligroso" : "No peligroso", x.ler, x.descripcion, String(x.kg)])]), "text/csv");
    if (tipo === "piezas") return descargar(`piezas_${db.ejercicio}.csv`, csv([["Fecha", "Pieza", "Referencia", "Cantidad", "Precio", "kg", "Origen peso"], ...db.ventas.filter((v) => v.ejercicio === db.ejercicio).map((v) => [v.fecha, v.descripcion, v.referencia, String(v.cantidad), String(v.precio), String(v.pesoKg), v.origenPeso])]), "text/csv");
    return descargar(`vehiculos_${db.ejercicio}.csv`, csv([["Matrícula", "VIN", "Marca", "Modelo", "Entrada", "Estado", "kg estimado", "kg báscula", "Baja"], ...db.vehiculos.filter((v) => v.ejercicio === db.ejercicio).map((v) => [v.matricula, v.vin ?? "", v.marca, v.modelo, v.fechaEntrada, v.estado, String(v.pesoEstimadoKg), String(v.pesoBasculaKg ?? ""), v.documentoBajaId ? "sí" : "no"])]), "text/csv");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {([["memoria", "Memoria anual"], ["residuos", "Residuos por LER"], ["piezas", "Piezas vendidas"], ["vehiculos", "Vehículos"]] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTipo(k)} className={"min-h-[44px] rounded-xl px-3 text-sm font-bold " + (tipo === k ? "bg-[#0d7969] text-white" : "bg-[#e5f3ed] text-[#096653]")}>{l}</button>
        ))}
      </div>
      {al.length > 0 && <Aviso tipo="aviso">Faltan datos para cerrar el ejercicio: {al.join(" · ")}</Aviso>}
      {tipo === "memoria" && (
        <div className="grid gap-4 md:grid-cols-2">
          <pre className="overflow-auto rounded-2xl border bg-white p-4 text-xs leading-5">{memoriaAnualTexto(db)}</pre>
          <div className="space-y-2 text-sm">
            <div className="rounded-2xl border bg-white p-4"><p className="text-xs text-[#657a72]">Importe de ventas</p><p className="text-2xl font-bold text-[#0d7969]">{eur(r.importeVentas)}</p></div>
            <div className="rounded-2xl border bg-white p-4"><p className="text-xs text-[#657a72]">Kilos gestionados piezas</p><p className="text-2xl font-bold text-[#0d7969]">{kg(r.kgPiezas)}</p><p className="text-xs text-[#657a72]">reales {kg(r.kgPiezasReal)} · estimados {kg(r.kgPiezasEstimado)}</p></div>
            <div className="rounded-2xl border border-[#f2c2c2] bg-white p-4"><p className="text-xs text-[#9b2c2c]">Residuos peligrosos</p><p className="text-2xl font-bold text-[#9b2c2c]">{kg(r.kgPeligrosos)}</p></div>
            <div className="rounded-2xl border bg-white p-4"><p className="text-xs text-[#657a72]">Residuos no peligrosos</p><p className="text-2xl font-bold text-[#0d7969]">{kg(r.kgNoPeligrosos)}</p><p className="text-xs text-[#657a72]">{r.dis} DI en total</p></div>
          </div>
        </div>
      )}
      {tipo === "residuos" && (
        <div className="grid gap-4 md:grid-cols-2">
          {([["Peligrosos", true], ["No peligrosos", false]] as const).map(([t, p]) => (
            <table key={t} className={"w-full rounded-xl border bg-white text-sm " + (p ? "border-[#f2c2c2]" : "")}><thead className={"text-xs " + (p ? "bg-[#fffafa] text-[#9b2c2c]" : "bg-[#f7faf8] text-[#567067]")}><tr><th className="px-3 py-2 text-left" colSpan={2}>{t}</th><th className="px-3 py-2 text-right">{kg(p ? r.kgPeligrosos : r.kgNoPeligrosos)}</th></tr></thead>
              <tbody>{r.porLER.filter((x) => x.peligroso === p).map((x) => <tr key={x.ler} className="border-t"><td className="px-3 py-2">{x.ler}</td><td className="px-3 py-2">{x.descripcion}</td><td className="px-3 py-2 text-right">{kg(x.kg)}</td></tr>)}</tbody></table>
          ))}
        </div>
      )}
      {(tipo === "piezas" || tipo === "vehiculos") && (
        <table className="w-full rounded-xl border bg-white text-sm"><thead className="bg-[#f7faf8] text-xs text-[#567067]"><tr><th className="px-3 py-2 text-left">Mes</th><th className="px-3 py-2 text-right">{tipo === "piezas" ? "kg piezas" : "vehículos"}</th><th className="px-3 py-2 text-right">{tipo === "piezas" ? "ventas" : ""}</th></tr></thead>
          <tbody>{r.porMes.map((m) => <tr key={m.mes} className="border-t"><td className="px-3 py-2">{m.mes}</td><td className="px-3 py-2 text-right">{tipo === "piezas" ? kg(m.kgPiezas) : m.vehiculos}</td><td className="px-3 py-2 text-right">{tipo === "piezas" ? m.ventas : ""}</td></tr>)}</tbody></table>
      )}
      <div className="flex justify-end"><Boton onClick={exportar}>Descargar {tipo === "memoria" ? "memoria (TXT)" : "CSV"}</Boton></div>
      <p className="text-xs text-[#657a72]">La exportación a PDF con formato oficial llegará con el backend. Mientras tanto, TXT/CSV son importables en Excel.</p>
    </div>
  );
}
