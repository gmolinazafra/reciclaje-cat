"use client";
/** Piezas: registrar venta manual e importar ventas desde Excel/CSV con mapeo de columnas y errores por fila. */
import { useState } from "react";
import { CAMPOS_MAPEO, leerArchivo, mapeoAutomatico, validarFilas } from "../../lib/importExcel";
import type { Fila, FilaValidada, Mapeo } from "../../lib/importExcel";
import { buscarPeso } from "../../lib/pesos";
import { ops, uid } from "../../lib/repo";
import type { BaseDatos, OrigenPeso, Venta } from "../../lib/types";
import { Aviso, Boton, Campo, Cargando, Chip, ChipDemo, Modal, Select, Vacio, eur, hoy, kg } from "../ui";

interface Props { db: BaseDatos; set: (fn: (db: BaseDatos) => BaseDatos) => void; abrir?: "manual" | "excel" | null; onAbierto?: () => void }

import { DICCIONARIO_PESOS } from "../../lib/diccionarioPesos";
const ARTICULOS_LISTA = [...new Set(DICCIONARIO_PESOS.filter((a) => a.kg > 0).map((a) => a.articulo))].sort();

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export function LineaFactura({ db, set, onCerrar }: { db: BaseDatos; set: Props["set"]; onCerrar: () => void }) {
  const [f, setF] = useState({ pieza: "", referencia: "", descripcion: "", cantidad: "1", fecha: hoy(), precio: "", peso: "", observaciones: "", vehiculoId: "", factura: "" });
  const [ok, setOk] = useState(false);
  const u = (k: keyof typeof f, v: string) => setF({ ...f, [k]: v });
  const coincidencia = buscarPeso(f.pieza, f.descripcion);
  const estimado = coincidencia?.kg ?? null;
  const cantidad = parseFloat(f.cantidad) || 0;
  const pesoReal = parseFloat(f.peso.replace(",", "."));
  const origenPeso: OrigenPeso = pesoReal > 0 ? "real" : estimado !== null ? "estimado" : "pendiente";
  const pesoKg = pesoReal > 0 ? pesoReal : estimado !== null ? +(estimado * cantidad).toFixed(2) : 0;
  const valido = f.pieza.trim() && cantidad > 0 && f.fecha;

  const guardar = () => {
    const v: Venta = {
      id: uid(), ejercicio: db.ejercicio, fecha: f.fecha, mes: parseInt(f.fecha.slice(5, 7), 10), pieza: f.pieza.trim(), referencia: f.referencia.trim(),
      descripcion: f.descripcion.trim() || f.pieza.trim(), cantidad, precio: parseFloat(f.precio.replace(",", ".")) || 0, pesoKg, origenPeso,
      observaciones: [f.factura.trim() ? `Factura ${f.factura.trim()}` : "", f.observaciones.trim()].filter(Boolean).join(" · ") || undefined, vehiculoId: f.vehiculoId || undefined, origen: "factura",
    };
    set((d) => ops.addVentas(d, [v]));
    setOk(true);
    setTimeout(onCerrar, 900);
  };

  return (
    <Modal titulo="Registrar pieza desde factura" onCerrar={onCerrar}>
      {ok ? <Aviso tipo="ok">Línea guardada. Los kilos se han sumado a «Kilos gestionados piezas».</Aviso> : (
        <div className="space-y-3">
          <Aviso tipo="info">Las piezas vendidas se toman de las facturas. Lo que cuenta para la memoria son los <b>kilos gestionados</b>; la descripción solo sirve para buscar el peso en el diccionario.</Aviso>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Nº factura" value={f.factura} onChange={(v) => u("factura", v)} placeholder="F-2026-0123" />
            <Campo label="Pieza (como en la factura)" value={f.pieza} onChange={(v) => u("pieza", v)} required placeholder="MOTOR COMPLETO, PUERTA DELANTERA DERECHA…" list="articulos-pesos" />
            <Campo label="Referencia" value={f.referencia} onChange={(v) => u("referencia", v)} placeholder="OEM / interna" />
            <Campo label="Detalle (opcional)" value={f.descripcion} onChange={(v) => u("descripcion", v)} placeholder="lado, versión…" />
            <Campo label="Cantidad" value={f.cantidad} onChange={(v) => u("cantidad", v)} type="number" min="1" required />
            <Campo label="Fecha" value={f.fecha} onChange={(v) => u("fecha", v)} type="date" required />
            <Campo label="Precio unitario (€)" value={f.precio} onChange={(v) => u("precio", v)} type="number" step="0.01" min="0" />
            <Campo label="Peso real total (kg)" value={f.peso} onChange={(v) => u("peso", v)} type="number" step="0.1" min="0" ayuda="Opcional. Si lo dejas vacío se estima con el diccionario." />
            <Select label="Vehículo de origen" value={f.vehiculoId} onChange={(v) => u("vehiculoId", v)} opciones={["", ...db.vehiculos.filter((x) => x.ejercicio === db.ejercicio).map((x) => x.id)]} />
          </div>
          <Campo label="Observaciones" value={f.observaciones} onChange={(v) => u("observaciones", v)} />
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[#657a72]">Peso que se registrará:</span><b>{kg(pesoKg)}</b><Chip>{origenPeso}</Chip>
            {origenPeso === "estimado" && coincidencia && <span className="text-xs text-[#657a72]">({coincidencia.kg} kg/ud · diccionario: {coincidencia.articulo}{coincidencia.exacta ? "" : ", aproximado"})</span>}
            {origenPeso === "pendiente" && <span className="text-xs text-[#9b2c2c]">Sin coincidencia en el diccionario: indica el peso o quedará pendiente.</span>}
          </div>
          <datalist id="articulos-pesos">{ARTICULOS_LISTA.map((a) => <option key={a} value={a} />)}</datalist>
          <div className="flex justify-end gap-2"><Boton tipo="texto" onClick={onCerrar}>Cancelar</Boton><Boton onClick={guardar} disabled={!valido}>Guardar línea</Boton></div>
        </div>
      )}
    </Modal>
  );
}

export function ImportarExcel({ db, set, onCerrar }: { db: BaseDatos; set: Props["set"]; onCerrar: () => void }) {
  const [fase, setFase] = useState<"archivo" | "leyendo" | "mapeo" | "guardado" | "error">("archivo");
  const [error, setError] = useState("");
  const [nombre, setNombre] = useState("");
  const [encabezados, setEncabezados] = useState<string[]>([]);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [mapeo, setMapeo] = useState<Mapeo>({});
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const validadas: FilaValidada[] = fase === "mapeo" ? validarFilas(filas, mapeo, db.ejercicio, mes) : [];
  const ok = validadas.filter((v) => v.venta);
  const conError = validadas.filter((v) => !v.venta);
  const cnt = (o: OrigenPeso) => ok.filter((v) => v.venta!.origenPeso === o).length;

  const cargar = async (f: File) => {
    setNombre(f.name); setFase("leyendo");
    try {
      const r = await leerArchivo(f);
      if (!r.filas.length) { setError("El archivo no tiene filas de datos (la primera fila debe ser el encabezado)."); setFase("error"); return; }
      setEncabezados(r.encabezados); setFilas(r.filas); setMapeo(mapeoAutomatico(r.encabezados)); setFase("mapeo");
    } catch (e) { setError((e as Error).message); setFase("error"); }
  };
  const guardar = () => {
    const ventas: Venta[] = ok.map((v) => ({ ...v.venta!, id: uid(), origen: "excel" }));
    set((d) => ops.addVentas(d, ventas));
    setFase("guardado");
  };
  const faltaObligatorio = CAMPOS_MAPEO.some((c) => c.obligatorio && !mapeo[c.clave]);

  return (
    <Modal titulo="Importar piezas desde Excel de facturación" onCerrar={onCerrar} ancho="max-w-4xl">
      {fase === "archivo" && (
        <div className="space-y-3">
          <Aviso tipo="info">Excel (.xlsx/.xls) o CSV exportado de facturación, con encabezado en la primera fila. Si el listado no trae kilos, se completan con el <b>diccionario de pesos</b> ({ARTICULOS_LISTA.length} artículos). Verás la vista previa antes de guardar.</Aviso>
          <label className="block min-h-[96px] cursor-pointer rounded-2xl border-2 border-dashed border-[#a9d2c4] bg-[#f7faf8] p-6 text-center text-sm font-bold text-[#096653] hover:bg-[#e5f3ed]">
            📊 Elegir Excel o CSV
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && cargar(e.target.files[0])} />
          </label>
        </div>
      )}
      {fase === "leyendo" && <div className="py-8"><Cargando texto={`Leyendo ${nombre}…`} /></div>}
      {fase === "error" && <div className="space-y-3"><Aviso tipo="error">{error}</Aviso><Boton tipo="secundario" onClick={() => setFase("archivo")}>Elegir otro archivo</Boton></div>}
      {fase === "mapeo" && (
        <div className="space-y-3">
          <p className="text-sm text-[#657a72]">{nombre} · {filas.length} filas · columnas: {encabezados.join(", ")}</p>
          <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-4">
            <Select label="Mes del listado" value={MESES[mes - 1]} onChange={(v) => setMes(MESES.indexOf(v) + 1)} opciones={MESES} />
            {CAMPOS_MAPEO.map((c) => (
              <Select key={c.clave} label={c.etiqueta} required={c.obligatorio} value={mapeo[c.clave] ?? ""} onChange={(v) => setMapeo({ ...mapeo, [c.clave]: v || undefined })} opciones={["", ...encabezados]} />
            ))}
          </div>
          {faltaObligatorio && <Aviso tipo="aviso">Asigna las columnas obligatorias (descripción y cantidad).</Aviso>}
          <div className="flex flex-wrap gap-2 text-xs">
            <Chip tono="Guardado">{ok.length} filas válidas</Chip>
            {conError.length > 0 && <Chip tono="Error de lectura">{conError.length} con error</Chip>}
            <Chip tono="real">{cnt("real")} peso real</Chip><Chip tono="estimado">{cnt("estimado")} estimado por diccionario</Chip><Chip tono="pendiente">{cnt("pendiente")} sin peso</Chip>
          </div>
          <div className="max-h-[40dvh] overflow-auto rounded-xl border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#f7faf8]"><tr>{["#", "Descripción", "Ref.", "Cant.", "Precio", "Peso", "Origen", "Fecha", "Errores"].map((h) => <th key={h} className="px-2 py-1 text-left font-bold text-[#567067]">{h}</th>)}</tr></thead>
              <tbody>
                {validadas.slice(0, 200).map((v) => (
                  <tr key={v.indice} className={v.venta ? "" : "bg-[#fde8e8]"}>
                    <td className="px-2 py-1">{v.indice + 2}</td>
                    <td className="px-2 py-1">{v.venta?.descripcion ?? (mapeo.descripcion ? filas[v.indice][mapeo.descripcion] : "")}</td>
                    <td className="px-2 py-1">{v.venta?.referencia}</td><td className="px-2 py-1">{v.venta?.cantidad}</td>
                    <td className="px-2 py-1">{v.venta ? eur(v.venta.precio) : ""}</td><td className="px-2 py-1">{v.venta ? kg(v.venta.pesoKg) : ""}</td>
                    <td className="px-2 py-1">{v.venta && <Chip>{v.venta.origenPeso}</Chip>}</td><td className="px-2 py-1">{v.venta?.fecha}</td>
                    <td className="px-2 py-1 text-[#9b2c2c]">{v.errores.join("; ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {validadas.length > 200 && <p className="p-2 text-xs text-[#657a72]">Mostrando 200 de {validadas.length} filas.</p>}
          </div>
          <div className="flex justify-end gap-2"><Boton tipo="texto" onClick={onCerrar}>Cancelar</Boton><Boton onClick={guardar} disabled={!ok.length || faltaObligatorio}>Guardar {ok.length} ventas</Boton></div>
        </div>
      )}
      {fase === "guardado" && <div className="space-y-3"><Aviso tipo="ok">{ok.length} ventas guardadas en {MESES[mes - 1]}. {conError.length ? `${conError.length} filas con error no se han importado.` : ""}</Aviso><Boton onClick={onCerrar}>Cerrar</Boton></div>}
    </Modal>
  );
}

export default function Piezas({ db, set, abrir, onAbierto }: Props) {
  const [modal, setModal] = useState<"manual" | "excel" | null>(abrir ?? null);
  const kgPiezas = db.ventas.filter((v) => v.ejercicio === db.ejercicio).reduce((a, v) => a + v.pesoKg, 0);
  if (abrir && !modal) { setModal(abrir); onAbierto?.(); }
  const ventas = db.ventas.filter((v) => v.ejercicio === db.ejercicio).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const cnt = (o: OrigenPeso) => ventas.filter((v) => v.origenPeso === o).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-2xl border bg-white p-3"><p className="text-[11px] text-[#657a72]">Kilos gestionados piezas</p><p className="text-xl font-bold text-[#0d7969]">{kg(kgPiezas)}</p></div>
        <div className="rounded-2xl border bg-white p-3"><p className="text-[11px] text-[#657a72]">Peso real</p><p className="text-xl font-bold">{cnt("real")}</p></div>
        <div className="rounded-2xl border bg-white p-3"><p className="text-[11px] text-[#657a72]">Estimado (diccionario)</p><p className="text-xl font-bold text-[#9a6800]">{cnt("estimado")}</p></div>
        <div className="rounded-2xl border bg-white p-3"><p className="text-[11px] text-[#657a72]">Sin peso</p><p className="text-xl font-bold text-[#9b2c2c]">{cnt("pendiente")}</p></div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[#657a72]">{ventas.length} línea(s) de factura · lo que cuenta es el total de kilos</p>
        <div className="flex gap-2"><Boton onClick={() => setModal("excel")}>Importar desde Excel de facturación</Boton><Boton tipo="secundario" onClick={() => setModal("manual")}>+ Línea de factura</Boton></div>
      </div>
      {!ventas.length ? (
        <Vacio titulo="Sin piezas registradas" texto="Importa el Excel de facturación del mes o registra líneas de factura. Solo los kilos gestionados pasan a la memoria anual." />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[#f7faf8] text-xs text-[#567067]"><tr>{["Fecha", "Pieza", "Ref.", "Cant.", "Precio", "Peso", "Peso según", ""].map((h) => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
            <tbody>
              {ventas.map((v) => (
                <tr key={v.id} className="border-t">
                  <td className="whitespace-nowrap px-3 py-2">{v.fecha}</td><td className="px-3 py-2">{v.descripcion}</td><td className="px-3 py-2">{v.referencia}</td>
                  <td className="px-3 py-2">{v.cantidad}</td><td className="px-3 py-2">{eur(v.precio)}</td><td className="px-3 py-2">{kg(v.pesoKg)}</td>
                  <td className="px-3 py-2"><Chip>{v.origenPeso}</Chip>{v.demo && <> <ChipDemo /></>}</td>
                  <td className="px-3 py-2 text-right"><button type="button" onClick={() => confirm("¿Eliminar venta?") && set((d) => ops.delVenta(d, v.id))} className="min-h-[44px] px-2 text-xs text-[#9b2c2c]">Eliminar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal === "manual" && <LineaFactura db={db} set={set} onCerrar={() => setModal(null)} />}
      {modal === "excel" && <ImportarExcel db={db} set={set} onCerrar={() => setModal(null)} />}
    </div>
  );
}
