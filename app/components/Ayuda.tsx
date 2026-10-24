"use client";
/** Ayuda y preguntas frecuentes, con buscador y temas. © Limonada Web. */
import { useMemo, useState } from "react";
import { AYUDA, buscarAyuda } from "../lib/ayuda";
import type { PreguntaAyuda } from "../lib/ayuda";
import { esEscritorio } from "../lib/escritorio";
import { Modal } from "./ui";

function Pregunta({ q, abierta, onClick }: { q: PreguntaAyuda; abierta: boolean; onClick: () => void }) {
  return (
    <div className="rounded-xl border border-[#dce8e1] bg-white">
      <button type="button" onClick={onClick} aria-expanded={abierta} className="flex min-h-[48px] w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-bold text-[#17372f]">
        <span>{q.p}</span>
        <span className={"shrink-0 text-[#0d7969] transition-transform " + (abierta ? "rotate-45" : "")} aria-hidden>＋</span>
      </button>
      {abierta && (
        <div className="space-y-1.5 border-t border-[#eef4f1] px-3 py-2 text-sm leading-relaxed text-[#40564e]">
          {q.r.map((t, i) => <p key={i}>{t}</p>)}
        </div>
      )}
    </div>
  );
}

export default function Ayuda({ onCerrar, abrirLegal }: { onCerrar: () => void; abrirLegal: () => void }) {
  const escritorio = esEscritorio();
  const [texto, setTexto] = useState("");
  const [tema, setTema] = useState(AYUDA[0].id);
  const [abierta, setAbierta] = useState<string | null>(null);
  const temas = useMemo(() => AYUDA.map((t) => ({ ...t, preguntas: t.preguntas.filter((q) => escritorio || !q.soloWindows) })).filter((t) => t.preguntas.length), [escritorio]);
  const resultados = texto.trim().length >= 2 ? buscarAyuda(texto, escritorio) : null;
  const actual = temas.find((t) => t.id === tema) ?? temas[0];
  const conmutar = (k: string) => setAbierta((a) => (a === k ? null : k));

  return (
    <Modal titulo="Ayuda y preguntas frecuentes" onCerrar={onCerrar} ancho="max-w-3xl">
      <div className="space-y-3">
        <label className="block">
          <span className="sr-only">Buscar en la ayuda</span>
          <input type="search" autoFocus value={texto} onChange={(e) => { setTexto(e.target.value); setAbierta(null); }} placeholder="🔎  Busca tu duda: «copia», «DI», «memoria», «código»…"
            className="min-h-[48px] w-full rounded-xl border border-[#cfe0d7] bg-white px-3 text-sm outline-none focus:border-[#0d7969]" />
        </label>

        {resultados ? (
          <div className="space-y-2">
            <p className="text-xs text-[#657a72]">{resultados.length ? `${resultados.length} ${resultados.length === 1 ? "resultado" : "resultados"}` : "No hay resultados. Prueba con otra palabra o pregunta a SeproBot."}</p>
            {resultados.map(({ tema: t, pregunta: q }) => (
              <div key={t.id + q.p}>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[#779087]">{t.icono} {t.titulo}</p>
                <Pregunta q={q} abierta={abierta === t.id + q.p} onClick={() => conmutar(t.id + q.p)} />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-[190px_1fr]">
            <nav className="flex gap-2 overflow-x-auto pb-1 sm:flex-col sm:overflow-visible sm:pb-0" aria-label="Temas de ayuda">
              {temas.map((t) => (
                <button key={t.id} type="button" onClick={() => { setTema(t.id); setAbierta(null); }}
                  className={"flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl px-3 text-left text-sm " + (actual.id === t.id ? "bg-[#e5f3ed] font-bold text-[#096653]" : "text-[#567067] hover:bg-[#f0f5f2]")}>
                  <span aria-hidden>{t.icono}</span><span className="whitespace-nowrap sm:whitespace-normal">{t.titulo}</span>
                </button>
              ))}
            </nav>
            <div className="space-y-2">
              {actual.preguntas.map((q) => <Pregunta key={q.p} q={q} abierta={abierta === actual.id + q.p} onClick={() => conmutar(actual.id + q.p)} />)}
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-[#f7faf8] p-3 text-xs text-[#567067]">
          <b className="text-[#17372f]">¿No encuentras la respuesta?</b> Pregunta a SeproBot (abajo a la derecha) o escribe a soporte: <a className="font-bold text-[#096653] underline" href="mailto:hola@limonadaweb.com?subject=Soporte%20ReciclaCat_Gest">hola@limonadaweb.com</a> · 628 482 475.
          <span className="mt-1 block">El programa ayuda a preparar la documentación; revisar y presentar los datos es responsabilidad del centro. <button type="button" className="font-bold text-[#096653] underline" onClick={abrirLegal}>Condiciones de uso</button> · Powered by Limonada Web</span>
        </div>
      </div>
    </Modal>
  );
}
