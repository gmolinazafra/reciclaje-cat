"use client";
/** Residuos y DI: registrar residuos y DI (entrada/salida) con adjunto, vinculados a vehículo/residuo/gestor. */
import { useState } from "react";
import { ops, uid } from "../../lib/repo";
import type { BaseDatos, DI, Documento, Residuo } from "../../lib/types";
import { Aviso, Boton, Campo, Chip, ChipDemo, Modal, Select, Vacio, hoy, kg } from "../ui";
import { SubirDocumento } from "./Documentos";

interface Props { db: BaseDatos; set: (fn: (db: BaseDatos) => BaseDatos) => void; abrirDI?: boolean; onAbierto?: () => void }

/** "13 02 08* Aceites de motor usados" → { cod: "13 02 08*", desc: "Aceites de motor usados" } */
export function separarLER(s: string): { cod: string; desc: string } {
  const t = s.split(" ");
  return { cod: t.slice(0, 3).join(" "), desc: t.slice(3).join(" ") };
}

export const LER_CAT = ["13 02 08* Aceites de motor usados", "16 06 01* Baterías de plomo", "16 01 03 Neumáticos fuera de uso", "16 01 07* Filtros de aceite", "16 01 13* Líquido de frenos", "16 01 14* Anticongelante", "13 07 01* Fuel y gasóleo", "13 07 02* Gasolina", "16 01 10* Airbags", "16 01 17 Metales férreos", "16 01 18 Metales no férreos", "16 01 19 Plástico", "16 01 20 Vidrio", "16 01 06 VFU descontaminados", "16 06 05 Otras pilas y acumuladores"];

export function FormDI({ db, set, onCerrar }: { db: BaseDatos; set: Props["set"]; onCerrar: () => void }) {
  const [f, setF] = useState({ numero: "", sentido: "salida" as DI["sentido"], fecha: hoy(), ler: LER_CAT[0], cantidad: "", nimaOrigen: db.centro.nima, nimaDestino: "", gestor: "", transportista: "", vehiculoId: "", residuoId: "", crearResiduo: true });
  const [adjunto, setAdjunto] = useState<Documento | null>(null);
  const [subir, setSubir] = useState(false);
  const [ok, setOk] = useState(false);
  const u = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF({ ...f, [k]: v });
  const { cod: lerCod, desc: lerDescTxt } = separarLER(f.ler);
  const lerDesc = [lerDescTxt];
  const cantidad = parseFloat(f.cantidad.replace(",", "."));
  const valido = f.numero.trim() && f.fecha && cantidad > 0 && f.gestor.trim();

  const guardar = () => {
    const di: DI = { id: uid(), ejercicio: db.ejercicio, numero: f.numero.trim(), sentido: f.sentido, fecha: f.fecha, ler: lerCod, descripcion: lerDesc.join(" "), cantidadKg: cantidad, nimaOrigen: f.nimaOrigen, nimaDestino: f.nimaDestino, gestor: f.gestor.trim(), transportista: f.transportista.trim(), documentoId: adjunto?.id, vehiculoId: f.vehiculoId || undefined, residuoId: f.residuoId || undefined };
    set((d) => {
      let d2 = ops.addDI(d, di);
      if (f.residuoId) d2 = { ...d2, residuos: d2.residuos.map((r) => (r.id === f.residuoId ? { ...r, diId: di.id } : r)) };
      else if (f.crearResiduo && f.sentido === "salida") d2 = ops.addResiduo(d2, { id: uid(), ejercicio: db.ejercicio, fecha: f.fecha, ler: lerCod, descripcion: lerDesc.join(" "), cantidadKg: cantidad, gestor: f.gestor.trim(), diId: di.id, vehiculoId: f.vehiculoId || undefined });
      if (adjunto) d2 = ops.updDocumento(d2, { ...adjunto, diId: di.id, estado: "Guardado" });
      return d2;
    });
    setOk(true); setTimeout(onCerrar, 900);
  };
  const residuosSinDI = db.residuos.filter((r) => r.ejercicio === db.ejercicio && !r.diId);

  return (
    <>
      <Modal titulo="Registrar un DI en la app" onCerrar={onCerrar}>
        {ok ? <Aviso tipo="ok">DI guardado{f.crearResiduo && !f.residuoId && f.sentido === "salida" ? " y salida de residuo creada" : ""}.</Aviso> : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo label="Nº DI" value={f.numero} onChange={(v) => u("numero", v)} required />
              <Select label="Sentido" value={f.sentido} onChange={(v) => u("sentido", v as DI["sentido"])} opciones={["salida", "entrada"]} />
              <Campo label="Fecha" value={f.fecha} onChange={(v) => u("fecha", v)} type="date" required />
              <Select label="Código LER" value={f.ler} onChange={(v) => u("ler", v)} opciones={LER_CAT} />
              <Campo label="Cantidad (kg)" value={f.cantidad} onChange={(v) => u("cantidad", v)} type="number" step="0.1" min="0" required />
              <Campo label="Gestor" value={f.gestor} onChange={(v) => u("gestor", v)} required />
              <Campo label="NIMA origen" value={f.nimaOrigen} onChange={(v) => u("nimaOrigen", v)} />
              <Campo label="NIMA destino" value={f.nimaDestino} onChange={(v) => u("nimaDestino", v)} />
              <Campo label="Transportista" value={f.transportista} onChange={(v) => u("transportista", v)} />
              <Select label="Vehículo relacionado" value={f.vehiculoId} onChange={(v) => u("vehiculoId", v)} opciones={["", ...db.vehiculos.filter((x) => x.ejercicio === db.ejercicio).map((x) => x.id)]} />
              <Select label="Vincular a residuo ya registrado" value={f.residuoId} onChange={(v) => u("residuoId", v)} opciones={["", ...residuosSinDI.map((r) => r.id)]} />
            </div>
            {!f.residuoId && f.sentido === "salida" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.crearResiduo} onChange={(e) => u("crearResiduo", e.target.checked)} className="h-5 w-5" />Crear también la salida de residuo con estos datos</label>}
            <div className="rounded-xl border border-[#cfe0d7] p-3">
              <p className="text-xs font-bold text-[#567067]">Archivo del DI (PDF o foto)</p>
              {adjunto ? <p className="mt-1 flex items-center gap-2 text-sm">📎 {adjunto.nombreArchivo} <Chip>{adjunto.estado}</Chip><Boton tipo="texto" onClick={() => setAdjunto(null)}>Quitar</Boton></p> : <div className="mt-2"><Boton tipo="secundario" onClick={() => setSubir(true)}>Adjuntar</Boton></div>}
            </div>
            <div className="flex justify-end gap-2"><Boton tipo="texto" onClick={onCerrar}>Cancelar</Boton><Boton onClick={guardar} disabled={!valido}>Guardar DI</Boton></div>
          </div>
        )}
      </Modal>
      {subir && <SubirDocumento db={db} set={set} onCerrar={() => setSubir(false)} onGuardado={(d) => {
        setAdjunto(d);
        const g = (k: string) => d.campos.find((c) => c.clave === k)?.valorFinal ?? "";
        setF((p) => ({ ...p, numero: p.numero || g("numero"), fecha: g("fecha") || p.fecha, cantidad: p.cantidad || g("cantidadKg").replace(/[^\d.,]/g, ""), gestor: p.gestor || g("gestor"), transportista: p.transportista || g("transportista"), nimaDestino: p.nimaDestino || g("nimaDestino") }));
      }} />}
    </>
  );
}

function FormResiduo({ db, set, onCerrar }: { db: BaseDatos; set: Props["set"]; onCerrar: () => void }) {
  const [f, setF] = useState({ fecha: hoy(), ler: LER_CAT[0], cantidad: "", gestor: "", vehiculoId: "" });
  const u = (k: keyof typeof f, v: string) => setF({ ...f, [k]: v });
  const cantidad = parseFloat(f.cantidad.replace(",", "."));
  const { cod, desc: descTxt } = separarLER(f.ler);
  const desc = [descTxt];
  const guardar = () => {
    const r: Residuo = { id: uid(), ejercicio: db.ejercicio, fecha: f.fecha, ler: cod, descripcion: desc.join(" "), cantidadKg: cantidad, gestor: f.gestor.trim(), vehiculoId: f.vehiculoId || undefined };
    set((d) => ops.addResiduo(d, r)); onCerrar();
  };
  return (
    <Modal titulo="Registrar salida de residuo" onCerrar={onCerrar}>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Fecha de retirada" value={f.fecha} onChange={(v) => u("fecha", v)} type="date" required />
          <Select label="Código LER" value={f.ler} onChange={(v) => u("ler", v)} opciones={LER_CAT} />
          <Campo label="Cantidad (kg)" value={f.cantidad} onChange={(v) => u("cantidad", v)} type="number" step="0.1" required />
          <Campo label="Gestor de destino" value={f.gestor} onChange={(v) => u("gestor", v)} required />
          <Select label="Vehículo relacionado" value={f.vehiculoId} onChange={(v) => u("vehiculoId", v)} opciones={["", ...db.vehiculos.filter((x) => x.ejercicio === db.ejercicio).map((x) => x.id)]} />
        </div>
        <p className="text-xs text-[#657a72]">Podrás asociar el DI después desde «+ DI».</p>
        <div className="flex justify-end gap-2"><Boton tipo="texto" onClick={onCerrar}>Cancelar</Boton><Boton onClick={guardar} disabled={!(cantidad > 0 && f.gestor.trim())}>Guardar</Boton></div>
      </div>
    </Modal>
  );
}

export default function Residuos({ db, set, abrirDI, onAbierto }: Props) {
  const [modal, setModal] = useState<"di" | "residuo" | null>(abrirDI ? "di" : null);
  if (abrirDI && !modal) { setModal("di"); onAbierto?.(); }
  const residuos = db.residuos.filter((r) => r.ejercicio === db.ejercicio).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const dis = db.dis.filter((r) => r.ejercicio === db.ejercicio).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const total = residuos.reduce((a, r) => a + r.cantidadKg, 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border bg-white p-3"><p className="text-[11px] text-[#657a72]">Residuos gestionados</p><p className="text-xl font-bold text-[#0d7969]">{kg(total)}</p></div>
        <div className="rounded-2xl border bg-white p-3"><p className="text-[11px] text-[#657a72]">DI registrados</p><p className="text-xl font-bold">{dis.length}</p></div>
        <div className="rounded-2xl border bg-white p-3"><p className="text-[11px] text-[#657a72]">Salidas sin DI</p><p className="text-xl font-bold text-[#9a6800]">{residuos.filter((r) => !r.diId).length}</p></div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[#657a72]">Para la <b>normativa</b> del DI pregunta a SeproBot; aquí se registra el DI <b>en la app</b>.</p>
        <div className="flex gap-2"><Boton tipo="secundario" onClick={() => setModal("residuo")}>+ Residuo</Boton><Boton onClick={() => setModal("di")}>+ DI</Boton></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <section>
          <h3 className="mb-2 text-sm font-bold text-[#567067]">Salidas de residuos</h3>
          {!residuos.length ? <Vacio titulo="Sin residuos" texto="Registra la primera salida." /> : residuos.map((r) => (
            <div key={r.id} className="mb-2 flex items-center justify-between rounded-xl border bg-white p-3 text-sm">
              <div><p className="font-bold">{r.ler} · {r.descripcion}</p><p className="text-xs text-[#657a72]">{r.fecha} · {r.gestor} · {kg(r.cantidadKg)}</p></div>
              <div className="flex flex-col items-end gap-1">{r.diId ? <Chip tono="Guardado">DI</Chip> : <Chip tono="pendiente">sin DI</Chip>}{r.demo && <ChipDemo />}</div>
            </div>
          ))}
        </section>
        <section>
          <h3 className="mb-2 text-sm font-bold text-[#567067]">Documentos de identificación (DI)</h3>
          {!dis.length ? <Vacio titulo="Sin DI" texto="Registra el primer DI desde «+ DI» o desde Documentos." /> : dis.map((d) => (
            <div key={d.id} className="mb-2 flex items-center justify-between rounded-xl border bg-white p-3 text-sm">
              <div><p className="font-bold">{d.numero}</p><p className="text-xs text-[#657a72]">{d.sentido} · {d.fecha} · {d.ler} · {kg(d.cantidadKg)} · {d.gestor}</p></div>
              <div className="flex flex-col items-end gap-1">{d.documentoId && <Chip tono="Guardado">adjunto</Chip>}{d.demo && <ChipDemo />}</div>
            </div>
          ))}
        </section>
      </div>
      {modal === "di" && <FormDI db={db} set={set} onCerrar={() => setModal(null)} />}
      {modal === "residuo" && <FormResiduo db={db} set={set} onCerrar={() => setModal(null)} />}
    </div>
  );
}
