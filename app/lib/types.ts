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
  /** Ruta relativa del archivo original guardado en la carpeta de datos (solo versión Windows). */
  archivoRuta?: string;
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
  /** Nº de la factura de la que sale la línea. */
  factura?: string;
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
  /** Procedencia para la memoria (entradas de 16 01 04*). Por defecto, particular. */
  procedencia?: { tipo: "particular" | "empresa" | "administracion"; nombre?: string; nif?: string; nima?: string };
  /** Fecha en que se descontaminó (el RD 265/2021 da 30 días desde el certificado de destrucción). */
  fechaDescontaminacion?: string;
  /** Salida del vehículo descontaminado (16 01 06) a fragmentadora u otro gestor. */
  salida?: { fecha: string; gestor: string; nif?: string; nima?: string; operacion?: string; kg?: number; diId?: Id };
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
  documentoId?: Id;
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
  /** Datos del destino para la memoria (SIRA). */
  nifDestino?: string;
  tipoInscripcionDestino?: string; // G01, G02…
  operacionDestino?: string; // R1301…
  municipioDestino?: string;
  provinciaDestino?: string;
  nifOrigen?: string;
  razonSocialOrigen?: string;
  demo?: boolean;
}

/** Neumáticos: información complementaria del CAT en la memoria (RD 265/2021, art. 7.5 y 11). */
export interface MovimientoNeumaticos {
  id: Id;
  ejercicio: number;
  fecha: string;
  tipo: "segunda_mano" | "nfu_a_cambio" | "certificado_7_5";
  kg: number;
  unidades: number;
  destinatario: string;
  nif?: string;
  nima?: string;
  tipoDestinatario?: "profesional" | "domestico";
  demo?: boolean;
}

/** Stock a 31 de diciembre de un ejercicio, por código LER (residuos almacenados sin enviar). */
export interface StockResiduo {
  id: Id;
  ejercicio: number;
  ler: string;
  kg: number;
}

export interface TaraVehiculo {
  id: Id;
  marca: string;
  modelo: string;
  tara: number; // kg
  origen: "defecto" | "usuario";
}

/** Corrección de peso de una pieza hecha por el usuario (báscula). */
export interface PesoUsuario {
  articulo: string;
  kg: number;
  familia?: string;
  fecha?: string;
}

/** Un residuo es peligroso si su código LER lleva asterisco. */
export const esPeligroso = (ler: string) => ler.trim().endsWith("*");

export interface Centro {
  nombre: string;
  nima: string;
  provincia: string;
  usuario: string;
  /** Datos para la memoria anual (SIRA). */
  razonSocial?: string;
  nif?: string;
  municipio?: string;
  autorizacion?: string; // AN000…
  inscripcionGestor?: string; // E01
  inscripcionProductor?: string; // P01
  operacionAutorizada?: string; // R1201
  /** Cómo se declara la procedencia de los vehículos en las entradas: agrupados como particulares o como el propio centro. */
  procedenciaEntradas?: "propio" | "particulares";
  metodoPeso?: string;
  metodoReutilizacion?: string;
  /** Destino para los % de la memoria por código LER (si se cambia el de por defecto). */
  destinoLER?: Record<string, string>;
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
  pesosUsuario: PesoUsuario[];
  neumaticos?: MovimientoNeumaticos[];
  stocks?: StockResiduo[];
}
