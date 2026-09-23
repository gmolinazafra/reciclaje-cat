"use client";
/**
 * SeproBot — componente de interfaz.
 * Sin lógica de negocio: delega en conversation.ts (motor) y knowledgeBase.ts (fichas).
 */

import { FormEvent, useEffect, useRef, useState } from "react";
import { estadoInicial, procesar } from "./conversation";
import type { EstadoConversacion, MensajeBot } from "./types";

interface Mensaje {
  autor: "usuario" | "bot";
  texto: string;
  pie?: string;
  opciones?: string[];
}

/** Render mínimo: **negrita** y saltos de línea. Sin HTML externo. */
function Texto({ t }: { t: string }) {
  const partes = t.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {partes.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? <b key={i}>{p.slice(2, -2)}</b> : <span key={i}>{p}</span>,
      )}
    </>
  );
}

export default function SeproBot() {
  const [abierto, setAbierto] = useState(false);
  const [entrada, setEntrada] = useState("");
  const [estado, setEstado] = useState<EstadoConversacion>(estadoInicial);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const finRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: "end" });
  }, [mensajes, abierto]);

  useEffect(() => {
    if (abierto) inputRef.current?.focus();
  }, [abierto]);

  const enviar = (texto: string) => {
    const t = texto.trim();
    if (!t) return;
    const r = procesar(estado, t);
    setEstado(r.estado);
    const nuevos: Mensaje[] = r.mensajes.map((m: MensajeBot) => ({
      autor: "bot",
      texto: m.texto,
      pie: m.pie,
      opciones: m.opciones,
    }));
    setMensajes((prev) => [...prev, { autor: "usuario", texto: t }, ...nuevos]);
    setEntrada("");
  };

  const nuevaConsulta = () => {
    setEstado(estadoInicial);
    setMensajes([]);
    setEntrada("");
    inputRef.current?.focus();
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    enviar(entrada);
  };

  const ultimoIndice = mensajes.length - 1;

  return (
    <div className="fixed bottom-2 right-2 z-40 flex flex-col items-end gap-1 sm:bottom-3 sm:right-3">
      {abierto && (
        <section
          role="dialog"
          aria-label="SeproBot"
          className="flex w-[calc(100vw-16px)] max-w-[420px] flex-col overflow-hidden rounded-2xl border border-[#cce3d8] bg-white shadow-2xl sm:w-[400px] md:w-[420px]"
          style={{ height: "min(600px, calc(100dvh - 140px))" }}
        >
          {/* Cabecera */}
          <header className="flex shrink-0 items-center justify-between border-b border-[#e3efe9] px-4 py-3">
            <div className="flex items-center gap-2">
              <img src="/seprobot.png" className="h-8 w-8 object-contain" alt="" />
              <b className="text-[#17372f]">SeproBot</b>
            </div>
            <div className="flex items-center gap-2">
              {mensajes.length > 0 && (
                <button
                  type="button"
                  onClick={nuevaConsulta}
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-[#0d7969] hover:bg-[#e5f3ed]"
                >
                  Nueva consulta
                </button>
              )}
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar"
                className="rounded-lg px-2 py-1 text-xl leading-none text-[#567067] hover:bg-[#f0f5f2]"
              >
                ×
              </button>
            </div>
          </header>

          {/* Historial */}
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {mensajes.map((m, i) => (
              <div key={i} className={m.autor === "usuario" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    (m.autor === "usuario"
                      ? "bg-[#0d7969] text-white"
                      : "bg-[#eef8f3] text-[#17372f]") +
                    " max-w-[88%] whitespace-pre-wrap break-words rounded-xl px-3 py-2 text-sm leading-5"
                  }
                >
                  <Texto t={m.texto} />
                  {m.pie && <p className="mt-2 border-t border-[#cfe5da] pt-1 text-[11px] text-[#567067]">{m.pie}</p>}
                  {m.opciones && i === ultimoIndice && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.opciones.map((o) => (
                        <button
                          key={o}
                          type="button"
                          onClick={() => enviar(o)}
                          className="rounded-lg border border-[#0d7969] bg-white px-2.5 py-1 text-xs font-bold text-[#0d7969] hover:bg-[#e5f3ed]"
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={finRef} />
          </div>

          {/* Entrada */}
          <form onSubmit={onSubmit} className="flex shrink-0 gap-2 border-t border-[#e3efe9] p-3">
            <input
              ref={inputRef}
              value={entrada}
              onChange={(e) => setEntrada(e.target.value)}
              placeholder="Escribe tu consulta…"
              aria-label="Escribe tu consulta"
              className="min-w-0 flex-1 rounded-xl border border-[#cfe0d7] px-3 py-2.5 text-sm outline-none focus:border-[#0d7969]"
            />
            <button
              type="submit"
              disabled={!entrada.trim()}
              className="rounded-xl bg-[#0d7969] px-4 text-sm font-bold text-white disabled:opacity-40"
            >
              Enviar
            </button>
          </form>
        </section>
      )}

      {/* Lanzador */}
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-label={abierto ? "Cerrar SeproBot" : "Abrir SeproBot"}
        className="flex flex-col items-center"
      >
        <img src="/seprobot.png" className="h-20 w-20 object-contain sm:h-24 sm:w-24" alt="SeproBot" />
        <span className="-mt-2 text-xs font-extrabold text-[#17372f]">SeproBot</span>
      </button>
    </div>
  );
}
