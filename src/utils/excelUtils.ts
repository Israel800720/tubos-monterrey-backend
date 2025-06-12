import * as XLSX from 'xlsx';
import { Cliente } from '@/types';
import { RFCValidator } from './rfcValidator';

export interface ExcelValidationResult {
  isValid: boolean;
  clientes: Omit<Cliente, 'id' | 'created_at' | 'updated_at'>[];
  errors: string[];
  warnings: string[];
  totalRows: number;
  validRows: number;
}

export interface ExcelClienteRow {
  'Código SN': string;
  'Nombre SN': string;
  'RFC': string;
  'Código Condiciones Pago': string;
  'Código Grupo': string;
}

export class ExcelUtils {
  // Columnas requeridas en el archivo Excel
  private static readonly REQUIRED_COLUMNS = [
    'Código SN',
    'Nombre SN', 
    'RFC',
    'Código Condiciones Pago',
    'Código Grupo'
  ];

  // Tipos de datos esperados por columna
  private static readonly COLUMN_TYPES = {
    'Código SN': 'string',
    'Nombre SN': 'string',
    'RFC': 'string',
    'Código Condiciones Pago': 'string',
    'Código Grupo': 'string'
  };

  /**
   * Lee y valida un archivo Excel de clientes
   */
  static async parseClientesExcel(buffer: Buffer): Promise<ExcelValidationResult> {
    const result: ExcelValidationResult = {
      isValid: false,
      clientes: [],
      errors: [],
      warnings: [],
      totalRows: 0,
      validRows: 0
    };

    try {
      // Leer archivo Excel
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        result.errors.push('El archivo Excel no contiene hojas de trabajo');
        return result;
      }

      // Usar la primera hoja
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonData.length === 0) {
        result.errors.push('El archivo Excel está vacío');
        return result;
      }

      // Verificar encabezados
      const headers = jsonData[0] as string[];
      const headerValidation = this.validateHeaders(headers);
      
      if (!headerValidation.isValid) {
        result.errors.push(...headerValidation.errors);
        return result;
      }

      // Procesar filas de datos (omitir encabezado)
      const dataRows = jsonData.slice(1) as any[][];
      result.totalRows = dataRows.length;

      if (result.totalRows === 0) {
        result.errors.push('El archivo no contiene datos (solo encabezados)');
        return result;
      }

      // Procesar cada fila
      for (let i = 0; i < dataRows.length; i++) {
        const rowNumber = i + 2; // +2 porque empezamos en fila 1 (encabezado) y el array es base 0
        const row = dataRows[i];
        
        const rowValidation = this.validateAndParseRow(row, rowNumber);
        
        if (rowValidation.isValid && rowValidation.cliente) {
          result.clientes.push(rowValidation.cliente);
          result.validRows++;
        } else {
          result.errors.push(...rowValidation.errors);
          result.warnings.push(...rowValidation.warnings);
        }
      }

      // Validar duplicados
      const duplicateValidation = this.validateDuplicates(result.clientes);
      result.errors.push(...duplicateValidation.errors);
      result.warnings.push(...duplicateValidation.warnings);

      // Determinar si el resultado es válido
      result.isValid = result.errors.length === 0 && result.validRows > 0;

      return result;
    } catch (error) {
      result.errors.push(`Error procesando archivo Excel: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      return result;
    }
  }

  /**
   * Valida los encabezados del archivo Excel
   */
  private static validateHeaders(headers: string[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Verificar que existan todos los encabezados requeridos
    for (const requiredColumn of this.REQUIRED_COLUMNS) {
      if (!headers.includes(requiredColumn)) {
        errors.push(`Columna requerida faltante: "${requiredColumn}"`);
      }
    }

    // Verificar orden de columnas (opcional, pero recomendado)
    const expectedOrder = this.REQUIRED_COLUMNS;
    for (let i = 0; i < Math.min(headers.length, expectedOrder.length); i++) {
      if (headers[i] !== expectedOrder[i]) {
        errors.push(`Columna en posición ${i + 1} debería ser "${expectedOrder[i]}" pero es "${headers[i]}"`);
        break; // Solo reportar el primer error de orden
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valida y parsea una fila individual
   */
  private static validateAndParseRow(row: any[], rowNumber: number): {
    isValid: boolean;
    cliente?: Omit<Cliente, 'id' | 'created_at' | 'updated_at'>;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Verificar que la fila tenga suficientes columnas
    if (row.length < this.REQUIRED_COLUMNS.length) {
      errors.push(`Fila ${rowNumber}: Faltan columnas (esperadas: ${this.REQUIRED_COLUMNS.length}, encontradas: ${row.length})`);
      return { isValid: false, errors, warnings };
    }

    // Extraer y limpiar datos
    const [codigoSN, nombreSN, rfc, codigoCondicionesPago, codigoGrupo] = row.map(cell => 
      cell ? String(cell).trim().toUpperCase() : ''
    );

    // Validar campos requeridos
    if (!codigoSN) {
      errors.push(`Fila ${rowNumber}: Código SN es requerido`);
    }

    if (!nombreSN) {
      errors.push(`Fila ${rowNumber}: Nombre SN es requerido`);
    }

    if (!rfc) {
      errors.push(`Fila ${rowNumber}: RFC es requerido`);
    } else {
      // Validar RFC
      const rfcValidation = RFCValidator.validate(rfc);
      if (!rfcValidation.isValid) {
        errors.push(`Fila ${rowNumber}: RFC inválido - ${rfcValidation.errors.join(', ')}`);
      }
    }

    if (!codigoCondicionesPago) {
      errors.push(`Fila ${rowNumber}: Código Condiciones Pago es requerido`);
    }

    if (!codigoGrupo) {
      errors.push(`Fila ${rowNumber}: Código Grupo es requerido`);
    }

    // Validaciones adicionales
    if (codigoSN && codigoSN.length > 50) {
      warnings.push(`Fila ${rowNumber}: Código SN muy largo (${codigoSN.length} caracteres)`);
    }

    if (nombreSN && nombreSN.length > 200) {
      warnings.push(`Fila ${rowNumber}: Nombre SN muy largo (${nombreSN.length} caracteres)`);
    }

    if (codigoCondicionesPago && !/^\d+$/.test(codigoCondicionesPago)) {
      warnings.push(`Fila ${rowNumber}: Código Condiciones Pago debería ser numérico`);
    }

    // Si hay errores, no crear el cliente
    if (errors.length > 0) {
      return { isValid: false, errors, warnings };
    }

    // Crear objeto cliente
    const cliente: Omit<Cliente, 'id' | 'created_at' | 'updated_at'> = {
      codigo_sn: codigoSN,
      nombre_sn: nombreSN,
      rfc: RFCValidator.normalize(rfc),
      codigo_condiciones_pago: codigoCondicionesPago,
      codigo_grupo: codigoGrupo
    };

    return {
      isValid: true,
      cliente,
      errors,
      warnings
    };
  }

  /**
   * Valida duplicados en los datos
   */
  private static validateDuplicates(clientes: Omit<Cliente, 'id' | 'created_at' | 'updated_at'>[]): {
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Verificar duplicados por Código SN
    const codigosSN = new Map<string, number[]>();
    clientes.forEach((cliente, index) => {
      if (!codigosSN.has(cliente.codigo_sn)) {
        codigosSN.set(cliente.codigo_sn, []);
      }
      codigosSN.get(cliente.codigo_sn)!.push(index + 2); // +2 para número de fila real
    });

    codigosSN.forEach((indices, codigo) => {
      if (indices.length > 1) {
        errors.push(`Código SN duplicado "${codigo}" en filas: ${indices.join(', ')}`);
      }
    });

    // Verificar duplicados por RFC
    const rfcs = new Map<string, number[]>();
    clientes.forEach((cliente, index) => {
      if (!rfcs.has(cliente.rfc)) {
        rfcs.set(cliente.rfc, []);
      }
      rfcs.get(cliente.rfc)!.push(index + 2);
    });

    rfcs.forEach((indices, rfc) => {
      if (indices.length > 1) {
        errors.push(`RFC duplicado "${rfc}" en filas: ${indices.join(', ')}`);
      }
    });

    return { errors, warnings };
  }

  /**
   * Genera un archivo Excel de plantilla para clientes
   */
  static generateTemplate(): Buffer {
    const templateData = [
      this.REQUIRED_COLUMNS,
      ['CLI001', 'EJEMPLO EMPRESA S.A. DE C.V.', 'EMP950523ABC', '30', 'A'],
      ['CLI002', 'JUAN CARLOS PÉREZ GONZÁLEZ', 'PEGJ850618XYZ', '15', 'B'],
      ['CLI003', 'DISTRIBUIDORA INDUSTRIAL DEL NORTE', 'DIN920310DEF', '45', 'A']
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    
    // Configurar ancho de columnas
    worksheet['!cols'] = [
      { width: 15 }, // Código SN
      { width: 40 }, // Nombre SN
      { width: 15 }, // RFC
      { width: 20 }, // Código Condiciones Pago
      { width: 15 }  // Código Grupo
    ];

    // Crear workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * Exporta clientes a Excel
   */
  static exportClientes(clientes: Cliente[]): Buffer {
    const data = [
      this.REQUIRED_COLUMNS,
      ...clientes.map(cliente => [
        cliente.codigo_sn,
        cliente.nombre_sn,
        cliente.rfc,
        cliente.codigo_condiciones_pago,
        cliente.codigo_grupo
      ])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    
    // Configurar ancho de columnas
    worksheet['!cols'] = [
      { width: 15 },
      { width: 40 },
      { width: 15 },
      { width: 20 },
      { width: 15 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * Genera reporte de solicitudes en Excel
   */
  static exportSolicitudes(solicitudes: any[]): Buffer {
    const headers = [
      'Folio',
      'Fecha',
      'Tipo Persona',
      'Cliente',
      'RFC',
      'Línea Crédito',
      'Estado',
      'Archivos'
    ];

    const data = [
      headers,
      ...solicitudes.map(solicitud => [
        solicitud.folio,
        new Date(solicitud.created_at).toLocaleDateString('es-MX'),
        solicitud.tipo_persona,
        solicitud.cliente?.nombre_sn || 'N/A',
        solicitud.cliente?.rfc || 'N/A',
        solicitud.formulario_data?.linea_credito_solicitada || 'N/A',
        solicitud.estado,
        solicitud.archivos_urls?.length || 0
      ])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    
    // Configurar ancho de columnas
    worksheet['!cols'] = [
      { width: 20 }, // Folio
      { width: 15 }, // Fecha
      { width: 15 }, // Tipo Persona
      { width: 40 }, // Cliente
      { width: 15 }, // RFC
      { width: 20 }, // Línea Crédito
      { width: 15 }, // Estado
      { width: 12 }  // Archivos
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Solicitudes');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * Valida el formato del archivo
   */
  static validateFileFormat(buffer: Buffer): { isValid: boolean; error?: string } {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        return { isValid: false, error: 'El archivo no contiene hojas de trabajo válidas' };
      }

      return { isValid: true };
    } catch (error) {
      return { 
        isValid: false, 
        error: `Archivo Excel inválido: ${error instanceof Error ? error.message : 'Error desconocido'}` 
      };
    }
  }

  /**
   * Obtiene información básica del archivo Excel
   */
  static getFileInfo(buffer: Buffer): {
    sheets: string[];
    totalRows: number;
    hasHeaders: boolean;
  } | null {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      
      return {
        sheets: workbook.SheetNames,
        totalRows: jsonData.length,
        hasHeaders: jsonData.length > 0 && Array.isArray(jsonData[0])
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Convierte datos JSON a formato Excel buffer
   */
  static jsonToExcelBuffer(data: any[], sheetName: string = 'Datos'): Buffer {
    if (data.length === 0) {
      throw new Error('No hay datos para exportar');
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * Limpia y normaliza datos de una celda Excel
   */
  static cleanCellValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    
    return String(value)
      .trim()
      .replace(/\s+/g, ' ') // Múltiples espacios a uno solo
      .toUpperCase();
  }
}

export default ExcelUtils;
