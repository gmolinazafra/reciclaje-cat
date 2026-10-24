"use client";
/** Residuos y DI: registrar residuos y DI (entrada/salida) con adjunto, vinculados a vehículo/residuo/gestor. */
import { useState } from "react";
import { ops, uid } from "../../lib/repo";
import { esPeligroso } from "../../lib/types";
import type { BaseDatos, DI, Documento, Residuo } from "../../lib/types";
import { Aviso, Boton, Campo, Chip, ChipDemo, Modal, Select, Vacio, hoy, kg } from "../ui";
import { SubirDocumento } from "./Documentos";
import { CATALOGO_LER, DESC_INSCRIPCION, TIPOS_INSCRIPCION, infoLER, operacion4 } from "../../lib/ler";
import type { MovimientoNeumaticos } from "../../lib/types";

interface Props { db: BaseDatos; set: (fn: (db: BaseDatos) => BaseDatos) => void; abrirDI?: boolean; onAbierto?: () => void }

/** "13 02 08* Aceites de motor usados" → { cod: "13 02 08*", desc: "Aceites de motor usados" } */
export function separarLER(s: string): { cod: string; desc: string } {
  const t = s.split(" ");
  return { cod: t.slice(0, 3).join(" "), desc: t.slice(3).join(" ") };
}

/** Códigos del catálogo (sin los de vehículos, que se gestionan en «Vehículos»). */
const DEL_CATALOGO = CATALOGO_LER.filter((c) => !["16 01 04*", "16 01 06"].includes(c.cod)).map((c) => `${c.cod} ${c.desc}`);
export const LER_PELIGROSOS = DEL_CATALOGO.filter((x) => separarLER(x).cod.endsWith("*"));
export const LER_NO_PELIGROSOS = DEL_CATALOGO.filter((x) => !separarLER(x).cod.endsWith("*"));
export const LER_CAT = [...LER_PELIGROSOS, ...LER_NO_PELIGROSOS];

export function FormDI({ db, set, onCerrar }: { db: BaseDatos; set: Props["set"]; onCerrar: () => void }) {
  const [categoria, setCategoria] = useState<"Peligroso" | "No peligroso">("Peligroso");
  const [f, setF] = useState({ numero: "", sentido: "salida" as DI["sentido"], fecha: hoy(), ler: LER_PELIGROSOS[0], cantidad: "", nimaOrigen: db.centro.nima, nimaDestino: "", gestor: "", transportista: "", vehiculoId: "", residuoId: "", crearResiduo: true, nifDestino: "", operacion: "", tipoInscripcion: "", municipioDestino: "" });
  const [adjunto, setAdjunto] = useState<Documento | null>(null);
  const [subir, setSubir] = useState(false);
  const [ok, setOk] = useState(false);
  const u = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF({ ...f, [k]: v });
  const { cod: lerCod, desc: lerDescTxt } = separarLER(f.ler);
  const lerDesc = [lerDescTxt];
  const cantidad = parseFloat(f.cantidad.replace(",", "."));
  const valido = f.numero.trim() && f.fecha && cantidad > 0 && f.gestor.trim();

  const guardar = () => {
    const di: DI = { id: uid(), ejercicio: parseInt(f.fecha.slice(0, 4), 10) || db.ejercicio, numero: f.numero.trim(), sentido: f.sentido, fecha: f.fecha, ler: lerCod, descripcion: lerDesc.join(" "), cantidadKg: cantidad, nimaOrigen: f.nimaOrigen, nimaDestino: f.nimaDestino, gestor: f.gestor.trim(), transportista: f.transportista.trim(), documentoId: adjunto?.id, vehiculoId: f.vehiculoId || undefined, residuoId: f.residuoId || undefined,
      nifDestino: f.nifDestino.trim().toUpperCase() || undefined, operacionDestino: operacion4(f.operacion || infoLER(lerCod)?.operacion || ""), tipoInscripcionDestino: (f.tipoInscripcion || (lerCod.endsWith("*") ? "G01" : "G02")).slice(0, 3), municipioDestino: f.municipioDestino.trim() || undefined };
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
              <Select label="Categoría del residuo" value={categoria} onChange={(v) => { const c = v as typeof categoria; setCategoria(c); u("ler", c === "Peligroso" ? LER_PELIGROSOS[0] : LER_NO_PELIGROSOS[0]); }} opciones={["Peligroso", "No peligroso"]} />
              <Select label="Código LER" value={f.ler} onChange={(v) => u("ler", v)} opciones={categoria === "Peligroso" ? LER_PELIGROSOS : LER_NO_PELIGROSOS} />
              <Campo label="Cantidad (kg)" value={f.cantidad} onChange={(v) => u("cantidad", v)} type="number" step="0.1" min="0" required />
              <Campo label="Gestor" value={f.gestor} onChange={(v) => u("gestor", v)} required />
              <Campo label="NIMA origen" value={f.nimaOrigen} onChange={(v) => u("nimaOrigen", v)} />
              <Campo label="NIMA destino" value={f.nimaDestino} onChange={(v) => u("nimaDestino", v)} />
              <Campo label="NIF del gestor" value={f.nifDestino} onChange={(v) => u("nifDestino", v)} />
              <Campo label="Operación en destino (R/D)" value={f.operacion || infoLER(lerCod)?.operacion || ""} onChange={(v) => u("operacion", v)} ayuda="Para la memoria. Habitual: R1301." />
              <Select label="Tipo de inscripción del destino" value={f.tipoInscripcion || (lerCod.endsWith("*") ? "G01" : "G02")} onChange={(v) => u("tipoInscripcion", v)} opciones={TIPOS_INSCRIPCION.filter((x) => x.startsWith("G"))} />
              <Campo label="Municipio del gestor" value={f.municipioDestino} onChange={(v) => u("municipioDestino", v)} />
              <Campo label="Transportista" value={f.transportista} onChange={(v) => u("transportista", v)} />
              <Select label="Vehículo relacionado" value={f.vehiculoId} onChange={(v) => u("vehiculoId", v)} opciones={["", ...db.vehiculos.filter((x) => x.ejercicio === db.ejercicio).map((x) => x.id)]} />
              <Select label="Vincular a residuo ya registrado" value={f.residuoId} onChange={(v) => u("residuoId", v)} opciones={["", ...residuosSinDI.filter((r) => esPeligroso(r.ler) === (categoria === "Peligroso")).map((r) => r.id)]} />
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
        setF((p) => ({ ...p, numero: p.numero || g("numero"), fecha: g("fecha") || p.fecha, cantidad: p.cantidad || g("cantidadKg").replace(/[^\d.,]/g, ""), gestor: p.gestor || g("gestor"), transportista: p.transportista || g("transportista"), nimaDestino: p.nimaDestino || g("nimaDestino"), nifDestino: p.nifDestino || g("nifDestino"), operacion: p.operacion || g("operacionDestino"), municipioDestino: p.municipioDestino || g("municipioDestino") }));
      }} />}
    </>
  );
}

function FormResiduo({ db, set, onCerrar }: { db: BaseDatos; set: Props["set"]; onCerrar: () => void }) {
  const [categoria, setCategoria] = useState<"Peligroso" | "No peligroso">("Peligroso");
  const [f, setF] = useState({ fecha: hoy(), ler: LER_PELIGROSOS[0], cantidad: "", gestor: "", vehiculoId: "" });
  const [adjunto, setAdjunto] = useState<Documento | null>(null);
  const [subir, setSubir] = useState(false);
  const u = (k: keyof typeof f, v: string) => setF({ ...f, [k]: v });
  const cantidad = parseFloat(f.cantidad.replace(",", "."));
  const { cod, desc: descTxt } = separarLER(f.ler);
  const desc = [descTxt];
  const guardar = () => {
    const r: Residuo = { id: uid(), ejercicio: db.ejercicio, fecha: f.fecha, ler: cod, descripcion: desc.join(" "), cantidadKg: cantidad, gestor: f.gestor.trim(), vehiculoId: f.vehiculoId || undefined, documentoId: adjunto?.id };
    set((d) => { let d2 = ops.addResiduo(d, r); if (adjunto) d2 = ops.updDocumento(d2, { ...adjunto, notas: adjunto.notas, estado: "Guardado" }); return d2; }); onCerrar();
  };
  return (
    <>
    <Modal titulo="Registrar salida de residuo" onCerrar={onCerrar}>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Fecha de retirada" value={f.fecha} onChange={(v) => u("fecha", v)} type="date" required />
          <Select label="Categoría del residuo" value={categoria} onChange={(v) => { const c = v as typeof categoria; setCategoria(c); u("ler", c === "Peligroso" ? LER_PELIGROSOS[0] : LER_NO_PELIGROSOS[0]); }} opciones={["Peligroso", "No peligroso"]} />
          <Select label="Código LER" value={f.ler} onChange={(v) => u("ler", v)} opciones={categoria === "Peligroso" ? LER_PELIGROSOS : LER_NO_PELIGROSOS} />
          <Campo label="Cantidad (kg)" value={f.cantidad} onChange={(v) => u("cantidad", v)} type="number" step="0.1" required />
          <Campo label="Gestor de destino" value={f.gestor} onChange={(v) => u("gestor", v)} required />
          <Select label="Vehículo relacionado" value={f.vehiculoId} onChange={(v) => u("vehiculoId", v)} opciones={["", ...db.vehiculos.filter((x) => x.ejercicio === db.ejercicio).map((x) => x.id)]} />
        </div>
        <div className="rounded-xl border border-[#cfe0d7] p-3">
          <p className="text-xs font-bold text-[#567067]">Documento (albarán, contrato, factura…)</p>
          {adjunto ? <p className="mt-1 flex items-center gap-2 text-sm">📎 {adjunto.nombreArchivo} <Chip>{adjunto.estado}</Chip><Boton tipo="texto" onClick={() => setAdjunto(null)}>Quitar</Boton></p> : <div className="mt-2"><Boton tipo="secundario" onClick={() => setSubir(true)}>Adjuntar</Boton></div>}
        </div>
        <p className="text-xs text-[#657a72]">Podrás asociar el DI después desde «+ DI».</p>
        <div className="flex justify-end gap-2"><Boton tipo="texto" onClick={onCerrar}>Cancelar</Boton><Boton onClick={guardar} disabled={!(cantidad > 0 && f.gestor.trim())}>Guardar</Boton></div>
      </div>
    </Modal>
    {subir && <SubirDocumento db={db} set={set} onCerrar={() => setSubir(false)} onGuardado={setAdjunto} />}
    </>
  );
}

const TIPO_NEUM: Record<MovimientoNeumaticos["tipo"], string> = { segunda_mano: "Vendidos de segunda mano (preparados para reutilización)", nfu_a_cambio: "NFU recibidos a cambio de los vendidos", certificado_7_5: "Entregados a gestor con certificado (art. 7.5)" };

function FormNeumaticos({ db, set, onCerrar }: { db: BaseDatos; set: Props["set"]; onCerrar: () => void }) {
  const [f, setF] = useState({ tipo: "segunda_mano" as MovimientoNeumaticos["tipo"], fecha: hoy(), kg: "", unidades: "", destinatario: "", nif: "", nima: "", tipoDestinatario: "profesional" });
  const u = (k: keyof typeof f, v: string) => setF({ ...f, [k]: v });
  const kgN = parseFloat(f.kg.replace(",", ".")) || 0; const uds = parseInt(f.unidades, 10) || 0;
  const guardar = () => { set((d) => ops.addNeumaticos(d, { id: uid(), ejercicio: parseInt(f.fecha.slice(0, 4), 10) || db.ejercicio, fecha: f.fecha, tipo: f.tipo, kg: kgN, unidades: uds, destinatario: f.destinatario.trim(), nif: f.nif.trim().toUpperCase() || undefined, nima: f.nima.trim() || undefined, tipoDestinatario: f.tipoDestinatario as "profesional" | "domestico" })); onCerrar(); };
  return (
    <Modal titulo="Neumáticos · información complementaria del CAT" onCerrar={onCerrar}>
      <div className="space-y-3">
        <Aviso tipo="info">La memoria pide los neumáticos preparados para reutilización y vendidos de segunda mano, los neumáticos fuera de uso recibidos a cambio y los entregados con certificado (RD 265/2021, art. 7.5 y 11). Los vendidos de segunda mano cuentan como reutilización.</Aviso>
        <Select label="Tipo" value={TIPO_NEUM[f.tipo]} onChange={(v) => u("tipo", (Object.keys(TIPO_NEUM) as MovimientoNeumaticos["tipo"][]).find((k) => TIPO_NEUM[k] === v) ?? "segunda_mano")} opciones={Object.values(TIPO_NEUM)} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Fecha" value={f.fecha} onChange={(v) => u("fecha", v)} type="date" required />
          <Campo label="Unidades" value={f.unidades} onChange={(v) => u("unidades", v)} type="number" required />
          <Campo label="Peso (kg)" value={f.kg} onChange={(v) => u("kg", v)} type="number" step="0.1" required ayuda="Un neumático de turismo pesa unos 7-9 kg." />
          <Campo label={f.tipo === "certificado_7_5" ? "Gestor de neumáticos" : f.tipo === "nfu_a_cambio" ? "Entregados por" : "Comprador"} value={f.destinatario} onChange={(v) => u("destinatario", v)} />
          <Campo label="NIF" value={f.nif} onChange={(v) => u("nif", v)} />
          {f.tipo === "certificado_7_5" ? <Campo label="NIMA del gestor" value={f.nima} onChange={(v) => u("nima", v)} /> : f.tipo === "segunda_mano" ? <Select label="Destinatario" value={f.tipoDestinatario} onChange={(v) => u("tipoDestinatario", v)} opciones={["profesional", "domestico"]} /> : null}
        </div>
        <div className="flex justify-end gap-2"><Boton tipo="texto" onClick={onCerrar}>Cancelar</Boton><Boton onClick={guardar} disabled={!(kgN > 0 && uds > 0)}>Guardar</Boton></div>
      </div>
    </Modal>
  );
}

function StockResiduos({ db, set, onCerrar }: { db: BaseDatos; set: Props["set"]; onCerrar: () => void }) {
  const e = db.ejercicio;
  const actuales = Object.fromEntries((db.stocks ?? []).filter((x) => x.ejercicio === e).map((x) => [x.ler, String(x.kg)]));
  const [vals, setVals] = useState<Record<string, string>>(actuales);
  const guardar = () => { set((d) => Object.entries(vals).reduce((acc, [ler, v]) => ops.setStock(acc, e, ler, parseFloat(String(v).replace(",", ".")) || 0), d)); onCerrar(); };
  return (
    <Modal titulo={`Stock de residuos a 31/12/${e}`} onCerrar={onCerrar}>
      <div className="space-y-3">
        <Aviso tipo="info">Lo que quedaba almacenado en el centro el 31 de diciembre, sin entregar a gestor. La memoria lo pide (y el del año anterior, que se toma de lo que guardaste el año pasado).</Aviso>
        <div className="max-h-[55dvh] space-y-1 overflow-auto">
          {[...LER_PELIGROSOS, ...LER_NO_PELIGROSOS].map((x) => { const { cod, desc } = separarLER(x); return (
            <label key={cod} className="grid grid-cols-[1fr_110px] items-center gap-2 rounded-lg border bg-white px-2 py-1 text-xs">
              <span><b className={cod.endsWith("*") ? "text-[#9b2c2c]" : "text-[#0d7969]"}>{cod}</b> {desc}</span>
              <input type="number" min={0} step="0.1" placeholder="kg" value={vals[cod] ?? ""} onChange={(ev) => setVals({ ...vals, [cod]: ev.target.value })} className="min-h-[36px] rounded-lg border border-[#cfe0d7] px-2 text-right" />
            </label>
          ); })}
        </div>
        <div className="flex justify-end gap-2"><Boton tipo="texto" onClick={onCerrar}>Cancelar</Boton><Boton onClick={guardar}>Guardar stock</Boton></div>
      </div>
    </Modal>
  );
}

export default function Residuos({ db, set, abrirDI, onAbierto }: Props) {
  const [modal, setModal] = useState<"di" | "residuo" | "neumaticos" | "stock" | null>(abrirDI ? "di" : null);
  if (abrirDI && !modal) { setModal("di"); onAbierto?.(); }
  const residuos = db.residuos.filter((r) => r.ejercicio === db.ejercicio).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const dis = db.dis.filter((r) => r.ejercicio === db.ejercicio).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const pel = residuos.filter((r) => esPeligroso(r.ler));
  const nop = residuos.filter((r) => !esPeligroso(r.ler));
  const suma = (a: Residuo[]) => a.reduce((x, r) => x + r.cantidadKg, 0);
  const disPel = dis.filter((d) => esPeligroso(d.ler));
  const disNop = dis.filter((d) => !esPeligroso(d.ler));
  const Fila = ({ r }: { r: Residuo }) => (
    <div className="mb-2 flex items-center justify-between rounded-xl border bg-white p-3 text-sm">
      <div><p className="font-bold">{r.ler} · {r.descripcion}</p><p className="text-xs text-[#657a72]">{r.fecha} · {r.gestor} · {kg(r.cantidadKg)}</p></div>
      <div className="flex flex-col items-end gap-1">{r.diId ? <Chip tono="Guardado">DI</Chip> : <Chip tono="pendiente">sin DI</Chip>}{r.documentoId && <Chip tono="Revisado">doc</Chip>}{r.vehiculoId && <Chip>vehículo</Chip>}{r.demo && <ChipDemo />}</div>
    </div>
  );
  const FilaDI = ({ d }: { d: DI }) => (
    <div className="mb-2 flex items-center justify-between rounded-xl border bg-white p-3 text-sm">
      <div className="min-w-0"><p className="truncate font-bold">{d.numero}</p><p className="text-xs text-[#657a72]">{d.sentido} · {d.fecha} · {d.ler} · {kg(d.cantidadKg)} · {d.gestor}{d.nimaDestino ? ` · NIMA ${d.nimaDestino}` : ""}{d.operacionDestino ? ` · ${d.operacionDestino}` : ""}</p></div>
      <div className="flex shrink-0 flex-col items-end gap-1">{d.documentoId && <Chip tono="Guardado">adjunto</Chip>}{(!d.nimaDestino || !d.operacionDestino) && <Chip tono="pendiente">faltan datos memoria</Chip>}{d.demo && <ChipDemo />}<button type="button" className="text-[11px] text-[#9b2c2c] underline" onClick={() => confirm("¿Eliminar este DI? La salida de residuo se conserva sin DI.") && set((x) => ops.delDI(x, d.id))}>Eliminar</button></div>
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-2xl border border-[#f2c2c2] bg-white p-3"><p className="text-[11px] font-bold text-[#9b2c2c]">⚠ Peligrosos</p><p className="text-xl font-bold text-[#9b2c2c]">{kg(suma(pel))}</p><p className="text-[11px] text-[#657a72]">{disPel.length} DI · {pel.filter((r) => !r.diId).length} sin DI</p></div>
        <div className="rounded-2xl border bg-white p-3"><p className="text-[11px] font-bold text-[#096653]">No peligrosos</p><p className="text-xl font-bold text-[#0d7969]">{kg(suma(nop))}</p><p className="text-[11px] text-[#657a72]">{disNop.length} DI · {nop.filter((r) => !r.diId).length} sin DI</p></div>
        <div className="rounded-2xl border bg-white p-3"><p className="text-[11px] text-[#657a72]">DI registrados</p><p className="text-xl font-bold">{dis.length}</p></div>
        <div className="rounded-2xl border bg-white p-3"><p className="text-[11px] text-[#657a72]">Salidas sin DI</p><p className="text-xl font-bold text-[#9a6800]">{residuos.filter((r) => !r.diId).length}</p></div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[#657a72]">Peligrosos (LER con *) y no peligrosos se registran, cuentan e informan por separado. Para la <b>normativa</b> del DI pregunta a SeproBot.</p>
        <div className="flex flex-wrap gap-2"><Boton tipo="texto" onClick={() => setModal("stock")}>Stock a 31/12</Boton><Boton tipo="secundario" onClick={() => setModal("neumaticos")}>+ Neumáticos</Boton><Boton tipo="secundario" onClick={() => setModal("residuo")}>+ Residuo</Boton><Boton onClick={() => setModal("di")}>+ DI</Boton></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-[#f2c2c2] bg-[#fffafa] p-3">
          <h3 className="mb-2 text-sm font-bold text-[#9b2c2c]">⚠ Residuos peligrosos</h3>
          {!pel.length ? <Vacio titulo="Sin residuos peligrosos" texto="Aceites, baterías, filtros, líquidos…" /> : pel.map((r) => <Fila key={r.id} r={r} />)}
          <h4 className="mb-1 mt-3 text-xs font-bold text-[#567067]">DI de peligrosos</h4>
          {!disPel.length ? <p className="text-xs text-[#657a72]">Ninguno.</p> : disPel.map((d) => <FilaDI key={d.id} d={d} />)}
        </section>
        <section className="rounded-2xl border bg-[#f7faf8] p-3">
          <h3 className="mb-2 text-sm font-bold text-[#096653]">Residuos no peligrosos</h3>
          {!nop.length ? <Vacio titulo="Sin residuos no peligrosos" texto="Neumáticos, metales, plástico, vidrio…" /> : nop.map((r) => <Fila key={r.id} r={r} />)}
          <h4 className="mb-1 mt-3 text-xs font-bold text-[#567067]">DI de no peligrosos</h4>
          {!disNop.length ? <p className="text-xs text-[#657a72]">Ninguno.</p> : disNop.map((d) => <FilaDI key={d.id} d={d} />)}
        </section>
      </div>
      <section className="rounded-2xl border bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold">Neumáticos (información complementaria del CAT)</h3><Boton tipo="texto" onClick={() => setModal("neumaticos")}>+ Añadir</Boton></div>
        {!(db.neumaticos ?? []).filter((n) => n.ejercicio === db.ejercicio).length ? <p className="mt-1 text-xs text-[#657a72]">Sin movimientos. Registra aquí los neumáticos vendidos de segunda mano, los NFU recibidos a cambio y los entregados con certificado.</p> : (
          <div className="mt-2 space-y-1">{(db.neumaticos ?? []).filter((n) => n.ejercicio === db.ejercicio).map((n) => (
            <div key={n.id} className="flex items-center justify-between rounded-lg border px-2 py-1 text-xs"><span>{n.fecha} · {TIPO_NEUM[n.tipo]} · {n.unidades} uds · {kg(n.kg)}{n.destinatario ? ` · ${n.destinatario}` : ""}</span><button type="button" className="text-[#9b2c2c] underline" onClick={() => set((x) => ops.delNeumaticos(x, n.id))}>Eliminar</button></div>
          ))}</div>
        )}
      </section>
      {modal === "neumaticos" && <FormNeumaticos db={db} set={set} onCerrar={() => setModal(null)} />}
      {modal === "stock" && <StockResiduos db={db} set={set} onCerrar={() => setModal(null)} />}
      {modal === "di" && <FormDI db={db} set={set} onCerrar={() => setModal(null)} />}
      {modal === "residuo" && <FormResiduo db={db} set={set} onCerrar={() => setModal(null)} />}
    </div>
  );
}
