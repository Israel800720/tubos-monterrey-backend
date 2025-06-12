// Tipos para el backend del sistema TUBOS MONTERREY

import { Request } from 'express';

// Interfaces de base de datos
export interface Cliente {
  id?: number;
  codigo_sn: string;
  nombre_sn: string;
  rfc: string;
  codigo_condiciones_pago: string;
  codigo_grupo: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface User {
  id?: number;
  email: string;
  password_hash: string;
  role: 'admin' | 'client';
  name: string;
  is_active?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface Solicitud {
  id?: number;
  folio: string;
  tipo_persona: 'FISICA' | 'MORAL';
  cliente_id: number;
  formulario_data: FormularioData;
  archivos_urls: string[];
  estado: 'PENDIENTE' | 'PROCESADA' | 'RECHAZADA';
  created_at?: Date;
  updated_at?: Date;
}

export interface SolicitudWithCliente extends Solicitud {
  cliente?: Cliente;
}

// Tipos de formularios
export interface Proveedor {
  nombre: string;
  domicilio: string;
  promedio_compra: string;
  linea_credito: string;
  telefono: string;
}

export interface DatosBancarios {
  nombre: string;
  numero_sucursal: string;
  telefono: string;
  tipo_cuenta: 'Cheques' | 'Débito' | 'Crédito';
  monto: string;
}

export interface Accionista {
  nombre: string;
  edad: string;
  numero_acciones: string;
  telefono: string;
  domicilio: string;
  tipo_domicilio: 'PROPIO' | 'RENTA';
}

export interface FormularioPersonaFisica {
  id_cif: string;
  linea_credito_solicitada: string;
  agente_ventas: string;
  nombre_titular: string;
  telefono_fijo: string;
  celular: string;
  correo_electronico: string;
  tipo_domicilio: 'PROPIO' | 'RENTA';
  calle_numero_negocio: string;
  telefono_negocio: string;
  colonia_estado_negocio: string;
  codigo_postal_negocio: string;
  correo_negocio: string;
  tipo_domicilio_negocio: 'PROPIO' | 'RENTA';
  giro_actividades: string;
  proveedores: [Proveedor, Proveedor, Proveedor];
  datos_bancarios: DatosBancarios;
}

export interface FormularioPersonaMoral {
  id_cif: string;
  linea_credito_solicitada: string;
  agente_ventas: string;
  correo_empresa: string;
  tipo_domicilio_empresa: 'PROPIO' | 'RENTA';
  fecha_constitucion: string;
  numero_escritura: string;
  folio_registro: string;
  fecha_registro: string;
  capital_inicial: string;
  capital_actual: string;
  fecha_ultimo_aumento: string;
  calle_numero_local: string;
  telefono_local: string;
  colonia_estado_local: string;
  codigo_postal_local: string;
  correo_local: string;
  tipo_domicilio_local: 'PROPIO' | 'RENTA';
  accionistas: [Accionista, Accionista];
  representante_legal: string;
  administrador: string;
  persona_poder_dominio: string;
  puesto_poder: string;
  giro_actividades: string;
  proveedores: [Proveedor, Proveedor, Proveedor];
  datos_bancarios: DatosBancarios;
}

export type FormularioData = FormularioPersonaFisica | FormularioPersonaMoral;

// Tipos para requests
export interface AuthenticatedRequest extends Request {
  user?: User;
}

export interface LoginClienteRequest {
  numero_cliente: string;
  rfc: string;
}

export interface LoginAdminRequest {
  email: string;
  password: string;
}

export interface CreateSolicitudRequest {
  tipo_persona: 'FISICA' | 'MORAL';
  cliente_id: number;
  formulario: FormularioData;
  archivos: Express.Multer.File[];
}

// Tipos para responses
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface UserProfile {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'client';
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

export interface ClienteAuthResponse {
  cliente: Cliente;
  tipo_persona: 'FISICA' | 'MORAL';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Tipos para servicios externos
export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  resource_type: string;
  format: string;
  bytes: number;
}

export interface EmailNotificationData {
  folio: string;
  cliente_nombre: string;
  tipo_persona: 'FISICA' | 'MORAL';
  pdf_url: string;
  archivos_urls: string[];
}

export interface ExcelClienteRow {
  'Código SN': string;
  'Nombre SN': string;
  'RFC': string;
  'Código Condiciones Pago': string;
  'Código Grupo': string;
}

// Tipos para validaciones
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface OCRResult {
  text: string;
  confidence: number;
  quality: 'high' | 'medium' | 'low';
}

// Tipos para configuración
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export interface EmailConfig {
  api_key: string;
  from_email: string;
  admin_email: string;
  company_name: string;
}

export interface CloudinaryConfig {
  cloud_name: string;
  api_key: string;
  api_secret: string;
}

// Tipos para estadísticas
export interface DashboardStats {
  total_solicitudes: number;
  solicitudes_pendientes: number;
  solicitudes_procesadas: number;
  solicitudes_rechazadas: number;
  total_clientes: number;
  solicitudes_por_mes: { mes: string; cantidad: number }[];
}

export interface FileUploadMetadata {
  originalName: string;
  size: number;
  mimeType: string;
  cloudinaryUrl: string;
  publicId: string;
  uploadedAt: Date;
}

// Tipos para archivos requeridos
export interface ArchivoRequerido {
  nombre: string;
  descripcion: string;
  obligatorio: boolean;
  tipos_permitidos: string[];
}

export const ARCHIVOS_PERSONA_FISICA: ArchivoRequerido[] = [
  {
    nombre: 'identificacion_titular',
    descripcion: 'Copia de Identificación oficial vigente (INE o IFE) del titular',
    obligatorio: true,
    tipos_permitidos: ['image/jpeg', 'image/png', 'application/pdf']
  },
  {
    nombre: 'estado_cuenta_bancario',
    descripcion: 'Solo la carátula del estado de cuenta bancario no mayor a 3 meses de antigüedad del titular',
    obligatorio: true,
    tipos_permitidos: ['image/jpeg', 'image/png', 'application/pdf']
  },
  {
    nombre: 'comprobante_domicilio_titular',
    descripcion: 'Comprobante de Domicilio (teléfono) del titular',
    obligatorio: true,
    tipos_permitidos: ['image/jpeg', 'image/png', 'application/pdf']
  },
  {
    nombre: 'constancia_situacion_fiscal_titular',
    descripcion: 'Constancia de Situación Fiscal reciente del titular',
    obligatorio: true,
    tipos_permitidos: ['application/pdf']
  },
  {
    nombre: 'declaracion_anual_titular',
    descripcion: 'Declaración anual del titular',
    obligatorio: true,
    tipos_permitidos: ['application/pdf']
  },
  {
    nombre: 'opinion_cumplimiento_titular',
    descripcion: 'Opinión de cumplimiento de obligaciones fiscales del titular',
    obligatorio: true,
    tipos_permitidos: ['application/pdf']
  },
  {
    nombre: 'identificacion_aval',
    descripcion: 'Copia de Identificación oficial vigente (INE o IFE) del aval',
    obligatorio: true,
    tipos_permitidos: ['image/jpeg', 'image/png', 'application/pdf']
  },
  {
    nombre: 'comprobante_domicilio_aval',
    descripcion: 'Comprobante de Domicilio (teléfono) del aval',
    obligatorio: true,
    tipos_permitidos: ['image/jpeg', 'image/png', 'application/pdf']
  },
  {
    nombre: 'constancia_situacion_fiscal_aval',
    descripcion: 'Constancia de Situación Fiscal reciente del aval',
    obligatorio: true,
    tipos_permitidos: ['application/pdf']
  },
  {
    nombre: 'garantia_inmueble_aval',
    descripcion: 'Garantía de inmueble del aval (copia simple de escritura de algún inmueble, título de propiedad o factura de auto a nombre del aval, comprobante de pago de predial o agua a nombre del aval)',
    obligatorio: true,
    tipos_permitidos: ['image/jpeg', 'image/png', 'application/pdf']
  }
];

export const ARCHIVOS_PERSONA_MORAL: ArchivoRequerido[] = [
  {
    nombre: 'constancia_situacion_fiscal_empresa',
    descripcion: 'Constancia de Situación Fiscal reciente de la empresa',
    obligatorio: true,
    tipos_permitidos: ['application/pdf']
  },
  {
    nombre: 'acta_constitutiva',
    descripcion: 'Copia de Acta Constitutiva y/o la última modificación',
    obligatorio: true,
    tipos_permitidos: ['application/pdf']
  },
  {
    nombre: 'estados_financieros',
    descripcion: 'Estados financieros vigentes y originales, firmados por el representante legal y contador',
    obligatorio: true,
    tipos_permitidos: ['application/pdf']
  },
  {
    nombre: 'cedula_profesional_contador',
    descripcion: 'Copia de Cédula Profesional de quien firma los estados financieros',
    obligatorio: true,
    tipos_permitidos: ['image/jpeg', 'image/png', 'application/pdf']
  },
  {
    nombre: 'comprobante_domicilio_empresa',
    descripcion: 'Copia de comprobante de Domicilio (teléfono) de la empresa',
    obligatorio: true,
    tipos_permitidos: ['image/jpeg', 'image/png', 'application/pdf']
  },
  {
    nombre: 'declaracion_anual_empresa',
    descripcion: 'Declaración Anual (PDF Original)',
    obligatorio: true,
    tipos_permitidos: ['application/pdf']
  },
  {
    nombre: 'opinion_cumplimiento_sat_empresa',
    descripcion: 'Opinión de Cumplimiento SAT (PDF Original)',
    obligatorio: true,
    tipos_permitidos: ['application/pdf']
  },
  {
    nombre: 'identificacion_representante_legal',
    descripcion: 'Identificación oficial vigente (INE o IFE) del representante legal de la empresa',
    obligatorio: true,
    tipos_permitidos: ['image/jpeg', 'image/png', 'application/pdf']
  },
  {
    nombre: 'constancia_situacion_fiscal_representante',
    descripcion: 'Constancia de Situación Fiscal reciente del representante legal de la empresa',
    obligatorio: true,
    tipos_permitidos: ['application/pdf']
  },
  {
    nombre: 'comprobante_domicilio_representante',
    descripcion: 'Comprobante de Domicilio (teléfono) del representante legal de la empresa',
    obligatorio: true,
    tipos_permitidos: ['image/jpeg', 'image/png', 'application/pdf']
  },
  {
    nombre: 'poder_notarial_representante',
    descripcion: 'Poder Notarial en caso de no aparecer en el Acta Constitutiva',
    obligatorio: false,
    tipos_permitidos: ['application/pdf']
  },
  {
    nombre: 'identificacion_aval',
    descripcion: 'Identificación oficial vigente (INE o IFE) del aval (debe ser otra persona que no sea el representante legal)',
    obligatorio: true,
    tipos_permitidos: ['image/jpeg', 'image/png', 'application/pdf']
  },
  {
    nombre: 'constancia_situacion_fiscal_aval',
    descripcion: 'Constancia de Situación Fiscal reciente del aval (debe ser otra persona que no sea el representante legal)',
    obligatorio: true,
    tipos_permitidos: ['application/pdf']
  },
  {
    nombre: 'comprobante_domicilio_aval',
    descripcion: 'Comprobante de Domicilio (teléfono) del aval (debe ser otra persona que no sea el representante legal)',
    obligatorio: true,
    tipos_permitidos: ['image/jpeg', 'image/png', 'application/pdf']
  },
  {
    nombre: 'poder_notarial_aval',
    descripcion: 'Poder Notarial del aval en caso de no aparecer en el Acta Constitutiva',
    obligatorio: false,
    tipos_permitidos: ['application/pdf']
  }
];
