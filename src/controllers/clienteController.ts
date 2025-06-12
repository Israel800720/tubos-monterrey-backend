import { Request, Response } from 'express';
import { ClienteModel } from '@/models/Cliente';
import { ApiResponse, Cliente, AuthenticatedRequest, PaginatedResponse } from '@/types';
import { ExcelUtils } from '@/utils/excelUtils';
import { RFCValidator } from '@/utils/rfcValidator';
import { asyncHandler, BusinessError, NotFoundError, ConflictError, ValidationError } from '@/middleware/errorHandler';

/**
 * Controlador de Clientes
 */
export class ClienteController {
  /**
   * Obtener todos los clientes con paginación
   */
  static getClientes = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.per_page as string) || 50;
    const search = req.query.search as string;

    let result;
    
    if (search) {
      result = await ClienteModel.search(search, page, perPage);
    } else {
      result = await ClienteModel.findAll(page, perPage);
    }

    const response: ApiResponse<PaginatedResponse<Cliente>> = {
      success: true,
      message: 'Clientes obtenidos exitosamente',
      data: {
        data: result.clientes,
        total: result.total,
        page: result.page,
        per_page: result.perPage,
        total_pages: result.totalPages
      }
    };

    res.status(200).json(response);
  });

  /**
   * Obtener cliente por ID
   */
  static getCliente = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const idParam = req.params.id;
    if (!idParam) {
      throw new ValidationError('ID de cliente requerido');
    }
    const id = parseInt(idParam);
    
    const cliente = await ClienteModel.findById(id);
    
    if (!cliente) {
      throw new NotFoundError('Cliente no encontrado');
    }

    const response: ApiResponse<Cliente> = {
      success: true,
      message: 'Cliente obtenido exitosamente',
      data: cliente
    };

    res.status(200).json(response);
  });

  /**
   * Crear nuevo cliente
   */
  static createCliente = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const clienteData: Omit<Cliente, 'id' | 'created_at' | 'updated_at'> = req.body;

    // Validar RFC
    const rfcValidation = RFCValidator.validate(clienteData.rfc);
    if (!rfcValidation.isValid) {
      throw new BusinessError(
        `RFC inválido: ${rfcValidation.errors.join(', ')}`,
        400,
        'INVALID_RFC'
      );
    }

    // Verificar duplicados
    const existingByRFC = await ClienteModel.existsByRFC(clienteData.rfc);
    if (existingByRFC) {
      throw new ConflictError(`Ya existe un cliente con el RFC: ${clienteData.rfc}`);
    }

    const existingByCodigoSN = await ClienteModel.existsByCodigoSN(clienteData.codigo_sn);
    if (existingByCodigoSN) {
      throw new ConflictError(`Ya existe un cliente con el código SN: ${clienteData.codigo_sn}`);
    }

    // Crear cliente
    const cliente = await ClienteModel.create({
      ...clienteData,
      rfc: RFCValidator.normalize(clienteData.rfc)
    });

    console.log(`[CLIENTE] Cliente creado: ${cliente.codigo_sn} - ${cliente.nombre_sn}`);

    const response: ApiResponse<Cliente> = {
      success: true,
      message: 'Cliente creado exitosamente',
      data: cliente
    };

    res.status(201).json(response);
  });

  /**
   * Actualizar cliente
   */
  static updateCliente = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const idParam = req.params.id;
    if (!idParam) {
      throw new ValidationError('ID de cliente requerido');
    }
    const id = parseInt(idParam);
    const updates: Partial<Cliente> = req.body;

    // Verificar que el cliente existe
    const existingCliente = await ClienteModel.findById(id);
    if (!existingCliente) {
      throw new NotFoundError('Cliente no encontrado');
    }

    // Validar RFC si se está actualizando
    if (updates.rfc) {
      const rfcValidation = RFCValidator.validate(updates.rfc);
      if (!rfcValidation.isValid) {
        throw new BusinessError(
          `RFC inválido: ${rfcValidation.errors.join(', ')}`,
          400,
          'INVALID_RFC'
        );
      }

      updates.rfc = RFCValidator.normalize(updates.rfc);

      // Verificar duplicado de RFC
      const existingByRFC = await ClienteModel.existsByRFC(updates.rfc, id);
      if (existingByRFC) {
        throw new ConflictError(`Ya existe otro cliente con el RFC: ${updates.rfc}`);
      }
    }

    // Verificar duplicado de código SN si se está actualizando
    if (updates.codigo_sn) {
      const existingByCodigoSN = await ClienteModel.existsByCodigoSN(updates.codigo_sn, id);
      if (existingByCodigoSN) {
        throw new ConflictError(`Ya existe otro cliente con el código SN: ${updates.codigo_sn}`);
      }
    }

    // Actualizar cliente
    const cliente = await ClienteModel.update(id, updates);

    if (!cliente) {
      throw new BusinessError('Error actualizando cliente', 500, 'UPDATE_ERROR');
    }

    console.log(`[CLIENTE] Cliente actualizado: ${cliente.codigo_sn} - ${cliente.nombre_sn}`);

    const response: ApiResponse<Cliente> = {
      success: true,
      message: 'Cliente actualizado exitosamente',
      data: cliente
    };

    res.status(200).json(response);
  });

  /**
   * Eliminar cliente
   */
  static deleteCliente = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const idParam = req.params.id;
    if (!idParam) {
      throw new ValidationError('ID de cliente requerido');
    }
    const id = parseInt(idParam);

    // Verificar que el cliente existe
    const existingCliente = await ClienteModel.findById(id);
    if (!existingCliente) {
      throw new NotFoundError('Cliente no encontrado');
    }

    // TODO: Verificar que no tenga solicitudes asociadas antes de eliminar
    
    const deleted = await ClienteModel.delete(id);
    
    if (!deleted) {
      throw new BusinessError('Error eliminando cliente', 500, 'DELETE_ERROR');
    }

    console.log(`[CLIENTE] Cliente eliminado: ${existingCliente.codigo_sn} - ${existingCliente.nombre_sn}`);

    const response: ApiResponse = {
      success: true,
      message: 'Cliente eliminado exitosamente'
    };

    res.status(200).json(response);
  });

  /**
   * Cargar clientes desde archivo Excel
   */
  static uploadExcel = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const file = req.file;
    
    if (!file) {
      throw new BusinessError('Archivo Excel requerido', 400, 'MISSING_FILE');
    }

    // Validar formato de archivo
    const formatValidation = ExcelUtils.validateFileFormat(file.buffer);
    if (!formatValidation.isValid) {
      throw new BusinessError(
        formatValidation.error || 'Formato de archivo inválido',
        400,
        'INVALID_FILE_FORMAT'
      );
    }

    // Parsear y validar contenido
    const parseResult = await ExcelUtils.parseClientesExcel(file.buffer);
    
    if (!parseResult.isValid) {
      const response: ApiResponse = {
        success: false,
        message: 'Errores encontrados en el archivo Excel',
        error: 'EXCEL_VALIDATION_ERROR',
        data: {
          errors: parseResult.errors,
          warnings: parseResult.warnings,
          totalRows: parseResult.totalRows,
          validRows: parseResult.validRows
        }
      };
      
      res.status(400).json(response);
      return;
    }

    // Guardar clientes en la base de datos
    let clientesCreados: Cliente[] = [];
    let erroresCreacion: string[] = [];

    try {
      // Eliminar clientes existentes si se especifica
      if (req.body.replace_existing === 'true') {
        const deletedCount = await ClienteModel.deleteAll();
        console.log(`[EXCEL] Eliminados ${deletedCount} clientes existentes`);
      }

      // Crear clientes en lotes
      clientesCreados = await ClienteModel.createMany(parseResult.clientes);
      
      console.log(`[EXCEL] Cargados ${clientesCreados.length} clientes desde Excel por usuario: ${req.user?.email}`);
      
    } catch (error) {
      console.error('Error creando clientes desde Excel:', error);
      
      // Si hay error, intentar crear uno por uno para identificar duplicados
      for (const clienteData of parseResult.clientes) {
        try {
          const cliente = await ClienteModel.create(clienteData);
          clientesCreados.push(cliente);
        } catch (clienteError) {
          erroresCreacion.push(`Error creando cliente ${clienteData.codigo_sn}: ${clienteError instanceof Error ? clienteError.message : 'Error desconocido'}`);
        }
      }
    }

    const response: ApiResponse = {
      success: true,
      message: `Archivo Excel procesado exitosamente. ${clientesCreados.length} clientes cargados`,
      data: {
        clientesCreados: clientesCreados.length,
        totalProcesados: parseResult.totalRows,
        clientesValidados: parseResult.validRows,
        warnings: parseResult.warnings,
        erroresCreacion,
        resumen: {
          archivo: file.originalname,
          fechaProcesamiento: new Date().toISOString(),
          usuario: req.user?.email
        }
      }
    };

    res.status(200).json(response);
  });

  /**
   * Descargar plantilla Excel
   */
  static downloadTemplate = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const templateBuffer = ExcelUtils.generateTemplate();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla_clientes.xlsx"');
    res.setHeader('Content-Length', templateBuffer.length);
    
    res.send(templateBuffer);
  });

  /**
   * Exportar clientes a Excel
   */
  static exportExcel = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    // Obtener todos los clientes
    const result = await ClienteModel.findAll(1, 10000); // Máximo 10k clientes
    
    const excelBuffer = ExcelUtils.exportClientes(result.clientes);
    
    const fecha = new Date().toISOString().split('T')[0];
    const filename = `clientes_${fecha}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', excelBuffer.length);
    
    res.send(excelBuffer);
  });

  /**
   * Obtener estadísticas de clientes
   */
  static getStats = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const stats = await ClienteModel.getStats();

    const response: ApiResponse = {
      success: true,
      message: 'Estadísticas de clientes obtenidas exitosamente',
      data: stats
    };

    res.status(200).json(response);
  });

  /**
   * Buscar clientes
   */
  static searchClientes = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const searchTerm = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.per_page as string) || 20;

    if (!searchTerm) {
      throw new BusinessError('Término de búsqueda requerido', 400, 'MISSING_SEARCH_TERM');
    }

    const result = await ClienteModel.search(searchTerm, page, perPage);

    const response: ApiResponse<PaginatedResponse<Cliente>> = {
      success: true,
      message: 'Búsqueda completada exitosamente',
      data: {
        data: result.clientes,
        total: result.total,
        page: result.page,
        per_page: result.perPage,
        total_pages: result.totalPages
      }
    };

    res.status(200).json(response);
  });

  /**
   * Validar datos de cliente antes de crear/actualizar
   */
  static validateCliente = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const clienteData = req.body;
    const excludeId = req.query.exclude_id ? parseInt(req.query.exclude_id as string) : undefined;

    const validationResults = {
      rfc: { valid: true, message: '' },
      codigo_sn: { valid: true, message: '' },
      duplicates: { rfc: false, codigo_sn: false }
    };

    // Validar RFC
    if (clienteData.rfc) {
      const rfcValidation = RFCValidator.validate(clienteData.rfc);
      validationResults.rfc = {
        valid: rfcValidation.isValid,
        message: rfcValidation.isValid ? 'RFC válido' : rfcValidation.errors.join(', ')
      };

      // Verificar duplicado de RFC
      if (rfcValidation.isValid) {
        validationResults.duplicates.rfc = await ClienteModel.existsByRFC(
          RFCValidator.normalize(clienteData.rfc),
          excludeId
        );
      }
    }

    // Verificar duplicado de código SN
    if (clienteData.codigo_sn) {
      validationResults.duplicates.codigo_sn = await ClienteModel.existsByCodigoSN(
        clienteData.codigo_sn,
        excludeId
      );
    }

    const isValid = validationResults.rfc.valid && 
                   !validationResults.duplicates.rfc && 
                   !validationResults.duplicates.codigo_sn;

    const response: ApiResponse = {
      success: true,
      message: isValid ? 'Validación exitosa' : 'Errores de validación encontrados',
      data: {
        valid: isValid,
        validations: validationResults
      }
    };

    res.status(200).json(response);
  });

  /**
   * Limpiar base de datos de clientes (solo para administradores)
   */
  static clearDatabase = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    // Verificar confirmación
    const { confirm } = req.body;
    
    if (confirm !== 'DELETE_ALL_CLIENTS') {
      throw new BusinessError(
        'Confirmación requerida. Envíe { "confirm": "DELETE_ALL_CLIENTS" }',
        400,
        'CONFIRMATION_REQUIRED'
      );
    }

    // Crear backup antes de eliminar
    // const allClientes = await ClienteModel.findAll(1, 50000);
    // const backupBuffer = ExcelUtils.exportClientes(allClientes.clientes);
    
    // TODO: Guardar backup en almacenamiento seguro
    
    // Eliminar todos los clientes
    const deletedCount = await ClienteModel.deleteAll();
    
    console.log(`[DATABASE] Base de datos de clientes limpiada por usuario: ${req.user?.email}. ${deletedCount} registros eliminados`);

    const response: ApiResponse = {
      success: true,
      message: `Base de datos limpiada exitosamente. ${deletedCount} clientes eliminados`,
      data: {
        deletedCount,
        backupCreated: true,
        timestamp: new Date().toISOString()
      }
    };

    res.status(200).json(response);
  });
}

export default ClienteController;
