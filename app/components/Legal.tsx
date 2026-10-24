"use client";
/** Textos legales de ReciclaCat_Gest (se leen de /public/legal). */
import { useEffect, useState } from "react";
import { Modal } from "./ui";

export const DOCS_LEGALES = {
  condiciones: { titulo: "Condiciones de uso, licencia y privacidad", archivo: "/legal/CONDICIONES-DE-USO-Y-PRIVACIDAD.txt" },
  terceros: { titulo: "Avisos de terceros (software libre)", archivo: "/legal/AVISOS-DE-TERCEROS.txt" },
} as const;
export type DocLegal = keyof typeof DOCS_LEGALES;

export function VisorLegal({ doc, onCerrar }: { doc: DocLegal; onCerrar: () => void }) {
  const [texto, setTexto] = useState("Cargando…");
  useEffect(() => {
    fetch(DOCS_LEGALES[doc].archivo).then((r) => (r.ok ? r.text() : Promise.reject())).then(setTexto)
      .catch(() => setTexto("No se ha podido abrir el documento. Consulta https://www.limonadaweb.com o escribe a hola@limonadaweb.com."));
  }, [doc]);
  return (
    <Modal titulo={DOCS_LEGALES[doc].titulo} onCerrar={onCerrar} ancho="max-w-3xl">
      <pre className="max-h-[70dvh] overflow-auto whitespace-pre-wrap rounded-xl border bg-[#fbfdfc] p-4 font-mono text-[12px] leading-5 text-[#17372f]">{texto}</pre>
    </Modal>
  );
}

/** Resumen legal para Ajustes. */
export function BloqueLegal({ abrir }: { abrir: (d: DocLegal) => void }) {
  return (
    <div className="space-y-2 rounded-2xl border border-[#cfe0d7] bg-white p-3">
      <p className="text-sm font-bold">Aviso legal y privacidad</p>
      <p className="text-xs text-[#657a72]">Los datos del centro se guardan solo en este ordenador. Limonada Web no recibe, no guarda y no puede ver tus datos ni tus documentos; la lectura de documentos se hace en el propio equipo y el programa no envía estadísticas. La única conexión a internet es para buscar actualizaciones.</p>
      <p className="text-xs text-[#657a72]">Herramienta de ayuda: revisa siempre los datos leídos y comprueba la memoria antes de presentarla. SeproBot es informativo, no asesoramiento jurídico.</p>
      <p className="text-[11px] text-[#8aa39a]">Titular: Mari Ángeles Pedrosa Alarcón (Limonada Web) · NIF 53691928S · Málaga · hola@limonadaweb.com · +34 628 482 475</p>
      <div className="flex flex-wrap gap-3 text-xs font-bold text-[#096653]">
        <button type="button" className="underline" onClick={() => abrir("condiciones")}>Condiciones de uso y privacidad</button>
        <button type="button" className="underline" onClick={() => abrir("terceros")}>Avisos de terceros</button>
      </div>
    </div>
  );
}
