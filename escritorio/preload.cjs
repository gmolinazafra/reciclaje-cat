/**
 * ReciclaCat_Gest para Windows — puente seguro entre la interfaz y el sistema de archivos.
 * Solo expone estas funciones; la interfaz no tiene acceso directo a Node ni al disco.
 * © Limonada Web.
 */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("reciclacat", {
  leerDB: () => ipcRenderer.sendSync("db:leer"),
  guardarDB: (json) => ipcRenderer.invoke("db:guardar", json),
  guardarAdjunto: (id, nombre, datos) => ipcRenderer.invoke("adj:guardar", id, nombre, datos),
  abrirAdjunto: (ruta) => ipcRenderer.invoke("adj:abrir", ruta),
  crearCopia: () => ipcRenderer.invoke("copia:crear"),
  restaurarCopia: () => ipcRenderer.invoke("copia:restaurar"),
  abrirCarpetaDatos: () => ipcRenderer.invoke("datos:abrir"),
  info: () => ipcRenderer.invoke("info"),
  licencia: () => ipcRenderer.invoke("licencia:estado"),
  activar: (llave, aceptaCondiciones) => ipcRenderer.invoke("licencia:activar", llave, aceptaCondiciones === true),
  buscarActualizacion: () => ipcRenderer.invoke("act:buscar"),
  empezarPrueba: (aceptaCondiciones) => ipcRenderer.invoke("licencia:prueba", aceptaCondiciones === true),
  // Doble autenticación (contraseña + app autenticadora)
  seguridad: () => ipcRenderer.invoke("seg:estado"),
  desbloquear: (clave, codigo) => ipcRenderer.invoke("seg:desbloquear", String(clave ?? ""), String(codigo ?? "")),
  prepararDobleFactor: (clave, clave2, cuenta) => ipcRenderer.invoke("seg:preparar", String(clave ?? ""), String(clave2 ?? ""), String(cuenta ?? "")),
  confirmarDobleFactor: (codigo, minutos) => ipcRenderer.invoke("seg:confirmar", String(codigo ?? ""), Number(minutos) || 0),
  cancelarDobleFactor: () => ipcRenderer.invoke("seg:cancelar"),
  desactivarDobleFactor: (clave, codigo) => ipcRenderer.invoke("seg:desactivar", String(clave ?? ""), String(codigo ?? "")),
  nuevosCodigosRecuperacion: (clave, codigo) => ipcRenderer.invoke("seg:codigos", String(clave ?? ""), String(codigo ?? "")),
  minutosBloqueo: (minutos) => ipcRenderer.invoke("seg:minutos", Number(minutos)),
  bloquear: () => ipcRenderer.invoke("seg:bloquear"),
});
