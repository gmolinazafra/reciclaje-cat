"use client";
/**
 * ReciclaCat_Gest — pantalla principal.
 * Navegación por pestañas (móvil: barra inferior; escritorio: lateral), selector de ejercicio, ajustes y SeproBot.
 * Persistencia: versión Windows → archivo en la carpeta de datos del usuario; navegador → localStorage (ver lib/repo.ts).
 */
import { useEffect, useState } from "react";
import { puente } from "./lib/escritorio";
import type { InfoEscritorio } from "./lib/escritorio";
import { BloqueLegal, VisorLegal } from "./components/Legal";
import type { DocLegal } from "./components/Legal";
import SeproBot from "./seprobot/SeproBot";
import { useDb } from "./lib/useDb";
import { ops } from "./lib/repo";
import Resumen from "./components/screens/Resumen";
import Documentos from "./components/screens/Documentos";
import Vehiculos from "./components/screens/Vehiculos";
import Piezas from "./components/screens/Piezas";
import Residuos from "./components/screens/Residuos";
import Informes from "./components/screens/Informes";
import { Aviso, Boton, Campo, Modal, Select } from "./components/ui";

const TABS = [
  { n: "Resumen", i: "▦" }, { n: "Documentos", i: "📄" }, { n: "Vehículos", i: "🚗" }, { n: "Piezas", i: "⚙" }, { n: "Residuos", i: "♻" }, { n: "Informes", i: "📊" },
];

function AjustesEscritorio() {
  const p = puente();
  const [info, setInfo] = useState<InfoEscritorio | null>(null);
  const [msg, setMsg] = useState<{ tipo: "ok" | "error"; t: string } | null>(null);
  useEffect(() => { p?.info().then(setInfo).catch(() => setInfo(null)); }, [p]);
  if (!p) return null;
  return (
    <div className="space-y-2 rounded-2xl border border-[#cfe0d7] bg-[#f7faf8] p-3">
      <p className="text-sm font-bold">Datos y copias de seguridad</p>
      <p className="text-xs text-[#657a72]">Los datos se guardan en este ordenador{info ? <>: <code className="break-all">{info.carpetaDatos}</code></> : ""}. Cada día se hace una copia automática (se guardan las 30 últimas){info?.ultimaCopia ? ` · última: ${new Date(info.ultimaCopia).toLocaleString("es-ES")}` : ""}.</p>
      <p className="text-xs text-[#657a72]">Haz también una copia en un pendrive o disco externo de vez en cuando: si el ordenador se estropea, es lo único que conserva los datos.</p>
      {msg && <Aviso tipo={msg.tipo}>{msg.t}</Aviso>}
      <div className="flex flex-wrap gap-2">
        <Boton onClick={async () => { const r = await p.crearCopia(); if (r) setMsg({ tipo: "ok", t: "Copia guardada en " + r }); }}>Hacer copia de seguridad…</Boton>
        <Boton tipo="secundario" onClick={async () => { if (!confirm("Restaurar una copia sustituye los datos actuales por los de la copia (antes se guarda una copia de los actuales). ¿Continuar?")) return; const ok = await p.restaurarCopia(); if (!ok) setMsg({ tipo: "error", t: "No se ha restaurado ninguna copia." }); }}>Restaurar copia…</Boton>
        <Boton tipo="texto" onClick={() => p.abrirCarpetaDatos()}>Abrir carpeta de datos</Boton>
      </div>
      {info?.prueba?.activa && <p className="text-xs text-[#567067]"><b>Prueba gratuita</b> · te quedan {info.prueba.diasRestantes} días · equipo {info.equipo} · <a href="/activar.html" className="font-bold text-[#096653] underline">Activar licencia</a></p>}
      {info?.licencia && <p className="text-xs text-[#567067]"><b>Licencia</b> {info.licencia.numero} · {info.licencia.cliente} · {info.licencia.caduca ? `válida hasta ${info.licencia.caduca.split("-").reverse().join("/")}` : "sin caducidad"} · equipo {info.equipo}</p>}
      {info && (
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#8aa39a]">
          <span>ReciclaCat_Gest para Windows · versión {info.version} · actualizaciones: {info.actualizacion}</span>
          <button type="button" className="font-bold text-[#096653] underline" onClick={async () => { const e = await p.buscarActualizacion(); setInfo({ ...info, actualizacion: e }); setTimeout(() => p.info().then(setInfo), 4000); }}>Buscar actualizaciones</button>
        </div>
      )}
    </div>
  );
}

/** Banda de la versión de prueba (solo en Windows, sin licencia). */
function BandaPrueba() {
  const p = puente();
  const [info, setInfo] = useState<InfoEscritorio | null>(null);
  useEffect(() => { p?.info().then(setInfo).catch(() => setInfo(null)); }, [p]);
  if (!info?.prueba?.activa) return null;
  const d = info.prueba.diasRestantes;
  return (
    <div className={"flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-3 py-2 text-center text-xs font-semibold sm:text-sm " + (d <= 3 ? "bg-[#fff4e5] text-[#92400e]" : "bg-[#e5f3ed] text-[#096653]")}>
      <span>Versión de prueba gratuita · te {d === 1 ? "queda 1 día" : `quedan ${d} días`}</span>
      <a href="/activar.html" className="rounded-lg bg-[#0d7969] px-3 py-1 text-white hover:bg-[#096653]">Activar licencia</a>
    </div>
  );
}

export default function Home() {
  const { db, set, repo } = useDb();
  // La interfaz se pinta solo en el equipo del usuario (los datos viven allí), evitando parpadeos de datos de ejemplo.
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  const [tab, setTab] = useState(0);
  const [ajustes, setAjustes] = useState(false);
  const [accion, setAccion] = useState<string | null>(null);
  const [legal, setLegal] = useState<DocLegal | null>(null);
  // Abierto al principio si faltan los datos; después lo controla el usuario (no se cierra al escribir).
  const [siraAbierto, setSiraAbierto] = useState<boolean | null>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (ajustes) setSiraAbierto(!db.centro.nif); }, [ajustes]);
  const ir = (t: number, a?: string) => { setTab(t); setAccion(a ?? null); };
  // Años con datos + el actual ± 1, para poder trabajar también con ejercicios anteriores (p. ej. DI del año pasado).
  const anios = [...new Set([db.ejercicio - 1, db.ejercicio, db.ejercicio + 1, new Date().getFullYear(), ...db.vehiculos.map((v) => v.ejercicio), ...db.dis.map((d) => d.ejercicio), ...db.ventas.map((v) => v.ejercicio), ...db.residuos.map((r) => r.ejercicio)])].filter((a) => a > 2000).sort((a, b) => a - b);

  if (!montado) return <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-white text-[#17372f]"><img src="/logo.png" alt="ReciclaCat_Gest" className="w-64 max-w-[70vw]" /><p className="text-xs text-[#8aa39a]">Powered by Limonada Web</p></main>;

  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#f4f7f5] text-[#17372f]">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[#dce8e1] bg-white px-3 sm:px-4">
        <b className="flex items-center gap-2 text-base sm:text-lg"><img src="/logo-simbolo.png" alt="" className="h-8 w-8" />ReciclaCat_<span className="-ml-2 text-[#0d7969]">Gest</span></b>
        <div className="flex items-center gap-2">
          {(
            <select aria-label="Ejercicio" value={db.ejercicio} onChange={(e) => set((d) => ops.setEjercicio(d, parseInt(e.target.value, 10)))} className="min-h-[40px] rounded-xl border border-[#cfe0d7] bg-white px-2 text-sm">
              {anios.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
          <button type="button" onClick={() => { setSiraAbierto(null); setAjustes(true); }} aria-label="Ajustes" className="min-h-[40px] min-w-[40px] rounded-xl text-lg hover:bg-[#f0f5f2]">⚙️</button>
        </div>
      </header>
      <BandaPrueba />

      {(
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
            {tab === 5 && <Informes db={db} set={set} />}
            <footer className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-[#dce8e1] pt-3 text-[11px] text-[#8aa39a]">
              <span>ReciclaCat_Gest · © Limonada Web</span>
              <button type="button" className="underline hover:text-[#096653]" onClick={() => setLegal("condiciones")}>Condiciones y privacidad</button>
              <button type="button" className="underline hover:text-[#096653]" onClick={() => setLegal("terceros")}>Avisos de terceros</button>
              <a href="https://www.limonadaweb.com/" target="_blank" rel="noopener" className="hover:text-[#096653]">Powered by Limonada Web</a>
            </footer>
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
            {repo.tipo === "navegador" ? <Aviso tipo="info">Los datos se guardan en <b>este navegador</b>. Para guardarlos en el ordenador con copias de seguridad, usa la versión de Windows.</Aviso> : <AjustesEscritorio />}
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo label="Nombre del centro" value={db.centro.nombre} onChange={(v) => set((d) => ({ ...d, centro: { ...d.centro, nombre: v } }))} />
              <Campo label="NIMA" value={db.centro.nima} onChange={(v) => set((d) => ({ ...d, centro: { ...d.centro, nima: v } }))} />
              <Campo label="Provincia" value={db.centro.provincia} onChange={(v) => set((d) => ({ ...d, centro: { ...d.centro, provincia: v } }))} />
              <Campo label="Usuario" value={db.centro.usuario} onChange={(v) => set((d) => ({ ...d, centro: { ...d.centro, usuario: v } }))} ayuda="Se registra en cada documento subido." />
            </div>
            <details className="rounded-2xl border border-[#cfe0d7] bg-white p-3" open={siraAbierto ?? !db.centro.nif}>
              <summary className="cursor-pointer text-sm font-bold" onClick={(e) => { e.preventDefault(); setSiraAbierto(!(siraAbierto ?? !db.centro.nif)); }}>Datos para la memoria anual (SIRA)</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {([
                  ["razonSocial", "Razón social", ""], ["nif", "NIF", ""], ["municipio", "Municipio", ""], ["autorizacion", "Nº de autorización", "Como figura en el DI (p. ej. AN000…)."],
                  ["inscripcionGestor", "Inscripción como gestor", "Habitual en un CAT: E01."], ["inscripcionProductor", "Inscripción como productor", "Habitual: P01."],
                  ["operacionAutorizada", "Operación autorizada", "La de tu autorización (p. ej. R1201)."],
                ] as const).map(([k, l, a]) => (
                  <Campo key={k} label={l} value={(db.centro[k] as string | undefined) ?? ""} onChange={(v) => set((d) => ({ ...d, centro: { ...d.centro, [k]: v } }))} ayuda={a || undefined} />
                ))}
                <Select label="Procedencia de los vehículos en las entradas" value={db.centro.procedenciaEntradas === "particulares" ? "Agrupados como particulares" : "El propio centro (como en SIRA por defecto)"} onChange={(v) => set((d) => ({ ...d, centro: { ...d.centro, procedenciaEntradas: v.startsWith("Agrupados") ? "particulares" : "propio" } }))} opciones={["El propio centro (como en SIRA por defecto)", "Agrupados como particulares"]} />
                <Campo label="Método de cálculo del peso total" value={db.centro.metodoPeso ?? ""} onChange={(v) => set((d) => ({ ...d, centro: { ...d.centro, metodoPeso: v } }))} placeholder="Suma de tara de ficha técnica" />
                <Campo label="Método de cálculo de lo enviado a reutilización" value={db.centro.metodoReutilizacion ?? ""} onChange={(v) => set((d) => ({ ...d, centro: { ...d.centro, metodoReutilizacion: v } }))} placeholder="Kilos de piezas vendidas según facturas" />
              </div>
            </details>
            <BloqueLegal abrir={setLegal} />
            <div className="flex flex-wrap gap-2">
              <Boton tipo="secundario" onClick={() => confirm("¿Cargar los datos de demostración? Se sustituirán los datos actuales (haz antes una copia si los necesitas).") && repo.reiniciarDemo()}>Cargar datos de demostración</Boton>
              <Boton tipo="peligro" onClick={() => confirm("¿Borrar todos los datos y empezar de cero? Esta acción no se puede deshacer si no tienes copia.") && repo.borrarTodo()}>Borrar todo</Boton>
            </div>
          </div>
        </Modal>
      )}
      {legal && <VisorLegal doc={legal} onCerrar={() => setLegal(null)} />}
      <SeproBot />
    </main>
  );
}
