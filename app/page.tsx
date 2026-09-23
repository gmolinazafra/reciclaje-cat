"use client";
/**
 * ReciclaCat_Gest — pantalla principal.
 * Navegación por pestañas (móvil: barra inferior; escritorio: lateral), selector de ejercicio, ajustes y SeproBot.
 * Persistencia: localStorage del navegador (ver lib/repo.ts). Sin backend todavía.
 */
import { useState } from "react";
import SeproBot from "./seprobot/SeproBot";
import PanelTecnico from "./seprobot/PanelTecnico";
import { useDb } from "./lib/useDb";
import { ops } from "./lib/repo";
import Resumen from "./components/screens/Resumen";
import Documentos from "./components/screens/Documentos";
import Vehiculos from "./components/screens/Vehiculos";
import Piezas from "./components/screens/Piezas";
import Residuos from "./components/screens/Residuos";
import Informes from "./components/screens/Informes";
import { Aviso, Boton, Campo, Modal } from "./components/ui";

const TABS = [
  { n: "Resumen", i: "▦" }, { n: "Documentos", i: "📄" }, { n: "Vehículos", i: "🚗" }, { n: "Piezas", i: "⚙" }, { n: "Residuos", i: "♻" }, { n: "Informes", i: "📊" },
];

export default function Home() {
  const { db, set, repo } = useDb();
  const [tab, setTab] = useState(0);
  const [tech, setTech] = useState(false);
  const [ajustes, setAjustes] = useState(false);
  const [accion, setAccion] = useState<string | null>(null);
  const ir = (t: number, a?: string) => { setTab(t); setAccion(a ?? null); };
  const anios = [db.ejercicio - 1, db.ejercicio, db.ejercicio + 1].filter((a, i, arr) => arr.indexOf(a) === i);

  return (
    <main className="min-h-dvh bg-[#f4f7f5] text-[#17372f]">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[#dce8e1] bg-white px-3 sm:px-4">
        <b className="text-base sm:text-lg">♻ ReciclaCat_<span className="text-[#0d7969]">Gest</span></b>
        <div className="flex items-center gap-2">
          {!tech && (
            <select aria-label="Ejercicio" value={db.ejercicio} onChange={(e) => set((d) => ops.setEjercicio(d, parseInt(e.target.value, 10)))} className="min-h-[40px] rounded-xl border border-[#cfe0d7] bg-white px-2 text-sm">
              {anios.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
          <button type="button" onClick={() => setAjustes(true)} aria-label="Ajustes" className="min-h-[40px] min-w-[40px] rounded-xl text-lg hover:bg-[#f0f5f2]">⚙️</button>
          <button type="button" onClick={() => setTech(!tech)} className="min-h-[40px] rounded-xl bg-[#e5f3ed] px-3 text-sm font-bold text-[#096653]">{tech ? "Volver al centro" : "Área técnica"}</button>
        </div>
      </header>

      {tech ? <PanelTecnico /> : (
        <div className="md:grid md:grid-cols-[200px_1fr]">
          <aside className="hidden border-r bg-white p-3 md:block md:min-h-[calc(100dvh-56px)]">
            <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-[.12em] text-[#779087]">Gestión</p>
            <nav>{TABS.map((x, i) => <button key={x.n} type="button" onClick={() => ir(i)} className={"mb-1 flex min-h-[44px] w-full items-center gap-2 rounded-xl px-3 text-left text-sm " + (tab === i ? "bg-[#e5f3ed] font-bold text-[#096653]" : "text-[#567067] hover:bg-[#f0f5f2]")}><span>{x.i}</span>{x.n}</button>)}</nav>
          </aside>
          <section className="p-3 pb-24 sm:p-5 md:pb-6">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div><p className="text-xs font-semibold text-[#0d7969]">{db.centro.nombre}{db.centro.nima ? ` · NIMA ${db.centro.nima}` : ""}</p><h1 className="text-2xl font-bold">{TABS[tab].n} <span className="text-base font-normal text-[#657a72]">{db.ejercicio}</span></h1></div>
            </div>
            {tab === 0 && <Resumen db={db} ir={ir} />}
            {tab === 1 && <Documentos db={db} set={set} abrirSubida={accion === "subir"} onSubidaAbierta={() => setAccion(null)} />}
            {tab === 2 && <Vehiculos db={db} set={set} />}
            {tab === 3 && <Piezas db={db} set={set} abrir={accion === "manual" || accion === "excel" ? accion : null} onAbierto={() => setAccion(null)} />}
            {tab === 4 && <Residuos db={db} set={set} abrirDI={accion === "di"} onAbierto={() => setAccion(null)} />}
            {tab === 5 && <Informes db={db} />}
          </section>
          {/* Barra inferior móvil */}
          <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-6 border-t border-[#dce8e1] bg-white md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
            {TABS.map((x, i) => <button key={x.n} type="button" onClick={() => ir(i)} aria-label={x.n} className={"flex min-h-[56px] flex-col items-center justify-center text-[10px] " + (tab === i ? "font-bold text-[#096653]" : "text-[#567067]")}><span className="text-lg">{x.i}</span>{x.n}</button>)}
          </nav>
        </div>
      )}

      {ajustes && (
        <Modal titulo="Ajustes del centro" onCerrar={() => setAjustes(false)}>
          <div className="space-y-3">
            <Aviso tipo="info">Los datos se guardan en <b>este navegador</b>. Todavía no hay persistencia central; cuando se conecte el backend (Supabase) se migrarán.</Aviso>
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo label="Nombre del centro" value={db.centro.nombre} onChange={(v) => set((d) => ({ ...d, centro: { ...d.centro, nombre: v } }))} />
              <Campo label="NIMA" value={db.centro.nima} onChange={(v) => set((d) => ({ ...d, centro: { ...d.centro, nima: v } }))} />
              <Campo label="Provincia" value={db.centro.provincia} onChange={(v) => set((d) => ({ ...d, centro: { ...d.centro, provincia: v } }))} />
              <Campo label="Usuario" value={db.centro.usuario} onChange={(v) => set((d) => ({ ...d, centro: { ...d.centro, usuario: v } }))} ayuda="Se registra en cada documento subido." />
            </div>
            <div className="flex flex-wrap gap-2">
              <Boton tipo="secundario" onClick={() => confirm("¿Restaurar los datos de demostración? Se perderán los datos actuales de este navegador.") && repo.reiniciarDemo()}>Restaurar demo</Boton>
              <Boton tipo="peligro" onClick={() => confirm("¿Borrar todos los datos de este navegador y empezar de cero?") && repo.borrarTodo()}>Borrar todo</Boton>
            </div>
          </div>
        </Modal>
      )}
      <SeproBot />
    </main>
  );
}
