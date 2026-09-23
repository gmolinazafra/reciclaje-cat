/** Modelos de datos de ReciclaCat_Gest. Preparados para persistencia en Supabase (ids string, timestamps ISO). */

export type Id = string;

export type TipoDocumento =
  | "DI"
  | "Contrato de tratamiento"
  | "Documento de traslado"
  | "Certificado de destrucción / baja"
  | "Factura"
  | "Albarán"
  | "Analítica"
  | "Autorización"
  | "Venta de piezas"
  | "Otro";

export const TIPOS_DOCUMENTO: TipoDocumento[] = [
  "DI", "Contrato de tratamiento", "Documento de traslado", "Certificado de destrucción / baja",
  "Factura", "Albarán", "Analítica", "Autorización", "Venta de piezas", "Otro",
];

export type EstadoDocumento = "Pendiente de revisar" | "Revisado" | "Guardado" | "Error de lectura";

export interface CampoDetectado {
  clave: string;
  etiqueta: string;
  valorDetectado: string;
  valorFinal: string;
  /** 0-1. <0.7 se resalta para revisión. */
  confianza: number;
  corregido: boolean;
}

export interface Documento {
  id: Id;
  ejercicio: number;
  nombreArchivo: string;
  mime: string;
  tamano: number;
  fechaSubida: string;
  usuario: string;
  tipo: TipoDocumento;
  estado: EstadoDocumento;
  campos: CampoDetectado[];
  /** Proveedor OCR usado ("demo" si simulado). */
  origenOCR: "demo" | "real";
  /** Vínculos opcionales. */
  vehiculoId?: Id;
  diId?: Id;
  notas?: string;
  demo?: boolean;
}

export type OrigenPeso = "real" | "estimado" | "pendiente";

export interface Venta {
  id: Id;
  ejercicio: number;
  fecha: string; // yyyy-mm-dd
  mes: number; // 1-12
  pieza: string;
  referencia: string;
  descripcion: string;
  cantidad: number;
  precio: number;
  pesoKg: number;
  origenPeso: OrigenPeso;
  observaciones?: string;
  vehiculoId?: Id;
  /** factura = línea registrada desde una factura; excel = importación de listado. */
  origen: "factura" | "excel";
  documentoId?: Id;
  demo?: boolean;
}

export type EstadoVehiculo = "Recibido" | "Descontaminado" | "Desmontado" | "Compactado";

export interface Vehiculo {
  id: Id;
  ejercicio: number;
  matricula: string;
  vin?: string;
  marca: string;
  modelo: string;
  fechaEntrada: string;
  estado: EstadoVehiculo;
  pesoEstimadoKg: number;
  pesoBasculaKg?: number;
  documentoBajaId?: Id;
  demo?: boolean;
}

export interface Residuo {
  id: Id;
  ejercicio: number;
  fecha: string;
  ler: string;
  descripcion: string;
  cantidadKg: number;
  gestor: string;
  diId?: Id;
  vehiculoId?: Id;
  demo?: boolean;
}

export interface DI {
  id: Id;
  ejercicio: number;
  numero: string;
  sentido: "salida" | "entrada";
  fecha: string;
  ler: string;
  descripcion: string;
  cantidadKg: number;
  nimaOrigen: string;
  nimaDestino: string;
  gestor: string;
  transportista: string;
  documentoId?: Id;
  vehiculoId?: Id;
  residuoId?: Id;
  demo?: boolean;
}

export interface TaraVehiculo {
  id: Id;
  marca: string;
  modelo: string;
  tara: number; // kg
  origen: "defecto" | "usuario";
}

/** Un residuo es peligroso si su código LER lleva asterisco. */
export const esPeligroso = (ler: string) => ler.trim().endsWith("*");

export interface Centro {
  nombre: string;
  nima: string;
  provincia: string;
  usuario: string;
}

export interface BaseDatos {
  centro: Centro;
  ejercicio: number;
  documentos: Documento[];
  ventas: Venta[];
  vehiculos: Vehiculo[];
  residuos: Residuo[];
  dis: DI[];
  taras: TaraVehiculo[];
}
