import { Request, Response } from 'express';
import { SolicitudModel } from '@/models/Solicitud';
import { ClienteModel } from '@/models/Cliente';
import { CloudinaryService } from '@/services/cloudinaryService';
import { EmailService } from '@/services/emailService';
import { PDFGenerator } from '@/utils/pdfGenerator';
import { ApiResponse, AuthenticatedRequest, Solicitud, PaginatedResponse } from '@/types';
import { asyncHandler, BusinessError, NotFoundError, ValidationError } from '@/middleware/errorHandler';

/**
 * Controlador de Solicitudes de Crédito
 */
export class SolicitudController {
  /**
   * Crear nueva solicitud de crédito
   */
  static createSolicitud = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { tipo_persona, cliente_id, formulario } = req.body;
    const files = req.files as Express.Multer.File[];

    // Verificar que el cliente existe
    const cliente = await ClienteModel.findById(cliente_id);
    if (!cliente) {
      throw new NotFoundError('Cliente no encontrado');
    }

    // Generar folio único
    const folio = await SolicitudModel.generateFolio();

    // Subir archivos a Cloudinary
    let archivosUrls: string[] = [];
    if (files && files.length > 0) {
      try {
        const uploadResults = await CloudinaryService.uploadMultipleFiles(
          files.map(file => ({
            buffer: file.buffer,
            originalName: file.originalname,
            mimeType: file.mimetype
          })),
          `solicitudes/${folio}`
        );

        archivosUrls = uploadResults.map(result => result.secure_url);
        console.log(`[SOLICITUD] ${files.length} archivos subidos para folio ${folio}`);
      } catch (error) {
        console.error('Error subiendo archivos:', error);
        throw new BusinessError(
          'Error subiendo archivos. Intente nuevamente',
          500,
          'FILE_UPLOAD_ERROR'
        );
      }
    }

    // Crear solicitud en base de datos
    const solicitud = await SolicitudModel.create({
      folio,
      tipo_persona,
      cliente_id,
      formulario_data: formulario,
      archivos_urls: archivosUrls
    });

    // Generar PDF de la solicitud
    let pdfUrl = '';
    try {
      const pdfBytes = await PDFGenerator.generateSolicitudPDF({
        folio,
        cliente,
        formulario,
        tipoPersona: tipo_persona,
        archivos: archivosUrls,
        fechaCreacion: new Date()
      });

      // Subir PDF a Cloudinary
      const pdfUploadResult = await CloudinaryService.uploadPDF(
        Buffer.from(pdfBytes),
        `solicitud_${folio}`,
        'pdfs'
      );
      
      pdfUrl = pdfUploadResult.secure_url;
      console.log(`[SOLICITUD] PDF generado para folio ${folio}: ${pdfUrl}`);
    } catch (error) {
      console.error('Error generando PDF:', error);
      // No fallar la solicitud si hay error en PDF, pero log el error
    }

    // Enviar notificación por email al administrador
    try {
      await EmailService.sendSolicitudNotification({
        folio,
        cliente,
        tipo_persona,
        formulario,
        pdf_url: pdfUrl,
        archivos_urls: archivosUrls
      });
      console.log(`[SOLICITUD] Email de notificación enviado para folio ${folio}`);
    } catch (error) {
      console.error('Error enviando email de notificación:', error);
      // No fallar la solicitud si hay error en email
    }

    // Enviar confirmación al cliente si tiene email
    const clienteEmail = tipo_persona === 'FISICA' 
      ? (formulario as any).correo_electronico 
      : (formulario as any).correo_empresa;

    if (clienteEmail) {
      try {
        await EmailService.sendClientConfirmation({
          clienteEmail,
          clienteNombre: cliente.nombre_sn,
          folio,
          tipo_persona
        });
        console.log(`[SOLICITUD] Email de confirmación enviado al cliente: ${clienteEmail}`);
      } catch (error) {
        console.error('Error enviando confirmación al cliente:', error);
      }
    }

    const response: ApiResponse<{
      solicitud: Solicitud;
      pdf_url: string;
      archivos_count: number;
    }> = {
      success: true,
      message: 'Solicitud de crédito creada exitosamente',
      data: {
        solicitud,
        pdf_url: pdfUrl,
        archivos_count: archivosUrls.length
      }
    };

    res.status(201).json(response);
  });

  /**
   * Obtener todas las solicitudes con filtros y paginación
   */
  static getSolicitudes = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.per_page as string) || 20;
    const search = req.query.search as string;
    
    // Filtros
    const filters: any = {};
    if (req.query.estado) {
      filters.estado = req.query.estado as 'PENDIENTE' | 'PROCESADA' | 'RECHAZADA';
    }
    if (req.query.tipo_persona) {
      filters.tipo_persona = req.query.tipo_persona as 'FISICA' | 'MORAL';
    }
    if (req.query.fecha_desde) {
      filters.fecha_desde = new Date(req.query.fecha_desde as string);
    }
    if (req.query.fecha_hasta) {
      filters.fecha_hasta = new Date(req.query.fecha_hasta as string);
    }
    if (req.query.cliente_id) {
      filters.cliente_id = parseInt(req.query.cliente_id as string);
    }

    let result;
    if (search) {
      result = await SolicitudModel.search(search, page, perPage);
    } else {
      result = await SolicitudModel.findAll(page, perPage, filters);
    }

    const response: ApiResponse<PaginatedResponse<Solicitud>> = {
      success: true,
      message: 'Solicitudes obtenidas exitosamente',
      data: {
        data: result.solicitudes,
        total: result.total,
        page: result.page,
        per_page: result.perPage,
        total_pages: result.totalPages
      }
    };

    res.status(200).json(response);
  });

  /**
   * Obtener solicitud por ID
   */
  static getSolicitud = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const idParam = req.params.id;
    if (!idParam) {
      throw new ValidationError('ID de solicitud requerido');
    }
    const id = parseInt(idParam);
    
    const solicitud = await SolicitudModel.findById(id);
    
    if (!solicitud) {
      throw new NotFoundError('Solicitud no encontrada');
    }

    const response: ApiResponse<Solicitud> = {
      success: true,
      message: 'Solicitud obtenida exitosamente',
      data: solicitud
    };

    res.status(200).json(response);
  });

  /**
   * Obtener solicitud por folio
   */
  static getSolicitudByFolio = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const folio = req.params.folio;
    if (!folio) {
      throw new ValidationError('Folio requerido');
    }
    
    const solicitud = await SolicitudModel.findByFolio(folio);
    
    if (!solicitud) {
      throw new NotFoundError('Solicitud no encontrada');
    }

    const response: ApiResponse<Solicitud> = {
      success: true,
      message: 'Solicitud obtenida exitosamente',
      data: solicitud
    };

    res.status(200).json(response);
  });

  /**
   * Obtener solicitudes de un cliente específico
   */
  static getSolicitudesByCliente = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const clienteIdParam = req.params.clienteId;
    if (!clienteIdParam) {
      throw new ValidationError('ID de cliente requerido');
    }
    const clienteId = parseInt(clienteIdParam);
    
    // Verificar que el cliente existe
    const cliente = await ClienteModel.findById(clienteId);
    if (!cliente) {
      throw new NotFoundError('Cliente no encontrado');
    }

    const solicitudes = await SolicitudModel.findByCliente(clienteId);

    const response: ApiResponse<Solicitud[]> = {
      success: true,
      message: 'Solicitudes del cliente obtenidas exitosamente',
      data: solicitudes
    };

    res.status(200).json(response);
  });

  /**
   * Actualizar estado de solicitud
   */
  static updateEstado = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const idParam = req.params.id;
    if (!idParam) {
      throw new ValidationError('ID de solicitud requerido');
    }
    const id = parseInt(idParam);
    const { estado, comentarios } = req.body;

    // Verificar que la solicitud existe
    const solicitudExistente = await SolicitudModel.findById(id);
    if (!solicitudExistente) {
      throw new NotFoundError('Solicitud no encontrada');
    }

    // Actualizar estado
    const solicitud = await SolicitudModel.updateEstado(id, estado);
    
    if (!solicitud) {
      throw new BusinessError('Error actualizando estado de solicitud', 500, 'UPDATE_ERROR');
    }

    // Enviar notificación al cliente si hay cambio de estado
    if (estado !== 'PENDIENTE') {
      const clienteEmail = solicitud.tipo_persona === 'FISICA' 
        ? (solicitud.formulario_data as any).correo_electronico 
        : (solicitud.formulario_data as any).correo_empresa;

      if (clienteEmail) {
        try {
          await EmailService.sendStatusUpdate({
            clienteEmail,
            clienteNombre: solicitud.cliente!.nombre_sn,
            folio: solicitud.folio,
            nuevoEstado: estado,
            comentarios
          });
          console.log(`[SOLICITUD] Notificación de cambio de estado enviada para folio ${solicitud.folio}`);
        } catch (error) {
          console.error('Error enviando notificación de cambio de estado:', error);
        }
      }
    }

    console.log(`[SOLICITUD] Estado actualizado por ${req.user?.email}: ${solicitud.folio} -> ${estado}`);

    const response: ApiResponse<Solicitud> = {
      success: true,
      message: 'Estado de solicitud actualizado exitosamente',
      data: solicitud
    };

    res.status(200).json(response);
  });

  /**
   * Eliminar solicitud
   */
  static deleteSolicitud = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const idParam = req.params.id;
    if (!idParam) {
      throw new ValidationError('ID de solicitud requerido');
    }
    const id = parseInt(idParam);

    // Verificar que la solicitud existe
    const solicitud = await SolicitudModel.findById(id);
    if (!solicitud) {
      throw new NotFoundError('Solicitud no encontrada');
    }

    // Eliminar archivos de Cloudinary
    if (solicitud.archivos_urls && solicitud.archivos_urls.length > 0) {
      try {
        // Extraer public_ids de las URLs de Cloudinary
        const publicIds = solicitud.archivos_urls
          .filter(url => url.includes('cloudinary.com'))
          .map(url => {
            const matches = url.match(/\/v\d+\/(.+?)\.(\w+)$/);
            return matches ? matches[1] : null;
          })
          .filter(id => id !== null) as string[];

        if (publicIds.length > 0) {
          await CloudinaryService.deleteMultipleFiles(publicIds);
          console.log(`[SOLICITUD] Archivos de Cloudinary eliminados para folio ${solicitud.folio}`);
        }
      } catch (error) {
        console.error('Error eliminando archivos de Cloudinary:', error);
        // Continuar con la eliminación aunque falle la limpieza de archivos
      }
    }

    // Eliminar solicitud de la base de datos
    const deleted = await SolicitudModel.delete(id);
    
    if (!deleted) {
      throw new BusinessError('Error eliminando solicitud', 500, 'DELETE_ERROR');
    }

    console.log(`[SOLICITUD] Solicitud eliminada por ${req.user?.email}: ${solicitud.folio}`);

    const response: ApiResponse = {
      success: true,
      message: 'Solicitud eliminada exitosamente'
    };

    res.status(200).json(response);
  });

  /**
   * Obtener estadísticas de solicitudes
   */
  static getStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const stats = await SolicitudModel.getStats();

    const response: ApiResponse = {
      success: true,
      message: 'Estadísticas de solicitudes obtenidas exitosamente',
      data: stats
    };

    res.status(200).json(response);
  });

  /**
   * Descargar archivos de una solicitud en ZIP
   */
  static downloadArchivos = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const idParam = req.params.id;
    if (!idParam) {
      throw new ValidationError('ID de solicitud requerido');
    }
    const id = parseInt(idParam);
    
    const solicitud = await SolicitudModel.findById(id);
    
    if (!solicitud) {
      throw new NotFoundError('Solicitud no encontrada');
    }

    if (!solicitud.archivos_urls || solicitud.archivos_urls.length === 0) {
      throw new BusinessError('La solicitud no tiene archivos adjuntos', 400, 'NO_FILES');
    }

    try {
      // Extraer public_ids de las URLs de Cloudinary
      const publicIds = solicitud.archivos_urls
        .filter(url => url.includes('cloudinary.com'))
        .map(url => {
          const matches = url.match(/\/v\d+\/(.+?)\.(\w+)$/);
          return matches ? matches[1] : null;
        })
        .filter(id => id !== null) as string[];

      if (publicIds.length === 0) {
        throw new BusinessError('No se encontraron archivos válidos para descargar', 400, 'INVALID_FILES');
      }

      // Crear archivo ZIP para descarga
      const zipUrl = await CloudinaryService.createArchiveDownload(
        publicIds,
        `archivos_${solicitud.folio}`
      );

      const response: ApiResponse<{ download_url: string }> = {
        success: true,
        message: 'URL de descarga generada exitosamente',
        data: {
          download_url: zipUrl
        }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error generando descarga de archivos:', error);
      throw new BusinessError(
        'Error generando archivo de descarga',
        500,
        'DOWNLOAD_ERROR'
      );
    }
  });

  /**
   * Regenerar PDF de solicitud
   */
  static regeneratePDF = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const idParam = req.params.id;
    if (!idParam) {
      throw new ValidationError('ID de solicitud requerido');
    }
    const id = parseInt(idParam);
    
    const solicitud = await SolicitudModel.findById(id);
    
    if (!solicitud) {
      throw new NotFoundError('Solicitud no encontrada');
    }

    try {
      // Generar nuevo PDF
      const pdfBytes = await PDFGenerator.generateSolicitudPDF({
        folio: solicitud.folio,
        cliente: solicitud.cliente!,
        formulario: solicitud.formulario_data,
        tipoPersona: solicitud.tipo_persona,
        archivos: solicitud.archivos_urls,
        fechaCreacion: solicitud.created_at!
      });

      // Subir nuevo PDF a Cloudinary
      const pdfUploadResult = await CloudinaryService.uploadPDF(
        Buffer.from(pdfBytes),
        `solicitud_${solicitud.folio}_regenerado`,
        'pdfs'
      );

      const response: ApiResponse<{ pdf_url: string }> = {
        success: true,
        message: 'PDF regenerado exitosamente',
        data: {
          pdf_url: pdfUploadResult.secure_url
        }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error regenerando PDF:', error);
      throw new BusinessError(
        'Error regenerando PDF',
        500,
        'PDF_GENERATION_ERROR'
      );
    }
  });

  /**
   * Obtener solicitudes recientes
   */
  static getRecientes = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const limit = parseInt(req.query.limit as string) || 10;
    
    const solicitudes = await SolicitudModel.getRecientes(limit);

    const response: ApiResponse<Solicitud[]> = {
      success: true,
      message: 'Solicitudes recientes obtenidas exitosamente',
      data: solicitudes
    };

    res.status(200).json(response);
  });

  /**
   * Buscar solicitudes
   */
  static searchSolicitudes = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const searchTerm = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.per_page as string) || 20;

    if (!searchTerm) {
      throw new BusinessError('Término de búsqueda requerido', 400, 'MISSING_SEARCH_TERM');
    }

    const result = await SolicitudModel.search(searchTerm, page, perPage);

    const response: ApiResponse<PaginatedResponse<Solicitud>> = {
      success: true,
      message: 'Búsqueda completada exitosamente',
      data: {
        data: result.solicitudes,
        total: result.total,
        page: result.page,
        per_page: result.perPage,
        total_pages: result.totalPages
      }
    };

    res.status(200).json(response);
  });

  /**
   * Validar archivos antes de subir
   */
  static validateFiles = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      throw new BusinessError('Al menos un archivo es requerido', 400, 'NO_FILES');
    }

    const validationResults = files.map(file => ({
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      valid: CloudinaryService.validateFileType(file.mimetype) && 
             CloudinaryService.validateFileSize(file.size),
      errors: [
        ...(!CloudinaryService.validateFileType(file.mimetype) ? ['Tipo de archivo no permitido'] : []),
        ...(!CloudinaryService.validateFileSize(file.size) ? ['Archivo excede el tamaño máximo (10MB)'] : [])
      ]
    }));

    const allValid = validationResults.every(result => result.valid);

    const response: ApiResponse = {
      success: allValid,
      message: allValid ? 'Todos los archivos son válidos' : 'Algunos archivos no son válidos',
      data: {
        files: validationResults,
        totalFiles: files.length,
        validFiles: validationResults.filter(r => r.valid).length
      }
    };

    res.status(allValid ? 200 : 400).json(response);
  });
}

export default SolicitudController;
