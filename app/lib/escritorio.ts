/**
 * Puente con la versión de Windows (Electron). El preload expone `window.reciclacat`.
 * En el navegador no existe y la app sigue funcionando con localStorage.
 */

export interface InfoEscritorio {
  version: string;
  carpetaDatos: string;
  ultimaCopia: string | null;
  licencia: { cliente: string; caduca: string | null; numero: string } | null;
  equipo: string;
  actualizacion: string;
}

export interface PuenteEscritorio {
  /** Lectura síncrona al arrancar (JSON de la base de datos o null si es la primera vez). */
  leerDB(): string | null;
  /** Escritura atómica del JSON en la carpeta de datos. */
  guardarDB(json: string): Promise<boolean>;
  /** Guarda el archivo original en la carpeta de adjuntos y devuelve su ruta relativa. */
  guardarAdjunto(id: string, nombre: string, datos: ArrayBuffer): Promise<string>;
  /** Abre el original con el programa predeterminado de Windows. */
  abrirAdjunto(ruta: string): Promise<boolean>;
  /** Copia de seguridad completa (datos + adjuntos) en la carpeta que elija el usuario. Devuelve la ruta o null. */
  crearCopia(): Promise<string | null>;
  /** Restaura desde una copia elegida por el usuario. Devuelve true si se restauró (la app se recarga). */
  restaurarCopia(): Promise<boolean>;
  abrirCarpetaDatos(): Promise<void>;
  info(): Promise<InfoEscritorio>;
  /** Busca una versión nueva; devuelve el estado («buscando…», «al día»…). */
  buscarActualizacion(): Promise<string>;
}

declare global {
  interface Window { reciclacat?: PuenteEscritorio }
}

export const puente = (): PuenteEscritorio | null =>
  typeof window !== "undefined" && window.reciclacat ? window.reciclacat : null;

export const esEscritorio = () => puente() !== null;
