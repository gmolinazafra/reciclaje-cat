"use client";
/** Memoria anual para SIRA (Junta de Andalucía): datos, porcentajes, tablas por memoria y Excel de carga. */
import { useState } from "react";
import { memoriaSIRA } from "../../lib/memoria";
import type { FilaSIRA } from "../../lib/memoria";
import { ETIQUETA_DESTINO, infoLER } from "../../lib/ler";
import type { DestinoMemoria } from "../../lib/ler";
import { excelSIRA, NOMBRE_MEMORIA } from "../../lib/sira";
import type { TipoMemoriaSIRA } from "../../lib/sira";
import type { BaseDatos } from "../../lib/types";
import { Aviso, Boton, Chip } from "../ui";

interface Props { db: BaseDatos; set: (fn: (db: BaseDatos) => BaseDatos) => void }

const t = (kg: number) => (kg / 1000).toLocaleString("es-ES", { maximumFractionDigits: 3 }) + " t";

function descargar(nombre: string, blob: Blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = nombre; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

function Tabla({ titulo, filas, peligroso, entradas }: { titulo: string; filas: FilaSIRA[]; peligroso: boolean; entradas?: boolean }) {
  const total = filas.reduce((a, f) => a + f.kg, 0);
  return (
    <div className={"overflow-x-auto rounded-2xl border bg-white " + (peligroso ? "border-[#f2c2c2]" : "")}>
      <div className={"flex items-center justify-between px-3 py-2 text-xs font-bold " + (peligroso ? "bg-[#fffafa] text-[#9b2c2c]" : "bg-[#f7faf8] text-[#096653]")}><span>{titulo}</span><span>{t(total)}</span></div>
      {!filas.length ? <p className="px-3 py-3 text-xs text-[#657a72]">Sin registros en el ejercicio.</p> : (
        <table className="w-full min-w-[620px] text-xs">
          <thead className="text-[#567067]"><tr><th className="px-3 py-1 text-left">LER</th><th className="px-3 py-1 text-left">{entradas ? "Procedencia" : "Gestor de destino"}</th><th className="px-3 py-1 text-left">NIMA</th><th className="px-3 py-1 text-left">Inscr.</th><th className="px-3 py-1 text-left">Operación</th><th className="px-3 py-1 text-right">Cantidad</th></tr></thead>
          <tbody>{filas.map((f, i) => (
            <tr key={i} className="border-t align-top"><td className="px-3 py-1 font-bold">{f.ler}</td><td className="px-3 py-1">{f.razonSocial || "—"}<span className="block text-[#8aa39a]">{f.descripcion}</span>{f.faltan.length > 0 && <Chip tono="pendiente">falta {f.faltan.join(", ")}</Chip>}</td><td className="px-3 py-1">{f.nima || "—"}</td><td className="px-3 py-1">{f.tipoInscripcion}</td><td className="px-3 py-1">{f.operacion || "—"}</td><td className="px-3 py-1 text-right">{t(f.kg)}</td></tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );
}

export default function MemoriaSIRA({ db, set }: Props) {
  const m = memoriaSIRA(db);
  const [generando, setGenerando] = useState<string | null>(null);
  const [error, setError] = useState("");
  const p = m.porcentajes;
  const excel = async (tipo: TipoMemoriaSIRA) => {
    setGenerando(tipo); setError("");
    try { descargar(`SIRA_${tipo}_${m.ejercicio}.xlsx`, await excelSIRA(m, tipo)); } catch (e) { setError("No se ha podido generar el Excel: " + (e as Error).message); } finally { setGenerando(null); }
  };
  const lersSalida = [...new Set([...m.salidasPeligrosos, ...m.salidasNoPeligrosos].map((f) => f.ler).filter((l) => l !== "16 01 06"))];
  const barra = Math.min(100, (m.objetivoPiezas.actual / m.objetivoPiezas.objetivo) * 100);

  return (
    <div className="space-y-4">
      <Aviso tipo="info">Memoria anual del ejercicio <b>{m.ejercicio}</b> para presentar en <b>SIRA</b> (Junta de Andalucía): un CAT presenta la de gestor de peligrosos (entradas de vehículos) y las de productor de peligrosos y no peligrosos (lo enviado a gestor). Revisa los datos antes de presentarla.</Aviso>
      {m.avisos.length > 0 && <Aviso tipo="aviso"><b>Antes de presentar:</b><ul className="mt-1 list-disc pl-5">{m.avisos.map((a) => <li key={a}>{a}</li>)}</ul></Aviso>}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-4"><p className="text-xs text-[#657a72]">Vehículos tratados</p><p className="text-2xl font-bold text-[#0d7969]">{m.vehiculos.tratados}</p><p className="text-xs text-[#657a72]">{t(m.vehiculos.tratadosKg)} · entradas {m.vehiculos.entradas} · stock {m.vehiculos.stockInicial} → {m.vehiculos.stockFinal}</p><p className={"mt-1 text-xs font-bold " + (m.vehiculos.balanceOk ? "text-[#0d7969]" : "text-[#9b2c2c]")}>{m.vehiculos.balanceOk ? "✓ El balance cuadra" : "✗ El balance no cuadra"}</p></div>
        <div className="rounded-2xl border bg-white p-4 md:col-span-2">
          <p className="text-xs text-[#657a72]">Piezas para reutilización sobre el peso tratado (RD 265/2021: mínimo {m.objetivoPiezas.objetivo} %{m.ejercicio >= 2026 ? " desde 2026" : ""})</p>
          <p className={"text-2xl font-bold " + (m.objetivoPiezas.cumple ? "text-[#0d7969]" : "text-[#9b2c2c]")}>{m.objetivoPiezas.actual} %</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#eef2f0]"><div className={"h-full " + (m.objetivoPiezas.cumple ? "bg-[#0d7969]" : "bg-[#d97706]")} style={{ width: barra + "%" }} /></div>
          <p className="mt-1 text-xs text-[#657a72]">{t(m.kg.reutilizacion)} de piezas vendidas y neumáticos de segunda mano.</p>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <p className="mb-2 text-sm font-bold">Elementos y residuos extraídos del VFU (% sobre el peso tratado)</p>
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 lg:grid-cols-6">
          {([["Reutilización", p.reutilizacion], ["Reciclaje", p.reciclaje], ["Valorización energética", p.valorizacion], ["Eliminación", p.eliminacion], ["Otros gestores de VFU", p.otrosGestores], ["Fragmentadora", p.fragmentadora]] as const).map(([l, v]) => (
            <div key={l} className="rounded-xl bg-[#f7faf8] p-2"><p className="text-[11px] text-[#657a72]">{l}</p><p className="text-lg font-bold">{v} %</p>{l === "Fragmentadora" && m.fragmentadoraPorDiferencia && m.vehiculos.tratadosKg > 0 && <p className="text-[10px] text-[#9a6800]">por diferencia</p>}</div>
          ))}
        </div>
        {lersSalida.length > 0 && (
          <details className="mt-3 text-xs">
            <summary className="cursor-pointer font-bold text-[#096653]">Ajustar a qué se destina cada residuo (para los %)</summary>
            <div className="mt-2 grid gap-1 sm:grid-cols-2">{lersSalida.map((ler) => (
              <label key={ler} className="flex items-center justify-between gap-2 rounded-lg border px-2 py-1"><span><b>{ler}</b> {infoLER(ler)?.desc ?? ""}</span>
                <select className="rounded border px-1 py-1" value={(db.centro.destinoLER?.[ler] as DestinoMemoria) ?? infoLER(ler)?.destino ?? "reciclaje"} onChange={(e) => set((d) => ({ ...d, centro: { ...d.centro, destinoLER: { ...(d.centro.destinoLER ?? {}), [ler]: e.target.value } } }))}>
                  {(["reciclaje", "valorizacion", "eliminacion"] as DestinoMemoria[]).map((x) => <option key={x} value={x}>{ETIQUETA_DESTINO[x]}</option>)}
                </select></label>
            ))}</div>
          </details>
        )}
      </div>

      <Tabla titulo="Gestor de residuos peligrosos (MAG) · entradas de vehículos 16 01 04*" filas={m.entradasMAG} peligroso entradas />
      <Tabla titulo="Productor de residuos peligrosos (MAP) · enviados a gestor" filas={m.salidasPeligrosos} peligroso />
      <Tabla titulo="Productor de residuos no peligrosos (MAP) · enviados a gestor" filas={m.salidasNoPeligrosos} peligroso={false} />

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4 text-xs"><p className="mb-1 text-sm font-bold">Neumáticos (información complementaria)</p>
          <p>Segunda mano: {m.neumaticos.segundaManoUds} uds · {t(m.neumaticos.segundaManoKg)}</p><p>NFU recibidos a cambio: {m.neumaticos.aCambioUds} uds · {t(m.neumaticos.aCambioKg)}</p><p>Con certificado (art. 7.5): {m.neumaticos.certificadoUds} uds · {t(m.neumaticos.certificadoKg)}</p></div>
        <div className="rounded-2xl border bg-white p-4 text-xs"><p className="mb-1 text-sm font-bold">Stock a 31/12</p>
          <p>Vehículos sin tratar: {m.vehiculos.stockFinal} ({t(m.vehiculos.stockFinalKg)}) · año anterior {m.vehiculos.stockInicial}</p>
          {m.stockResiduos.length ? m.stockResiduos.map((s) => <p key={s.ler}>{s.ler}: {t(s.kgFinal)} (año anterior {t(s.kgInicial)})</p>) : <p className="text-[#657a72]">Sin stock de residuos registrado (Residuos → Stock a 31/12).</p>}</div>
      </div>

      {error && <Aviso tipo="error">{error}</Aviso>}
      <div className="rounded-2xl border border-[#cfe0d7] bg-[#f7faf8] p-4">
        <p className="text-sm font-bold">Excel para cargar en SIRA</p>
        <p className="mb-3 text-xs text-[#657a72]">Con las hojas y columnas de la guía de la Junta (entradas, salidas, stock e información complementaria del CAT). Incluye una hoja con los datos de vehículos tratados y los % para copiarlos en el formulario.</p>
        <div className="flex flex-wrap gap-2">{(Object.keys(NOMBRE_MEMORIA) as TipoMemoriaSIRA[]).map((k) => (
          <Boton key={k} tipo="secundario" disabled={!!generando} onClick={() => excel(k)}>{generando === k ? "Generando…" : k.replace(/-/g, " ")}</Boton>
        ))}</div>
      </div>
      <div className="rounded-2xl border bg-white p-4 text-xs text-[#567067]">
        <p className="mb-1 text-sm font-bold text-[#17372f]">Para presentarla</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>En SIRA el borrador está disponible desde el 1 de enero; los DI aceptados en destino (fase B) aparecen precargados: compáralos con estas tablas.</li>
          <li>Tasa: modelo 046, concepto 0062, una por memoria (53,44 € en 2025).</li>
          <li>Plazo: el RD 265/2021 habla del 1 de mayo, pero otras comunidades piden antes del 1 de marzo: lo prudente es presentarla antes del 1 de marzo.</li>
          <li>En el formulario de SIRA se escriben a mano el nº y peso de vehículos tratados, los % y los métodos de cálculo (están en la hoja «Formulario vehículos» del Excel).</li>
        </ul>
      </div>
    </div>
  );
}
