"use client";
/** Primitivas de interfaz: botones, campos, chips de estado, vacíos, avisos. Estética verde CAT, móvil primero. */
import type { ReactNode } from "react";

export const C = {
  verde: "#0d7969", verdeOscuro: "#096653", verdeClaro: "#e5f3ed", texto: "#17372f", gris: "#567067", grisClaro: "#657a72", borde: "#dce8e1",
};

export function Boton({ children, onClick, tipo = "primario", disabled, type = "button", className = "", ariaLabel }: {
  children: ReactNode; onClick?: () => void; tipo?: "primario" | "secundario" | "peligro" | "texto"; disabled?: boolean; type?: "button" | "submit"; className?: string; ariaLabel?: string;
}) {
  const base = "inline-flex min-h-[44px] items-center justify-center gap-1 rounded-xl px-4 text-sm font-bold transition disabled:opacity-40 ";
  const estilos = {
    primario: "bg-[#0d7969] text-white hover:bg-[#096653]",
    secundario: "bg-[#e5f3ed] text-[#096653] hover:bg-[#d3ebe0]",
    peligro: "bg-[#fde8e8] text-[#9b2c2c] hover:bg-[#f9d5d5]",
    texto: "text-[#0d7969] hover:bg-[#e5f3ed]",
  }[tipo];
  return <button type={type} onClick={onClick} disabled={disabled} aria-label={ariaLabel} className={base + estilos + " " + className}>{children}</button>;
}

export function Campo({ label, value, onChange, type = "text", placeholder, required, ayuda, list, step, min }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean; ayuda?: string; list?: string; step?: string; min?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-[#567067]">{label}{required && <span className="text-[#9b2c2c]"> *</span>}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} list={list} step={step} min={min}
        className="mt-1 min-h-[44px] w-full rounded-xl border border-[#cfe0d7] bg-white px-3 text-sm text-[#17372f] outline-none focus:border-[#0d7969]" />
      {ayuda && <span className="mt-1 block text-[11px] text-[#8aa39a]">{ayuda}</span>}
    </label>
  );
}

export function Select({ label, value, onChange, opciones, required }: { label: string; value: string; onChange: (v: string) => void; opciones: string[]; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-[#567067]">{label}{required && <span className="text-[#9b2c2c]"> *</span>}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 min-h-[44px] w-full rounded-xl border border-[#cfe0d7] bg-white px-3 text-sm">
        {opciones.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

const colores: Record<string, string> = {
  "Pendiente de revisar": "bg-[#fff3d9] text-[#9a6800]", Revisado: "bg-[#e8f0fe] text-[#1a56db]", Guardado: "bg-[#e5f3ed] text-[#096653]", "Error de lectura": "bg-[#fde8e8] text-[#9b2c2c]",
  real: "bg-[#e5f3ed] text-[#096653]", estimado: "bg-[#fff3d9] text-[#9a6800]", pendiente: "bg-[#fde8e8] text-[#9b2c2c]",
  Recibido: "bg-[#eceff1] text-[#546e7a]", Descontaminado: "bg-[#e8f0fe] text-[#1a56db]", Desmontado: "bg-[#fff3d9] text-[#9a6800]", Compactado: "bg-[#e5f3ed] text-[#096653]",
  demo: "bg-[#f3e8ff] text-[#6b21a8]",
};
export function Chip({ children, tono }: { children: ReactNode; tono?: string }) {
  const c = (tono && colores[tono]) || colores[String(children)] || "bg-[#eceff1] text-[#546e7a]";
  return <span className={"inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold " + c}>{children}</span>;
}
export const ChipDemo = () => <Chip tono="demo">DEMO</Chip>;

export function Vacio({ titulo, texto, accion }: { titulo: string; texto: string; accion?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#a9d2c4] bg-white p-6 text-center">
      <p className="font-bold text-[#17372f]">{titulo}</p>
      <p className="mt-1 text-sm text-[#657a72]">{texto}</p>
      {accion && <div className="mt-3">{accion}</div>}
    </div>
  );
}

export function Aviso({ tipo, children }: { tipo: "info" | "ok" | "error" | "aviso"; children: ReactNode }) {
  const c = { info: "bg-[#e8f0fe] text-[#1a56db]", ok: "bg-[#e5f3ed] text-[#096653]", error: "bg-[#fde8e8] text-[#9b2c2c]", aviso: "bg-[#fff3d9] text-[#9a6800]" }[tipo];
  return <div role={tipo === "error" ? "alert" : "status"} className={"rounded-xl px-3 py-2 text-sm " + c}>{children}</div>;
}

export function Cargando({ texto = "Procesando…" }: { texto?: string }) {
  return <div className="flex items-center gap-2 text-sm text-[#567067]" role="status"><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0d7969] border-t-transparent" />{texto}</div>;
}

export function Tarjeta({ titulo, valor, nota, onClick, tono }: { titulo: string; valor: string | number; nota?: string; onClick?: () => void; tono?: "aviso" | "ok" }) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp onClick={onClick} className={"rounded-2xl border bg-white p-4 text-left " + (onClick ? "hover:border-[#0d7969]" : "")}>
      <p className="text-xs text-[#657a72]">{titulo}</p>
      <p className={"mt-1 text-2xl font-bold " + (tono === "aviso" ? "text-[#9a6800]" : "text-[#0d7969]")}>{valor}</p>
      {nota && <p className="mt-1 text-xs text-[#657a72]">{nota}</p>}
    </Comp>
  );
}

export function Modal({ titulo, onCerrar, children, ancho = "max-w-2xl" }: { titulo: string; onCerrar: () => void; children: ReactNode; ancho?: string }) {
  return (
    <div className="fixed inset-0 z-[45] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onCerrar}>
      <div role="dialog" aria-label={titulo} onClick={(e) => e.stopPropagation()}
        className={"flex max-h-[95dvh] w-full flex-col rounded-t-2xl bg-white sm:rounded-2xl " + ancho}>
        <div className="flex shrink-0 items-center justify-between border-b border-[#e3efe9] px-4 py-3">
          <b className="text-[#17372f]">{titulo}</b>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="min-h-[44px] min-w-[44px] rounded-lg text-2xl leading-none text-[#567067] hover:bg-[#f0f5f2]">×</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

export const eur = (n: number) => n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
export const kg = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 1 }) + " kg";
export const hoy = () => new Date().toISOString().slice(0, 10);
