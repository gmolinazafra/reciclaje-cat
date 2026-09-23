"use client";
/** Resumen: situación anual en bloques, alertas y accesos directos. Sin scroll innecesario. */
import { alertas, resumenAnual } from "../../lib/informes";
import type { BaseDatos } from "../../lib/types";
import { Aviso, Boton, Tarjeta, kg } from "../ui";

interface Props { db: BaseDatos; ir: (tab: number, accion?: string) => void }

export default function Resumen({ db, ir }: Props) {
  const r = resumenAnual(db);
  const al = alertas(db);
  const hayDemo = [...db.documentos, ...db.ventas, ...db.vehiculos, ...db.residuos, ...db.dis].some((x) => x.demo);
  return (
    <div className="space-y-4">
      {hayDemo && <Aviso tipo="info">Estás viendo <b>datos de demostración</b> (etiquetados DEMO). Puedes borrarlos desde Ajustes cuando empieces con datos reales.</Aviso>}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Tarjeta titulo="Vehículos recibidos" valor={r.vehiculos} nota={r.vehiculosSinBaja ? `${r.vehiculosSinBaja} sin baja` : "todos con baja"} onClick={() => ir(2)} tono={r.vehiculosSinBaja ? "aviso" : "ok"} />
        <Tarjeta titulo="Kilos gestionados piezas" valor={kg(r.kgPiezas)} nota={`${r.kgPiezasEstimado} kg por diccionario${r.kgPiezasPendiente ? ` · ${r.kgPiezasPendiente} sin peso` : ""}`} onClick={() => ir(3)} />
        <Tarjeta titulo="Residuos peligrosos / no peligrosos" valor={`${kg(r.kgPeligrosos)} / ${kg(r.kgNoPeligrosos)}`} nota={`${r.dis} DI`} onClick={() => ir(4)} />
        <Tarjeta titulo="Documentos pendientes" valor={r.documentosPendientes + r.documentosError} nota={r.documentosError ? `${r.documentosError} con error` : "de revisar"} onClick={() => ir(1)} tono={r.documentosPendientes + r.documentosError ? "aviso" : "ok"} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border bg-white p-4">
          <h3 className="text-sm font-bold text-[#567067]">Para cerrar la memoria {db.ejercicio}</h3>
          {al.length ? <ul className="mt-2 space-y-1 text-sm">{al.map((a) => <li key={a} className="flex gap-2"><span className="text-[#9a6800]">●</span>{a}</li>)}</ul> : <p className="mt-2 text-sm text-[#096653]">Todo al día.</p>}
          <div className="mt-3"><Boton tipo="secundario" onClick={() => ir(5)}>Ver informes</Boton></div>
        </section>
        <section className="rounded-2xl border bg-white p-4">
          <h3 className="text-sm font-bold text-[#567067]">Acciones rápidas</h3>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Boton tipo="secundario" onClick={() => ir(1, "subir")}>Subir documento</Boton>
            <Boton tipo="secundario" onClick={() => ir(3, "excel")}>Piezas desde Excel</Boton>
            <Boton tipo="secundario" onClick={() => ir(3, "manual")}>Línea de factura</Boton>
            <Boton tipo="secundario" onClick={() => ir(4, "di")}>Registrar DI</Boton>
          </div>
        </section>
      </div>
      <section className="rounded-2xl border bg-white p-4">
        <h3 className="text-sm font-bold text-[#567067]">Actividad por mes (kg piezas · kg residuos · vehículos)</h3>
        <div className="mt-2 grid grid-cols-4 gap-1 text-xs sm:grid-cols-6 md:grid-cols-12">
          {r.porMes.map((m) => (
            <div key={m.mes} className={"rounded-lg p-2 text-center " + (m.kgPiezas || m.kgResiduos || m.vehiculos ? "bg-[#e5f3ed]" : "bg-[#f7faf8] text-[#8aa39a]")}>
              <p className="font-bold">{["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"][m.mes - 1]}</p>
              <p>{m.kgPiezas || "–"}</p><p>{m.kgResiduos || "–"}</p><p>{m.vehiculos || "–"}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
