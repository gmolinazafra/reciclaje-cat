"use client";
/** Vehículos: alta con matrícula/VIN, tara estimada editable, báscula opcional, documento de baja obligatorio. */
import { useState } from "react";
import { taraEstimada } from "../../lib/pesos";
import { ops, uid } from "../../lib/repo";
import type { BaseDatos, Documento, EstadoVehiculo, TaraVehiculo, Vehiculo } from "../../lib/types";
import { Aviso, Boton, Campo, Chip, ChipDemo, Modal, Select, Vacio, hoy, kg } from "../ui";
import { SubirDocumento } from "./Documentos";

interface Props { db: BaseDatos; set: (fn: (db: BaseDatos) => BaseDatos) => void }
const ESTADOS: EstadoVehiculo[] = ["Recibido", "Descontaminado", "Desmontado", "Compactado"];

export function AltaVehiculo({ db, set, onCerrar }: { db: BaseDatos; set: Props["set"]; onCerrar: () => void }) {
  const [f, setF] = useState({ matricula: "", vin: "", marca: "", modelo: "", fechaEntrada: hoy(), estado: "Recibido" as EstadoVehiculo, pesoEstimado: "", pesoBascula: "" });
  const [docBaja, setDocBaja] = useState<Documento | null>(null);
  const [subir, setSubir] = useState(false);
  const [ok, setOk] = useState(false);
  const u = (k: keyof typeof f, v: string) => setF({ ...f, [k]: v });
  const tara = taraEstimada(f.marca, f.modelo, db.taras);
  const pesoEstimado = parseFloat(f.pesoEstimado) || tara.kg;
  const [guardarEnTabla, setGuardarEnTabla] = useState(true);
  const valido = (f.matricula.trim() || f.vin.trim()) && f.marca.trim() && f.fechaEntrada && docBaja;

  const guardar = () => {
    if (!docBaja) return;
    const v: Vehiculo = {
      id: uid(), ejercicio: db.ejercicio, matricula: f.matricula.trim().toUpperCase(), vin: f.vin.trim().toUpperCase() || undefined, marca: f.marca.trim(), modelo: f.modelo.trim(),
      fechaEntrada: f.fechaEntrada, estado: f.estado, pesoEstimadoKg: pesoEstimado, pesoBasculaKg: parseFloat(f.pesoBascula) || undefined, documentoBajaId: docBaja.id,
    };
    set((d) => {
      let d2 = ops.addVehiculo(d, v);
      d2 = ops.updDocumento(d2, { ...docBaja, vehiculoId: v.id });
      if (guardarEnTabla && tara.origen !== "tabla" && f.marca.trim() && f.modelo.trim()) d2 = ops.addTara(d2, { id: uid(), marca: f.marca.trim(), modelo: f.modelo.trim(), tara: pesoEstimado, origen: "usuario" });
      return d2;
    });
    setOk(true); setTimeout(onCerrar, 900);
  };

  return (
    <>
      <Modal titulo="Alta de vehículo" onCerrar={onCerrar}>
        {ok ? <Aviso tipo="ok">Vehículo dado de alta y vinculado a su documento de baja.</Aviso> : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo label="Matrícula" value={f.matricula} onChange={(v) => u("matricula", v)} placeholder="1234 ABC" ayuda="Matrícula o VIN, al menos uno." />
              <Campo label="Bastidor (VIN)" value={f.vin} onChange={(v) => u("vin", v)} />
              <Campo label="Marca" value={f.marca} onChange={(v) => u("marca", v)} required />
              <Campo label="Modelo" value={f.modelo} onChange={(v) => u("modelo", v)} />
              <Campo label="Fecha de entrada" value={f.fechaEntrada} onChange={(v) => u("fechaEntrada", v)} type="date" required />
              <Select label="Estado" value={f.estado} onChange={(v) => u("estado", v)} opciones={ESTADOS} />
              <Campo label="Tara estimada (kg)" value={f.pesoEstimado || String(tara.kg)} onChange={(v) => u("pesoEstimado", v)} type="number" ayuda={`${tara.kg} kg · ${tara.detalle}. La baja no indica el peso: edítalo si lo conoces.`} />
              <Campo label="Peso de báscula (kg)" value={f.pesoBascula} onChange={(v) => u("pesoBascula", v)} type="number" ayuda="Opcional." />
            </div>
            {tara.origen !== "tabla" && f.marca.trim() && f.modelo.trim() && (
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={guardarEnTabla} onChange={(e) => setGuardarEnTabla(e.target.checked)} className="h-5 w-5" />Guardar {f.marca} {f.modelo} = {pesoEstimado} kg en la tabla de taras</label>
            )}
            <div className="rounded-xl border border-[#cfe0d7] p-3">
              <p className="text-xs font-bold text-[#567067]">Documento de baja / certificado de destrucción <span className="text-[#9b2c2c]">*</span></p>
              {docBaja ? <p className="mt-1 flex items-center gap-2 text-sm">📎 {docBaja.nombreArchivo} <Chip>{docBaja.estado}</Chip><Boton tipo="texto" onClick={() => setDocBaja(null)}>Cambiar</Boton></p>
                : <div className="mt-2"><Boton tipo="secundario" onClick={() => setSubir(true)}>Subir foto o PDF de la baja</Boton></div>}
            </div>
            <div className="flex justify-end gap-2"><Boton tipo="texto" onClick={onCerrar}>Cancelar</Boton><Boton onClick={guardar} disabled={!valido}>Guardar vehículo</Boton></div>
          </div>
        )}
      </Modal>
      {subir && <SubirDocumento db={db} set={set} onCerrar={() => setSubir(false)} onGuardado={(d) => { setDocBaja(d); const m = d.campos.find((c) => c.clave === "matricula")?.valorFinal; if (m && !f.matricula) u("matricula", m); }} />}
    </>
  );
}

export function TablaTaras({ db, set, onCerrar }: { db: BaseDatos; set: Props["set"]; onCerrar: () => void }) {
  const [q, setQ] = useState("");
  const [nueva, setNueva] = useState({ marca: "", modelo: "", tara: "" });
  const lista = db.taras.filter((t) => !q || `${t.marca} ${t.modelo}`.toLowerCase().includes(q.toLowerCase()));
  const editar = (t: TaraVehiculo, v: string) => { const n = parseFloat(v); if (n > 0) set((d) => ops.updTara(d, { ...t, tara: n, origen: "usuario" })); };
  return (
    <Modal titulo="Tabla de taras de vehículos" onCerrar={onCerrar}>
      <div className="space-y-3">
        <Aviso tipo="info">La baja no indica el peso del vehículo. Esta tabla da la tara por marca y modelo; puedes corregirla y ampliarla. Se guarda en este navegador.</Aviso>
        <div className="grid gap-2 sm:grid-cols-4">
          <Campo label="Marca" value={nueva.marca} onChange={(v) => setNueva({ ...nueva, marca: v })} />
          <Campo label="Modelo" value={nueva.modelo} onChange={(v) => setNueva({ ...nueva, modelo: v })} />
          <Campo label="Tara (kg)" value={nueva.tara} onChange={(v) => setNueva({ ...nueva, tara: v })} type="number" />
          <div className="flex items-end"><Boton onClick={() => { const t = parseFloat(nueva.tara); if (nueva.marca.trim() && nueva.modelo.trim() && t > 0) { set((d) => ops.addTara(d, { id: uid(), marca: nueva.marca.trim(), modelo: nueva.modelo.trim(), tara: t, origen: "usuario" })); setNueva({ marca: "", modelo: "", tara: "" }); } }} disabled={!(nueva.marca && nueva.modelo && parseFloat(nueva.tara) > 0)}>Añadir</Boton></div>
        </div>
        <Campo label="Buscar" value={q} onChange={setQ} placeholder="marca o modelo" />
        <div className="max-h-[50dvh] overflow-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#f7faf8] text-xs text-[#567067]"><tr><th className="px-3 py-2 text-left">Marca</th><th className="px-3 py-2 text-left">Modelo</th><th className="px-3 py-2 text-right">Tara (kg)</th><th className="px-3 py-2">Origen</th><th /></tr></thead>
            <tbody>{lista.map((t) => (
              <tr key={t.id} className="border-t"><td className="px-3 py-1">{t.marca}</td><td className="px-3 py-1">{t.modelo}</td>
                <td className="px-3 py-1 text-right"><input type="number" defaultValue={t.tara} onBlur={(e) => editar(t, e.target.value)} className="w-24 rounded-lg border border-[#cfe0d7] px-2 py-1 text-right" /></td>
                <td className="px-3 py-1 text-center"><Chip tono={t.origen === "usuario" ? "Revisado" : undefined}>{t.origen}</Chip></td>
                <td className="px-3 py-1 text-right"><button type="button" onClick={() => confirm("¿Eliminar de la tabla?") && set((d) => ops.delTara(d, t.id))} className="min-h-[36px] px-2 text-xs text-[#9b2c2c]">Eliminar</button></td></tr>
            ))}</tbody>
          </table>
        </div>
        <p className="text-xs text-[#657a72]">{db.taras.length} modelos en la tabla. Si un modelo no está, la aplicación estima por segmento (urbano, compacto, furgón…).</p>
      </div>
    </Modal>
  );
}

export default function Vehiculos({ db, set }: Props) {
  const [alta, setAlta] = useState(false);
  const [taras, setTaras] = useState(false);
  const [sel, setSel] = useState<Vehiculo | null>(null);
  const lista = db.vehiculos.filter((v) => v.ejercicio === db.ejercicio);
  const doc = (id?: string) => db.documentos.find((d) => d.id === id);
  const piezasDe = (id: string) => db.ventas.filter((v) => v.vehiculoId === id);
  const residuosDe = (id: string) => db.residuos.filter((r) => r.vehiculoId === id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[#657a72]">{lista.length} vehículo(s) · {lista.filter((v) => !v.documentoBajaId).length} sin baja</p>
        <div className="flex gap-2"><Boton tipo="secundario" onClick={() => setTaras(true)}>Tabla de taras</Boton><Boton onClick={() => setAlta(true)}>+ Vehículo</Boton></div>
      </div>
      {!lista.length ? <Vacio titulo="Sin vehículos" texto="Da de alta el primer vehículo recibido con su foto o PDF de baja." accion={<Boton onClick={() => setAlta(true)}>Alta de vehículo</Boton>} /> : (
        <div className="grid gap-2 md:grid-cols-2">
          {lista.map((v) => (
            <button key={v.id} type="button" onClick={() => setSel(v)} className="rounded-xl border bg-white p-3 text-left hover:border-[#0d7969]">
              <div className="flex items-start justify-between gap-2">
                <div><p className="text-sm font-bold">{v.matricula || v.vin} · {v.marca} {v.modelo}</p><p className="text-xs text-[#657a72]">Entrada {v.fechaEntrada} · {v.pesoBasculaKg ? `${kg(v.pesoBasculaKg)} báscula` : `${kg(v.pesoEstimadoKg)} tara estimada`}</p></div>
                <div className="flex flex-col items-end gap-1"><Chip>{v.estado}</Chip>{!v.documentoBajaId && <Chip tono="pendiente">Sin baja</Chip>}{v.demo && <ChipDemo />}</div>
              </div>
            </button>
          ))}
        </div>
      )}
      {alta && <AltaVehiculo db={db} set={set} onCerrar={() => setAlta(false)} />}
      {taras && <TablaTaras db={db} set={set} onCerrar={() => setTaras(false)} />}
      {sel && (
        <Modal titulo={`${sel.matricula || sel.vin} · ${sel.marca} ${sel.modelo}`} onCerrar={() => setSel(null)}>
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2"><Chip>{sel.estado}</Chip>{sel.demo && <ChipDemo />}</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <p><span className="text-[#657a72]">VIN:</span> {sel.vin ?? "—"}</p><p><span className="text-[#657a72]">Entrada:</span> {sel.fechaEntrada}</p>
              <p><span className="text-[#657a72]">Peso estimado:</span> {kg(sel.pesoEstimadoKg)}</p><p><span className="text-[#657a72]">Báscula:</span> {sel.pesoBasculaKg ? kg(sel.pesoBasculaKg) : "—"}</p>
            </div>
            <Select label="Cambiar estado" value={sel.estado} onChange={(v) => { const n = { ...sel, estado: v as EstadoVehiculo }; setSel(n); set((d) => ops.updVehiculo(d, n)); }} opciones={ESTADOS} />
            <div className="rounded-xl border p-3"><b>Baja:</b> {doc(sel.documentoBajaId) ? <>{doc(sel.documentoBajaId)!.nombreArchivo} <Chip>{doc(sel.documentoBajaId)!.estado}</Chip></> : <span className="text-[#9b2c2c]">sin documento de baja</span>}</div>
            <div className="rounded-xl border p-3"><b>Piezas recuperadas:</b> {piezasDe(sel.id).length ? piezasDe(sel.id).map((p) => `${p.descripcion} (${kg(p.pesoKg)})`).join(", ") : "ninguna registrada"}</div>
            <div className="rounded-xl border p-3"><b>Residuos gestionados:</b> {residuosDe(sel.id).length ? residuosDe(sel.id).map((r) => `${r.ler} ${kg(r.cantidadKg)}`).join(", ") : "ninguno vinculado"}</div>
          </div>
        </Modal>
      )}
    </div>
  );
}
