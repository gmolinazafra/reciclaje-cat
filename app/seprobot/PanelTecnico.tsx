"use client";
/**
 * Panel técnico «Biblioteca y reglas de SeproBot».
 * Permite al técnico ver, filtrar, crear, editar y cambiar de estado las fichas sin tocar código.
 * Las ediciones se guardan en el navegador (kbStore.ts) y pueden exportarse a JSON para consolidarlas en código.
 */

import { useEffect, useMemo, useState } from "react";
import {
  cambiarEstado,
  contarPorEstado,
  exportarOverridesJSON,
  fichaVacia,
  getFichas,
  guardarFicha,
  importarOverridesJSON,
  restaurarFicha,
  tieneOverride,
} from "./kbStore";
import { DOMINIOS, ESTADOS } from "./types";
import type { Accion, Dominio, Entidad, EstadoFicha, Ficha } from "./types";

const ENTIDADES: Entidad[] = [
  "DI", "piezas_vendidas", "excel_ventas", "vehiculo", "baja", "foto_baja", "residuo", "vertido", "informe",
  "situacion_anual", "documento", "ocr", "GICA", "VFU", "traslado", "neumaticos", "baterias", "garantias",
  "aguas", "LER", "economia_circular", "PIREC",
];
const ACCIONES: Accion[] = ["registrar", "importar", "subir", "consultar", "renovar", "modificar", "revisar", "eliminar", "corregir", "generar", "explicar"];

const colorEstado: Record<EstadoFicha, string> = {
  Vigente: "bg-[#e5f3ed] text-[#096653]",
  "En revisión": "bg-[#fff3d9] text-[#9a6800]",
  Obsoleta: "bg-[#fde8e8] text-[#9b2c2c]",
  "No aplica": "bg-[#eceff1] text-[#546e7a]",
};
const etiquetaDominio = (d: Dominio) => DOMINIOS.find((x) => x.id === d)?.etiqueta ?? d;

/** Textarea de lista: una línea por elemento. */
function CampoLista({ label, valor, onChange, ayuda }: { label: string; valor: string[]; onChange: (v: string[]) => void; ayuda?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-[#567067]">{label}</span>
      {ayuda && <span className="ml-2 text-[11px] text-[#8aa39a]">{ayuda}</span>}
      <textarea
        value={valor.join("\n")}
        onChange={(e) => onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
        rows={Math.min(8, Math.max(2, valor.length + 1))}
        className="mt-1 w-full rounded-lg border border-[#cfe0d7] px-3 py-2 text-sm"
      />
    </label>
  );
}

function Campo({ label, valor, onChange, multi }: { label: string; valor: string; onChange: (v: string) => void; multi?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-[#567067]">{label}</span>
      {multi ? (
        <textarea value={valor} onChange={(e) => onChange(e.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-[#cfe0d7] px-3 py-2 text-sm" />
      ) : (
        <input value={valor} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-[#cfe0d7] px-3 py-2 text-sm" />
      )}
    </label>
  );
}

function Chips<T extends string>({ label, opciones, valor, onChange }: { label: string; opciones: T[]; valor: T[]; onChange: (v: T[]) => void }) {
  const toggle = (o: T) => onChange(valor.includes(o) ? valor.filter((x) => x !== o) : [...valor, o]);
  return (
    <div>
      <span className="text-xs font-bold text-[#567067]">{label}</span>
      <div className="mt-1 flex flex-wrap gap-1">
        {opciones.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => toggle(o)}
            className={"rounded-full border px-2 py-0.5 text-xs " + (valor.includes(o) ? "border-[#0d7969] bg-[#e5f3ed] text-[#096653]" : "border-[#cfe0d7] text-[#567067]")}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function Editor({ inicial, onCerrar }: { inicial: Ficha; onCerrar: (guardada: boolean) => void }) {
  const [f, setF] = useState<Ficha>(inicial);
  const set = <K extends keyof Ficha>(k: K, v: Ficha[K]) => setF((prev) => ({ ...prev, [k]: v }));
  const esApp = f.dominio === "app";

  const guardar = () => {
    if (!f.titulo.trim()) return alert("La ficha necesita un título.");
    if (!f.id.trim()) return alert("La ficha necesita un identificador.");
    const ok = guardarFicha({ ...f, id: f.id.trim().toLowerCase().replace(/\s+/g, "-") });
    if (!ok) alert("No se ha podido guardar en este navegador.");
    onCerrar(ok);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-3">
      <div className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5">
        <div className="flex items-center justify-between">
          <b className="text-lg">{inicial.titulo ? "Editar ficha" : "Nueva ficha"}</b>
          <button type="button" onClick={() => onCerrar(false)} className="text-xl">×</button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Campo label="Título" valor={f.titulo} onChange={(v) => set("titulo", v)} />
          <Campo label="Identificador (sin espacios)" valor={f.id} onChange={(v) => set("id", v)} />
          <label className="block">
            <span className="text-xs font-bold text-[#567067]">Dominio</span>
            <select value={f.dominio} onChange={(e) => set("dominio", e.target.value as Dominio)} className="mt-1 w-full rounded-lg border border-[#cfe0d7] px-3 py-2 text-sm">
              {DOMINIOS.map((d) => <option key={d.id} value={d.id}>{d.etiqueta}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold text-[#567067]">Estado</span>
            <select value={f.estado} onChange={(e) => set("estado", e.target.value as EstadoFicha)} className="mt-1 w-full rounded-lg border border-[#cfe0d7] px-3 py-2 text-sm">
              {ESTADOS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-3 grid gap-3">
          <Chips label="Entidades que responde" opciones={ENTIDADES} valor={f.entidades} onChange={(v) => set("entidades", v)} />
          <Chips label="Acciones que responde (vacío = cualquiera)" opciones={ACCIONES} valor={f.acciones} onChange={(v) => set("acciones", v)} />
          <CampoLista label="Sinónimos" ayuda="una por línea, como lo escribiría un gerente" valor={f.sinonimos} onChange={(v) => set("sinonimos", v)} />
          <CampoLista label="Frases de ejemplo" ayuda="una por línea" valor={f.frasesEjemplo} onChange={(v) => set("frasesEjemplo", v)} />
          <CampoLista label="Etiquetas" ayuda="una por línea" valor={f.etiquetas} onChange={(v) => set("etiquetas", v)} />
          {esApp ? (
            <>
              <Campo label="Respuesta (introducción antes de los pasos)" valor={f.respuesta ?? ""} onChange={(v) => set("respuesta", v)} multi />
              <CampoLista label="Pasos" ayuda="uno por línea, en orden" valor={f.pasos} onChange={(v) => set("pasos", v)} />
            </>
          ) : (
            <>
              <Campo label="Resumen (qué regula, en lenguaje claro)" valor={f.resumen} onChange={(v) => set("resumen", v)} multi />
              <CampoLista label="Puntos a revisar / requisitos" ayuda="uno por línea" valor={f.requisitos} onChange={(v) => set("requisitos", v)} />
              <CampoLista label="Pasos (solo trámites)" ayuda="uno por línea" valor={f.pasos} onChange={(v) => set("pasos", v)} />
            </>
          )}
          <div className="grid gap-3 md:grid-cols-3">
            <Campo label="Fuente" valor={f.fuente} onChange={(v) => set("fuente", v)} />
            <Campo label="Ámbito territorial" valor={f.ambitoTerritorial} onChange={(v) => set("ambitoTerritorial", v)} />
            <Campo label="Versión" valor={f.version} onChange={(v) => set("version", v)} />
          </div>
          <Campo label="Notas internas del técnico (no se muestran al usuario)" valor={f.notasTecnico ?? ""} onChange={(v) => set("notasTecnico", v)} multi />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => onCerrar(false)} className="rounded-xl px-4 py-2 text-sm font-bold text-[#567067]">Cancelar</button>
          <button type="button" onClick={guardar} className="rounded-xl bg-[#0d7969] px-4 py-2 text-sm font-bold text-white">Guardar ficha</button>
        </div>
      </div>
    </div>
  );
}

export default function PanelTecnico() {
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [dominio, setDominio] = useState<Dominio | "todos">("todos");
  const [estado, setEstado] = useState<EstadoFicha | "todos">("todos");
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState<Ficha | null>(null);

  const recargar = () => setFichas(getFichas());
  useEffect(() => {
    recargar();
    window.addEventListener("seprobot:fichas", recargar);
    return () => window.removeEventListener("seprobot:fichas", recargar);
  }, []);

  const conteo = useMemo(() => contarPorEstado(fichas), [fichas]);
  const visibles = useMemo(() => {
    const q = busqueda.toLowerCase();
    return fichas.filter(
      (f) =>
        (dominio === "todos" || f.dominio === dominio) &&
        (estado === "todos" || f.estado === estado) &&
        (!q || f.titulo.toLowerCase().includes(q) || f.sinonimos.some((s) => s.includes(q)) || f.id.includes(q)),
    );
  }, [fichas, dominio, estado, busqueda]);

  const exportar = () => {
    const blob = new Blob([exportarOverridesJSON()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `seprobot-fichas-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };
  const importar = (file: File) => {
    file.text().then((t) => {
      try {
        const n = importarOverridesJSON(t);
        alert(`${n} fichas importadas.`);
      } catch (e) {
        alert("Archivo no válido: " + (e as Error).message);
      }
    });
  };

  return (
    <section className="min-h-[calc(100dvh-64px)] p-5 md:p-7">
      <p className="text-sm font-semibold text-[#0d7969]">Administración profesional</p>
      <h1 className="mt-1 text-3xl font-bold">Biblioteca y reglas de SeproBot</h1>
      <p className="mt-1 text-sm text-[#657a72]">
        SeproBot solo responde con fichas <b>Vigentes</b>. Cambia el estado, edita o añade fichas aquí; los cambios se guardan en este navegador y puedes exportarlos para consolidarlos.
      </p>

      {/* Contadores */}
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        <button type="button" onClick={() => setEstado("todos")} className={"rounded-2xl border bg-white p-4 text-left " + (estado === "todos" ? "ring-2 ring-[#0d7969]" : "")}>
          <p className="text-xs text-[#657a72]">Total</p>
          <p className="text-2xl font-bold">{fichas.length}</p>
        </button>
        {ESTADOS.map((s) => (
          <button key={s} type="button" onClick={() => setEstado(s)} className={"rounded-2xl border bg-white p-4 text-left " + (estado === s ? "ring-2 ring-[#0d7969]" : "")}>
            <p className="text-xs text-[#657a72]">{s}</p>
            <p className={"inline-block rounded-full px-2 text-2xl font-bold " + colorEstado[s]}>{conteo[s]}</p>
          </button>
        ))}
      </div>

      {/* Filtros y acciones */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select value={dominio} onChange={(e) => setDominio(e.target.value as Dominio | "todos")} className="rounded-xl border border-[#cfe0d7] px-3 py-2 text-sm">
          <option value="todos">Todos los dominios</option>
          {DOMINIOS.map((d) => <option key={d.id} value={d.id}>{d.etiqueta}</option>)}
        </select>
        <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por título o sinónimo…" className="min-w-[200px] flex-1 rounded-xl border border-[#cfe0d7] px-3 py-2 text-sm" />
        <button type="button" onClick={() => setEditando(fichaVacia())} className="rounded-xl bg-[#0d7969] px-4 py-2 text-sm font-bold text-white">+ Nueva ficha</button>
        <button type="button" onClick={exportar} className="rounded-xl bg-[#e5f3ed] px-3 py-2 text-sm font-bold text-[#096653]">Exportar cambios</button>
        <label className="cursor-pointer rounded-xl bg-[#e5f3ed] px-3 py-2 text-sm font-bold text-[#096653]">
          Importar JSON
          <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importar(e.target.files[0])} />
        </label>
      </div>

      {/* Lista */}
      <div className="mt-4 grid gap-2">
        {visibles.map((f) => (
          <article key={f.id} className="flex flex-col gap-2 rounded-xl border bg-white p-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#eef2f0] px-2 py-0.5 text-[11px] font-bold text-[#567067]">{etiquetaDominio(f.dominio)}</span>
                {tieneOverride(f.id) && <span className="rounded-full bg-[#e8f0fe] px-2 py-0.5 text-[11px] font-bold text-[#1a56db]">editada aquí</span>}
                <b className="text-sm">{f.titulo}</b>
              </div>
              <p className="mt-1 text-xs text-[#657a72]">
                {f.entidades.length ? "Entidades: " + f.entidades.join(", ") + " · " : ""}
                rev. {f.fechaRevision} · v{f.version}
                {f.notasTecnico ? " · ⚠ " + f.notasTecnico : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <select
                value={f.estado}
                onChange={(e) => cambiarEstado(f.id, e.target.value as EstadoFicha)}
                className={"rounded-full border-0 px-2 py-1 text-xs font-bold " + colorEstado[f.estado]}
              >
                {ESTADOS.map((s) => <option key={s}>{s}</option>)}
              </select>
              <button type="button" onClick={() => setEditando(f)} className="rounded-lg border border-[#0d7969] px-3 py-1 text-xs font-bold text-[#0d7969]">Editar</button>
              {tieneOverride(f.id) && (
                <button type="button" onClick={() => confirm("¿Descartar las ediciones locales de esta ficha?") && restaurarFicha(f.id)} className="rounded-lg px-2 py-1 text-xs text-[#9b2c2c]">Restaurar</button>
              )}
            </div>
          </article>
        ))}
        {!visibles.length && <p className="text-sm text-[#657a72]">No hay fichas con esos filtros.</p>}
      </div>

      {editando && <Editor inicial={editando} onCerrar={() => setEditando(null)} />}
    </section>
  );
}
