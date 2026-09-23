"use client";
/** Documentos: subir/foto → OCR → revisión → corregir → guardar. Nunca guarda sin revisión. */
import { useRef, useState } from "react";
import { camposPorTipo, extensionAdmitida, getOcrProvider, EXTENSIONES_ADMITIDAS } from "../../lib/ocr";
import { ops, uid } from "../../lib/repo";
import { TIPOS_DOCUMENTO } from "../../lib/types";
import type { BaseDatos, CampoDetectado, Documento, TipoDocumento } from "../../lib/types";
import { documentosPorEstado } from "../../lib/informes";
import { Aviso, Boton, Campo, Cargando, Chip, ChipDemo, Modal, Select, Vacio } from "../ui";

interface Props { db: BaseDatos; set: (fn: (db: BaseDatos) => BaseDatos) => void; abrirSubida?: boolean; onSubidaAbierta?: () => void }

export function SubirDocumento({ db, set, onCerrar, onGuardado }: { db: BaseDatos; set: Props["set"]; onCerrar: () => void; onGuardado?: (d: Documento) => void }) {
  const [fase, setFase] = useState<"elegir" | "leyendo" | "revisar" | "error">("elegir");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [doc, setDoc] = useState<Documento | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const ocr = getOcrProvider();

  const procesar = async (f: File) => {
    setArchivo(f);
    if (!extensionAdmitida(f.name)) { setError(`Formato no admitido. Admitidos: ${EXTENSIONES_ADMITIDAS.join(", ")}`); setFase("error"); return; }
    setFase("leyendo");
    const r = await ocr.extraer(f);
    const base: Documento = {
      id: uid(), ejercicio: db.ejercicio, nombreArchivo: f.name, mime: f.type || "application/octet-stream", tamano: f.size,
      fechaSubida: new Date().toISOString(), usuario: db.centro.usuario, tipo: r.tipo, campos: r.campos, origenOCR: r.origen,
      estado: r.error ? "Error de lectura" : "Pendiente de revisar", notas: r.error,
    };
    setDoc(base);
    if (r.error) { setError(r.error); setFase("error"); set((d) => ops.addDocumento(d, base)); return; }
    setFase("revisar");
  };

  const cambiarTipo = (t: TipoDocumento) => {
    if (!doc) return;
    const previos = new Map(doc.campos.map((c) => [c.clave, c]));
    const campos: CampoDetectado[] = camposPorTipo(t).map((c) => previos.get(c.clave) ?? { clave: c.clave, etiqueta: c.etiqueta, valorDetectado: "", valorFinal: "", confianza: 0, corregido: false });
    setDoc({ ...doc, tipo: t, campos });
  };
  const editar = (clave: string, v: string) => doc && setDoc({ ...doc, campos: doc.campos.map((c) => (c.clave === clave ? { ...c, valorFinal: v, corregido: v !== c.valorDetectado } : c)) });

  const guardar = () => {
    if (!doc) return;
    const final: Documento = { ...doc, estado: "Guardado" };
    set((d) => ops.addDocumento(d, final));
    onGuardado?.(final);
    onCerrar();
  };

  return (
    <Modal titulo="Añadir documento" onCerrar={onCerrar}>
      {fase === "elegir" && (
        <div className="space-y-3">
          <Aviso tipo="info">Flujo: subir → lectura automática → <b>revisión</b> → guardar. Nada se guarda sin tu revisión.</Aviso>
          {ocr.esDemo && <Aviso tipo="aviso">OCR en modo <b>demo</b>: los campos detectados son simulados. Al conectar un servicio OCR real se sustituirán.</Aviso>}
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => inputRef.current?.click()} className="min-h-[96px] rounded-2xl border-2 border-dashed border-[#a9d2c4] bg-[#f7faf8] p-4 text-sm font-bold text-[#096653] hover:bg-[#e5f3ed]">
              📄 Elegir archivo<br /><span className="font-normal text-[#657a72]">PDF, Excel, CSV, JPG, PNG, HEIC</span>
            </button>
            <button type="button" onClick={() => camRef.current?.click()} className="min-h-[96px] rounded-2xl border-2 border-dashed border-[#a9d2c4] bg-[#f7faf8] p-4 text-sm font-bold text-[#096653] hover:bg-[#e5f3ed]">
              📷 Hacer foto<br /><span className="font-normal text-[#657a72]">con la cámara del móvil</span>
            </button>
          </div>
          <input ref={inputRef} type="file" accept={EXTENSIONES_ADMITIDAS.join(",")} className="hidden" onChange={(e) => e.target.files?.[0] && procesar(e.target.files[0])} />
          <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && procesar(e.target.files[0])} />
        </div>
      )}
      {fase === "leyendo" && <div className="py-8"><Cargando texto={`Leyendo ${archivo?.name}…`} /></div>}
      {fase === "error" && (
        <div className="space-y-3">
          <Aviso tipo="error">No se ha podido leer el documento: {error}</Aviso>
          {doc && <p className="text-sm text-[#657a72]">Se ha guardado como «Error de lectura» para que puedas reintentarlo o completarlo a mano desde la lista.</p>}
          <div className="flex gap-2"><Boton tipo="secundario" onClick={() => setFase("elegir")}>Elegir otro</Boton><Boton tipo="texto" onClick={onCerrar}>Cerrar</Boton></div>
        </div>
      )}
      {fase === "revisar" && doc && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Chip>{doc.estado}</Chip>{doc.origenOCR === "demo" && <ChipDemo />}
            <span className="text-[#657a72]">{doc.nombreArchivo} · {(doc.tamano / 1024).toFixed(0)} KB</span>
          </div>
          <Select label="Tipo de documento" value={doc.tipo} onChange={(v) => cambiarTipo(v as TipoDocumento)} opciones={TIPOS_DOCUMENTO} />
          <p className="text-xs text-[#657a72]">Los campos en amarillo tienen baja confianza: compáralos con el original y corrígelos.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {doc.campos.map((c) => (
              <label key={c.clave} className="block">
                <span className="text-xs font-bold text-[#567067]">{c.etiqueta} <span className="font-normal text-[#8aa39a]">({Math.round(c.confianza * 100)}%)</span></span>
                <input value={c.valorFinal} onChange={(e) => editar(c.clave, e.target.value)}
                  className={"mt-1 min-h-[44px] w-full rounded-xl border px-3 text-sm outline-none focus:border-[#0d7969] " + (c.confianza < 0.7 ? "border-[#e6b800] bg-[#fffbea]" : "border-[#cfe0d7]")} />
                {c.corregido && <span className="text-[11px] text-[#1a56db]">corregido (detectado: «{c.valorDetectado || "—"}»)</span>}
              </label>
            ))}
          </div>
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Boton tipo="texto" onClick={onCerrar}>Descartar</Boton>
            <Boton tipo="secundario" onClick={() => { set((d) => ops.addDocumento(d, { ...doc, estado: "Revisado" })); onCerrar(); }}>Guardar como revisado</Boton>
            <Boton onClick={guardar}>Guardar</Boton>
          </div>
        </div>
      )}
    </Modal>
  );
}

function DetalleDocumento({ doc, set, onCerrar }: { doc: Documento; set: Props["set"]; onCerrar: () => void }) {
  const [d, setD] = useState(doc);
  const editar = (clave: string, v: string) => setD({ ...d, campos: d.campos.map((c) => (c.clave === clave ? { ...c, valorFinal: v, corregido: v !== c.valorDetectado } : c)) });
  return (
    <Modal titulo={d.nombreArchivo} onCerrar={onCerrar}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2"><Chip>{d.estado}</Chip><Chip>{d.tipo}</Chip>{d.demo && <ChipDemo />}{d.origenOCR === "demo" && <Chip tono="demo">OCR demo</Chip>}</div>
        <p className="text-xs text-[#657a72]">Subido {new Date(d.fechaSubida).toLocaleString("es-ES")} por {d.usuario}</p>
        {d.notas && <Aviso tipo="error">{d.notas}</Aviso>}
        <div className="grid gap-3 sm:grid-cols-2">
          {d.campos.map((c) => (
            <label key={c.clave} className="block">
              <span className="text-xs font-bold text-[#567067]">{c.etiqueta}</span>
              <input value={c.valorFinal} onChange={(e) => editar(c.clave, e.target.value)} className={"mt-1 min-h-[44px] w-full rounded-xl border px-3 text-sm " + (c.confianza < 0.7 && !c.corregido ? "border-[#e6b800] bg-[#fffbea]" : "border-[#cfe0d7]")} />
              {c.corregido && <span className="text-[11px] text-[#1a56db]">corregido (detectado: «{c.valorDetectado || "—"}»)</span>}
            </label>
          ))}
        </div>
        <div className="flex flex-wrap justify-between gap-2 pt-2">
          <Boton tipo="peligro" onClick={() => { if (confirm("¿Eliminar este documento?")) { set((x) => ops.delDocumento(x, d.id)); onCerrar(); } }}>Eliminar</Boton>
          <div className="flex gap-2">
            <Boton tipo="secundario" onClick={() => { set((x) => ops.updDocumento(x, { ...d, estado: "Revisado" })); onCerrar(); }}>Marcar revisado</Boton>
            <Boton onClick={() => { set((x) => ops.updDocumento(x, { ...d, estado: "Guardado" })); onCerrar(); }}>Guardar</Boton>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function Documentos({ db, set, abrirSubida, onSubidaAbierta }: Props) {
  const [subir, setSubir] = useState(!!abrirSubida);
  const [detalle, setDetalle] = useState<Documento | null>(null);
  const [filtro, setFiltro] = useState<string>("todos");
  const docs = db.documentos.filter((d) => d.ejercicio === db.ejercicio);
  const conteo = documentosPorEstado(docs);
  const visibles = filtro === "todos" ? docs : docs.filter((d) => d.estado === filtro);
  if (abrirSubida && !subir) { setSubir(true); onSubidaAbierta?.(); }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(Object.keys(conteo) as (keyof typeof conteo)[]).map((k) => (
          <button key={k} type="button" onClick={() => setFiltro(filtro === k ? "todos" : k)} className={"rounded-2xl border bg-white p-3 text-left " + (filtro === k ? "ring-2 ring-[#0d7969]" : "")}>
            <p className="text-[11px] text-[#657a72]">{k}</p><p className="text-xl font-bold text-[#0d7969]">{conteo[k]}</p>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#657a72]">{visibles.length} documento(s){filtro !== "todos" ? ` · ${filtro}` : ""}</p>
        <Boton onClick={() => setSubir(true)}>+ Documento</Boton>
      </div>
      {!visibles.length ? (
        <Vacio titulo="Sin documentos" texto="Sube un PDF, Excel, CSV o foto: la aplicación lo lee y te lo muestra para revisar antes de guardar." accion={<Boton onClick={() => setSubir(true)}>Subir el primero</Boton>} />
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {visibles.map((d) => (
            <button key={d.id} type="button" onClick={() => setDetalle(d)} className="flex items-start justify-between gap-2 rounded-xl border bg-white p-3 text-left hover:border-[#0d7969]">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{d.nombreArchivo}</p>
                <p className="text-xs text-[#657a72]">{d.tipo} · {new Date(d.fechaSubida).toLocaleDateString("es-ES")}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1"><Chip>{d.estado}</Chip>{d.demo && <ChipDemo />}</div>
            </button>
          ))}
        </div>
      )}
      {subir && <SubirDocumento db={db} set={set} onCerrar={() => setSubir(false)} />}
      {detalle && <DetalleDocumento doc={detalle} set={set} onCerrar={() => setDetalle(null)} />}
    </div>
  );
}
