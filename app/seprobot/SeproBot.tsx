"use client";
/**
 * SeproBot — componente de interfaz.
 * Sin lógica de negocio: delega en conversation.ts (motor) y kbStore.ts (fichas).
 */

import { FormEvent, useEffect, useRef, useState } from "react";
import { ACCESOS_INICIALES, estadoInicial, procesar, saludoPorHora } from "./conversation";
import type { EstadoConversacion, MensajeBot } from "./types";

interface Mensaje {
  id: number;
  autor: "usuario" | "bot";
  texto: string;
  pasos?: string[];
  pie?: string;
  opciones?: string[];
  /** Mensaje de bienvenida: muestra los accesos iniciales. */
  bienvenida?: boolean;
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

function PuntosEscribiendo() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-xl bg-[#eef8f3] px-3 py-3">
        <span className="h-2 w-2 animate-bounce rounded-full bg-[#0d7969] [animation-delay:0ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-[#0d7969] [animation-delay:150ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-[#0d7969] [animation-delay:300ms]" />
      </div>
    </div>
  );
}

let contador = 0;
const nextId = () => ++contador;

export default function SeproBot() {
  const [abierto, setAbierto] = useState(false);
  const [escribiendo, setEscribiendo] = useState(false);
  const [entrada, setEntrada] = useState("");
  const [estado, setEstado] = useState<EstadoConversacion>(estadoInicial);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const listaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const ultimoBotRef = useRef<HTMLDivElement>(null);

  const bienvenida = () => {
    setEscribiendo(true);
    const t = setTimeout(() => {
      setEscribiendo(false);
      setMensajes([{ id: nextId(), autor: "bot", texto: `${saludoPorHora()}. ¿En qué puedo ayudarte?`, bienvenida: true }]);
    }, 600);
    return () => clearTimeout(t);
  };

  useEffect(() => {
    if (abierto && mensajes.length === 0 && !escribiendo) return bienvenida();
    if (abierto) inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  // Las respuestas largas empiezan visibles desde el inicio: se desplaza al comienzo del último mensaje del bot.
  useEffect(() => {
    const lista = listaRef.current;
    const ultimo = ultimoBotRef.current;
    if (!lista) return;
    if (ultimo) lista.scrollTo({ top: ultimo.offsetTop - lista.offsetTop - 8, behavior: "smooth" });
    else lista.scrollTo({ top: lista.scrollHeight });
  }, [mensajes, escribiendo]);

  const enviar = (texto: string) => {
    const t = texto.trim();
    if (!t || escribiendo) return;
    setMensajes((prev) => [...prev, { id: nextId(), autor: "usuario", texto: t }]);
    setEntrada("");
    setEscribiendo(true);
    setTimeout(() => {
      const r = procesar(estado, t);
      setEstado(r.estado);
      const nuevos: Mensaje[] = r.mensajes.map((m: MensajeBot) => ({
        id: nextId(),
        autor: "bot",
        texto: m.texto,
        pasos: m.pasos,
        pie: m.pie,
        opciones: m.opciones,
      }));
      setEscribiendo(false);
      setMensajes((prev) => [...prev, ...nuevos]);
      inputRef.current?.focus();
    }, 350);
  };

  const empezarDeNuevo = () => {
    setEstado(estadoInicial);
    setMensajes([]);
    setEntrada("");
    bienvenida();
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    enviar(entrada);
  };

  const ultimoIndice = mensajes.length - 1;
  const hayConversacion = mensajes.some((m) => m.autor === "usuario");

  return (
    <div className="fixed bottom-[68px] right-2 z-40 flex flex-col items-end gap-1 md:bottom-3 md:right-3" style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}>
      {abierto && (
        <section
          role="dialog"
          aria-label="SeproBot"
          className="flex w-[calc(100vw-16px)] max-w-[420px] flex-col overflow-hidden rounded-2xl border border-[#cce3d8] bg-white shadow-2xl sm:w-[400px] md:w-[420px]"
          style={{ height: "min(640px, calc(100dvh - 190px))" }}
        >
          {/* Cabecera */}
          <header className="flex shrink-0 items-center justify-between border-b border-[#e3efe9] px-4 py-3">
            <div className="flex items-center gap-2">
              <img src="/seprobot.png" className="h-8 w-8 object-contain" alt="" />
              <b className="text-[#17372f]">SeproBot</b>
            </div>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar"
              className="rounded-lg px-2 py-1 text-xl leading-none text-[#567067] hover:bg-[#f0f5f2]"
            >
              ×
            </button>
          </header>

          {/* Franja propia para "Empezar de nuevo": nunca tapa texto */}
          {hayConversacion && (
            <div className="flex shrink-0 justify-end border-b border-[#e3efe9] bg-[#f7faf8] px-3 py-1.5">
              <button
                type="button"
                onClick={empezarDeNuevo}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-[#0d7969] hover:bg-[#e5f3ed]"
              >
                ↺ Empezar de nuevo
              </button>
            </div>
          )}

          {/* Historial */}
          <div ref={listaRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {mensajes.map((m, i) => {
              const esUltimoBot = m.autor === "bot" && !mensajes.slice(i + 1).some((x) => x.autor === "bot");
              return (
                <div
                  key={m.id}
                  ref={esUltimoBot ? ultimoBotRef : undefined}
                  className={m.autor === "usuario" ? "flex justify-end" : "flex justify-start"}
                >
                  <div
                    className={
                      (m.autor === "usuario" ? "bg-[#0d7969] text-white" : "bg-[#eef8f3] text-[#17372f]") +
                      " max-w-[90%] whitespace-pre-wrap break-words rounded-xl px-3 py-2 text-sm leading-5"
                    }
                  >
                    <Texto t={m.texto} />
                    {m.pasos && m.pasos.length > 0 && (
                      <ol className="mt-2 list-decimal space-y-1 pl-5">
                        {m.pasos.map((p, k) => (
                          <li key={k}>{p}</li>
                        ))}
                      </ol>
                    )}
                    {m.pie && <p className="mt-2 border-t border-[#cfe5da] pt-1 text-[11px] text-[#567067]">{m.pie}</p>}
                    {m.bienvenida && i === ultimoIndice && (
                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                        {ACCESOS_INICIALES.map((a) => (
                          <button
                            key={a.etiqueta}
                            type="button"
                            onClick={() => enviar(a.texto)}
                            className="rounded-lg border border-[#0d7969] bg-white px-2 py-1.5 text-left text-xs font-bold text-[#0d7969] hover:bg-[#e5f3ed]"
                          >
                            {a.etiqueta}
                          </button>
                        ))}
                      </div>
                    )}
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
              );
            })}
            {escribiendo && <PuntosEscribiendo />}
          </div>

          {/* Entrada fija abajo */}
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
              disabled={!entrada.trim() || escribiendo}
              className="rounded-xl bg-[#0d7969] px-4 text-sm font-bold text-white disabled:opacity-40"
            >
              Enviar
            </button>
          </form>
        </section>
      )}

      {/* Lanzador: personaje flotante sin caja ni círculo */}
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-label={abierto ? "Cerrar SeproBot" : "Abrir SeproBot"}
        className="flex flex-col items-center bg-transparent"
      >
        <img src="/seprobot.png" className="h-20 w-20 object-contain drop-shadow-md sm:h-24 sm:w-24" alt="SeproBot" />
        <span className="-mt-2 text-xs font-extrabold text-[#17372f]">SeproBot</span>
      </button>
    </div>
  );
}
