"use client";
/**
 * Doble autenticación (solo versión Windows): contraseña + código de una app autenticadora
 * (Google Authenticator, Microsoft Authenticator, Authy, 2FAS…). Todo se calcula en el equipo, sin internet.
 * © Limonada Web.
 */
import { useEffect, useState } from "react";
import { puente } from "../lib/escritorio";
import type { EstadoSeguridad } from "../lib/escritorio";
import { Aviso, Boton, Campo } from "./ui";

const MINUTOS = [
  { v: 5, t: "5 minutos" }, { v: 15, t: "15 minutos" }, { v: 30, t: "30 minutos" }, { v: 60, t: "1 hora" }, { v: 0, t: "Nunca (solo al abrir)" },
];

type Paso = "inicio" | "clave" | "qr" | "codigos" | "gestionar";

function CodigosRecuperacion({ codigos, onListo }: { codigos: string[]; onListo: () => void }) {
  const [guardados, setGuardados] = useState(false);
  const texto = `ReciclaCat_Gest · Códigos de recuperación (doble autenticación)\r\nGenerados: ${new Date().toLocaleString("es-ES")}\r\nCada código sirve UNA sola vez. Guárdalos en un lugar seguro, fuera del ordenador.\r\n\r\n${codigos.join("\r\n")}\r\n\r\nPowered by Limonada Web\r\n`;
  const descargar = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([texto], { type: "text/plain;charset=utf-8" }));
    a.download = "ReciclaCat_Gest-codigos-recuperacion.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  return (
    <div className="space-y-2">
      <Aviso tipo="aviso">Guarda estos <b>códigos de recuperación</b>. Si pierdes o cambias de móvil, son la única forma de entrar. Cada uno sirve una vez y <b>no se volverán a mostrar</b>.</Aviso>
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#cfe0d7] bg-white p-3 font-mono text-sm font-bold tracking-wider text-[#096653]">
        {codigos.map((c) => <span key={c} className="select-all text-center">{c}</span>)}
      </div>
      <div className="flex flex-wrap gap-2">
        <Boton tipo="secundario" onClick={descargar}>Descargar .txt</Boton>
        <Boton tipo="secundario" onClick={async () => { try { await navigator.clipboard.writeText(codigos.join("\n")); } catch { /* sin portapapeles */ } }}>Copiar</Boton>
        <Boton tipo="secundario" onClick={() => window.print()}>Imprimir</Boton>
      </div>
      <label className="flex items-start gap-2 text-xs text-[#17372f]"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#0d7969]" checked={guardados} onChange={(e) => setGuardados(e.target.checked)} />He guardado los códigos en un lugar seguro.</label>
      <Boton disabled={!guardados} onClick={onListo}>Listo</Boton>
    </div>
  );
}

export default function DobleFactor({ cuenta }: { cuenta: string }) {
  const p = puente();
  const [estado, setEstado] = useState<EstadoSeguridad | null>(null);
  const [paso, setPaso] = useState<Paso>("inicio");
  const [clave, setClave] = useState("");
  const [clave2, setClave2] = useState("");
  const [codigo, setCodigo] = useState("");
  const [minutos, setMinutos] = useState(15);
  const [qr, setQr] = useState<{ qr: string; secreto: string } | null>(null);
  const [codigos, setCodigos] = useState<string[] | null>(null);
  const [accion, setAccion] = useState<"desactivar" | "codigos" | null>(null);
  const [msg, setMsg] = useState<{ tipo: "ok" | "error"; t: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const refrescar = () => p?.seguridad?.().then((e) => { setEstado(e); setMinutos(e.minutosBloqueo); }).catch(() => setEstado(null));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refrescar(); }, []);
  if (!p?.seguridad || !estado) return null;

  const limpiar = () => { setClave(""); setClave2(""); setCodigo(""); setQr(null); setAccion(null); };
  const soloCifras = (v: string) => v.replace(/\D/g, "").slice(0, 6);
  const ejecutar = async (fn: () => Promise<void>) => { setOcupado(true); setMsg(null); try { await fn(); } catch { setMsg({ tipo: "error", t: "No se ha podido completar. Vuelve a intentarlo." }); } setOcupado(false); };

  const cabecera = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm font-bold">🔐 Doble autenticación</p>
      <span className={"rounded-full px-2 py-0.5 text-[11px] font-bold " + (estado.activa ? "bg-[#e5f3ed] text-[#096653]" : "bg-[#f1f5f3] text-[#657a72]")}>{estado.activa ? "Activada" : "Desactivada"}</span>
    </div>
  );

  // ── Ya activada ────────────────────────────────────────────────────────────
  if (estado.activa) {
    return (
      <div className="space-y-2 rounded-2xl border border-[#cfe0d7] bg-[#f7faf8] p-3">
        {cabecera}
        {codigos ? <CodigosRecuperacion codigos={codigos} onListo={() => { setCodigos(null); refrescar(); }} /> : (
          <>
            <p className="text-xs text-[#657a72]">Para entrar se pide la contraseña y el código de la app autenticadora. Quedan <b>{estado.recuperacionRestantes}</b> códigos de recuperación{estado.recuperacionRestantes <= 2 ? " — genera códigos nuevos" : ""}.</p>
            {msg && <Aviso tipo={msg.tipo}>{msg.t}</Aviso>}
            <label className="block max-w-xs">
              <span className="text-xs font-bold text-[#567067]">Bloquear tras un rato sin usar el equipo</span>
              <select value={minutos} onChange={async (e) => { const m = parseInt(e.target.value, 10); setMinutos(m); await p.minutosBloqueo(m); refrescar(); }} className="mt-1 min-h-[44px] w-full rounded-xl border border-[#cfe0d7] bg-white px-3 text-sm">
                {MINUTOS.map((x) => <option key={x.v} value={x.v}>{x.t}</option>)}
              </select>
              <span className="mt-1 block text-[11px] text-[#8aa39a]">También se bloquea al bloquear Windows (Windows + L) o al suspender el equipo.</span>
            </label>
            {!accion && (
              <div className="flex flex-wrap gap-2">
                <Boton onClick={() => p.bloquear()}>Bloquear ahora</Boton>
                <Boton tipo="secundario" onClick={() => { limpiar(); setAccion("codigos"); }}>Nuevos códigos de recuperación</Boton>
                <Boton tipo="peligro" onClick={() => { limpiar(); setAccion("desactivar"); }}>Desactivar</Boton>
              </div>
            )}
            {accion && (
              <div className="space-y-2 rounded-xl border border-[#cfe0d7] bg-white p-3">
                <p className="text-xs font-bold">{accion === "desactivar" ? "Para desactivar la doble autenticación, confirma que eres tú:" : "Para generar códigos nuevos (los anteriores dejarán de valer), confirma que eres tú:"}</p>
                <Campo label="Contraseña" type="password" value={clave} onChange={setClave} />
                <Campo label="Código de la app (o un código de recuperación)" value={codigo} onChange={setCodigo} placeholder="000000" />
                <div className="flex flex-wrap gap-2">
                  <Boton tipo={accion === "desactivar" ? "peligro" : "primario"} disabled={ocupado || !clave || !codigo} onClick={() => ejecutar(async () => {
                    if (accion === "desactivar") {
                      const r = await p.desactivarDobleFactor(clave, codigo);
                      if (!r.ok) return setMsg({ tipo: "error", t: r.error ?? "No se ha podido desactivar." });
                      limpiar(); setMsg({ tipo: "ok", t: "Doble autenticación desactivada. Ya puedes borrar ReciclaCat_Gest de la app autenticadora." }); refrescar();
                    } else {
                      const r = await p.nuevosCodigosRecuperacion(clave, codigo);
                      if (!r.ok || !r.codigos) return setMsg({ tipo: "error", t: r.error ?? "No se han podido generar." });
                      limpiar(); setCodigos(r.codigos);
                    }
                  })}>{accion === "desactivar" ? "Desactivar" : "Generar códigos"}</Boton>
                  <Boton tipo="texto" onClick={() => { limpiar(); setMsg(null); }}>Cancelar</Boton>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ── Configuración ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-2 rounded-2xl border border-[#cfe0d7] bg-[#f7faf8] p-3">
      {cabecera}
      {paso === "inicio" && (
        <>
          <p className="text-xs text-[#657a72]">Protege el programa con una contraseña y un código que cambia cada 30 segundos en tu móvil (Google Authenticator, Microsoft Authenticator, Authy, 2FAS…). Funciona sin internet.</p>
          {msg && <Aviso tipo={msg.tipo}>{msg.t}</Aviso>}
          <Boton onClick={() => { limpiar(); setMsg(null); setPaso("clave"); }}>Activar doble autenticación</Boton>
        </>
      )}

      {paso === "clave" && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-[#0d7969]">Paso 1 de 3 · Elige una contraseña</p>
          <Campo label="Contraseña (mínimo 8 caracteres)" type="password" value={clave} onChange={setClave} />
          <Campo label="Repite la contraseña" type="password" value={clave2} onChange={setClave2} />
          {msg && <Aviso tipo={msg.tipo}>{msg.t}</Aviso>}
          <div className="flex flex-wrap gap-2">
            <Boton disabled={ocupado || clave.length < 8 || !clave2} onClick={() => ejecutar(async () => {
              const r = await p.prepararDobleFactor(clave, clave2, cuenta);
              if (!r.ok || !r.qr || !r.secreto) return setMsg({ tipo: "error", t: r.error ?? "No se ha podido preparar." });
              setQr({ qr: r.qr, secreto: r.secreto }); setPaso("qr");
            })}>Siguiente</Boton>
            <Boton tipo="texto" onClick={() => { limpiar(); setMsg(null); setPaso("inicio"); }}>Cancelar</Boton>
          </div>
        </div>
      )}

      {paso === "qr" && qr && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-[#0d7969]">Paso 2 de 3 · Escanea el código con tu app autenticadora</p>
          <div className="flex flex-wrap items-start gap-3">
            <img src={qr.qr} alt="Código QR para la app autenticadora" className="h-44 w-44 rounded-xl border border-[#cfe0d7] bg-white p-1" />
            <div className="min-w-0 flex-1 space-y-1 text-xs text-[#657a72]">
              <p>En la app, pulsa <b>«+»</b> → <b>«Escanear código QR»</b> y apunta a la pantalla.</p>
              <p>¿No puedes escanear? Elige «Introducir clave» y escribe:</p>
              <code className="block select-all break-all rounded-lg border border-[#cfe0d7] bg-white px-2 py-1 font-mono text-sm font-bold text-[#096653]">{qr.secreto}</code>
              <p>Tipo: basada en el tiempo · Cuenta: {cuenta || "ReciclaCat_Gest"}</p>
            </div>
          </div>
          <p className="text-xs font-bold text-[#0d7969]">Paso 3 de 3 · Escribe el código de 6 cifras que muestra la app</p>
          <Campo label="Código" value={codigo} onChange={(v) => setCodigo(soloCifras(v))} placeholder="000000" />
          <label className="block max-w-xs">
            <span className="text-xs font-bold text-[#567067]">Bloquear tras un rato sin usar el equipo</span>
            <select value={minutos} onChange={(e) => setMinutos(parseInt(e.target.value, 10))} className="mt-1 min-h-[44px] w-full rounded-xl border border-[#cfe0d7] bg-white px-3 text-sm">
              {MINUTOS.map((x) => <option key={x.v} value={x.v}>{x.t}</option>)}
            </select>
          </label>
          {msg && <Aviso tipo={msg.tipo}>{msg.t}</Aviso>}
          <div className="flex flex-wrap gap-2">
            <Boton disabled={ocupado || codigo.length !== 6} onClick={() => ejecutar(async () => {
              const r = await p.confirmarDobleFactor(codigo, minutos);
              if (!r.ok || !r.codigos) { setCodigo(""); return setMsg({ tipo: "error", t: r.error ?? "El código no coincide." }); }
              setCodigos(r.codigos); setPaso("codigos"); limpiar();
            })}>Activar</Boton>
            <Boton tipo="texto" onClick={async () => { await p.cancelarDobleFactor(); limpiar(); setMsg(null); setPaso("inicio"); }}>Cancelar</Boton>
          </div>
        </div>
      )}

      {paso === "codigos" && codigos && (
        <CodigosRecuperacion codigos={codigos} onListo={() => { setCodigos(null); setPaso("inicio"); setMsg({ tipo: "ok", t: "Doble autenticación activada." }); refrescar(); }} />
      )}
    </div>
  );
}
