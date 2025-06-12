import { Router } from 'express';
import { Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '@/middleware/auth';
import { ClienteModel } from '@/models/Cliente';
import { SolicitudModel } from '@/models/Solicitud';
import { UserModel } from '@/models/User';
import { CloudinaryService } from '@/services/cloudinaryService';
import { EmailService } from '@/services/emailService';
import { ExcelUtils } from '@/utils/excelUtils';
import { PDFGenerator } from '@/utils/pdfGenerator';
import { ApiResponse, DashboardStats } from '@/types';
import { asyncHandler } from '@/middleware/errorHandler';
import config from '@/config';

const router = Router();

/**
 * @route   GET /api/admin/dashboard
 * @desc    Obtener datos del dashboard administrativo
 * @access  Private (Admin)
 */
router.get('/dashboard', 
  authenticateToken, 
  requireAdmin, 
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Obtener estadísticas generales
    const [clienteStats, solicitudStats, userStats] = await Promise.all([
      ClienteModel.getStats(),
      SolicitudModel.getStats(),
      UserModel.getStats()
    ]);

    // Obtener solicitudes recientes
    const solicitudesRecientes = await SolicitudModel.getRecientes(5);

    const dashboardData: DashboardStats = {
      total_solicitudes: solicitudStats.total,
      solicitudes_pendientes: solicitudStats.pendientes,
      solicitudes_procesadas: solicitudStats.procesadas,
      solicitudes_rechazadas: solicitudStats.rechazadas,
      total_clientes: clienteStats.total,
      solicitudes_por_mes: solicitudStats.solicitudesPorMes
    };

    const response: ApiResponse = {
      success: true,
      message: 'Datos del dashboard obtenidos exitosamente',
      data: {
        stats: dashboardData,
        clienteStats,
        solicitudStats,
        userStats,
        solicitudesRecientes,
        serverInfo: {
          nodeEnv: config.nodeEnv,
          version: process.env.npm_package_version || '1.0.0',
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage()
        }
      }
    };

    res.status(200).json(response);
  })
);

/**
 * @route   GET /api/admin/export/solicitudes
 * @desc    Exportar todas las solicitudes a Excel
 * @access  Private (Admin)
 */
router.get('/export/solicitudes', 
  authenticateToken, 
  requireAdmin, 
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Obtener todas las solicitudes
    const result = await SolicitudModel.findAll(1, 10000); // Máximo 10k solicitudes
    
    const excelBuffer = ExcelUtils.exportSolicitudes(result.solicitudes);
    
    const fecha = new Date().toISOString().split('T')[0];
    const filename = `solicitudes_${fecha}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', excelBuffer.length);
    
    res.send(excelBuffer);
  })
);

/**
 * @route   GET /api/admin/export/reporte-pdf
 * @desc    Generar reporte PDF de solicitudes
 * @access  Private (Admin)
 */
router.get('/export/reporte-pdf', 
  authenticateToken, 
  requireAdmin, 
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Obtener solicitudes para el reporte
    const result = await SolicitudModel.findAll(1, 1000); // Máximo 1k para PDF
    
    const pdfBytes = await PDFGenerator.generateReportePDF(result.solicitudes);
    
    const fecha = new Date().toISOString().split('T')[0];
    const filename = `reporte_solicitudes_${fecha}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBytes.length);
    
    res.send(Buffer.from(pdfBytes));
  })
);

/**
 * @route   GET /api/admin/system/info
 * @desc    Obtener información del sistema
 * @access  Private (Admin)
 */
router.get('/system/info', 
  authenticateToken, 
  requireAdmin, 
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Obtener estadísticas de Cloudinary
    const cloudinaryStats = await CloudinaryService.getUsageStats();

    const systemInfo = {
      server: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      },
      environment: {
        nodeEnv: config.nodeEnv,
        port: config.port,
        frontendUrl: config.frontendUrl
      },
      database: {
        connected: true, // TODO: Implementar check de conexión
        // TODO: Agregar stats de BD si es necesario
      },
      cloudinary: cloudinaryStats,
      version: {
        api: process.env.npm_package_version || '1.0.0',
        lastDeploy: process.env.DEPLOY_TIME || new Date().toISOString()
      }
    };

    const response: ApiResponse = {
      success: true,
      message: 'Información del sistema obtenida exitosamente',
      data: systemInfo
    };

    res.status(200).json(response);
  })
);

/**
 * @route   POST /api/admin/test/email
 * @desc    Probar configuración de email
 * @access  Private (Admin)
 */
router.post('/test/email', 
  authenticateToken, 
  requireAdmin, 
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const success = await EmailService.testEmailConnection();

    const response: ApiResponse = {
      success,
      message: success ? 'Configuración de email verificada correctamente' : 'Error en configuración de email',
      data: {
        emailConfigured: success,
        timestamp: new Date().toISOString()
      }
    };

    res.status(success ? 200 : 500).json(response);
  })
);

/**
 * @route   POST /api/admin/cleanup/files
 * @desc    Limpiar archivos antiguos de Cloudinary
 * @access  Private (Admin)
 */
router.post('/cleanup/files', 
  authenticateToken, 
  requireAdmin, 
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const daysOld = parseInt(req.body.days_old) || 30;
    
    const result = await CloudinaryService.cleanupOldFiles(daysOld);

    console.log(`[ADMIN] Limpieza de archivos ejecutada: ${result.deleted} eliminados, ${result.errors} errores`);

    const response: ApiResponse = {
      success: true,
      message: `Limpieza completada: ${result.deleted} archivos eliminados`,
      data: {
        ...result,
        daysOld,
        timestamp: new Date().toISOString()
      }
    };

    res.status(200).json(response);
  })
);

/**
 * @route   GET /api/admin/users
 * @desc    Obtener lista de usuarios
 * @access  Private (Admin)
 */
router.get('/users', 
  authenticateToken, 
  requireAdmin, 
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const users = await UserModel.findAll();

    const response: ApiResponse = {
      success: true,
      message: 'Usuarios obtenidos exitosamente',
      data: users
    };

    res.status(200).json(response);
  })
);

/**
 * @route   POST /api/admin/users
 * @desc    Crear nuevo usuario administrador
 * @access  Private (Admin)
 */
router.post('/users', 
  authenticateToken, 
  requireAdmin, 
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password, name } = req.body;

    // Verificar que no existe el email
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      const response: ApiResponse = {
        success: false,
        message: 'Ya existe un usuario con ese email',
        error: 'EMAIL_EXISTS'
      };
      res.status(409).json(response);
      return;
    }

    const user = await UserModel.create({
      email,
      password,
      name,
      role: 'admin'
    });

    console.log(`[ADMIN] Nuevo usuario creado: ${user.email}`);

    const response: ApiResponse = {
      success: true,
      message: 'Usuario creado exitosamente',
      data: user
    };

    res.status(201).json(response);
  })
);

/**
 * @route   PUT /api/admin/users/:id/activate
 * @desc    Activar/desactivar usuario
 * @access  Private (Admin)
 */
router.put('/users/:id/activate', 
  authenticateToken, 
  requireAdmin, 
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = parseInt(req.params.id);
    const { is_active } = req.body;

    const updated = is_active 
      ? await UserModel.activate(userId)
      : await UserModel.deactivate(userId);

    if (!updated) {
      const response: ApiResponse = {
        success: false,
        message: 'Usuario no encontrado',
        error: 'USER_NOT_FOUND'
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      message: `Usuario ${is_active ? 'activado' : 'desactivado'} exitosamente`
    };

    res.status(200).json(response);
  })
);

/**
 * @route   GET /api/admin/logs
 * @desc    Obtener logs del sistema (para futuro desarrollo)
 * @access  Private (Admin)
 */
router.get('/logs', 
  authenticateToken, 
  requireAdmin, 
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // TODO: Implementar sistema de logs persistente
    
    const response: ApiResponse = {
      success: true,
      message: 'Logs del sistema',
      data: {
        message: 'Sistema de logs no implementado aún',
        available: false
      }
    };

    res.status(200).json(response);
  })
);

export default router;
