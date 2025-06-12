import { Router } from 'express';
import multer from 'multer';
import { SolicitudController } from '@/controllers/solicitudController';
import { authenticateToken, requireAdmin } from '@/middleware/auth';
import { 
  validateSolicitudBasic,
  validatePersonaFisica,
  validatePersonaMoral,
  validateProveedores,
  validateDatosBancarios,
  validatePaginationQuery,
  validateSearchQuery,
  validateIdParam,
  validateEstadoUpdate,
  validateFileUpload,
  conditionalValidation
} from '@/middleware/validation';

const router = Router();

// Configuración de multer para upload de archivos de solicitud
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo por archivo
    files: 20 // Máximo 20 archivos por solicitud
  },
  fileFilter: (req, file, cb) => {
    // Aceptar solo tipos de archivo permitidos
    const allowedMimes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'application/pdf'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF, JPG, JPEG y PNG'));
    }
  }
});

/**
 * @route   GET /api/solicitudes
 * @desc    Obtener todas las solicitudes con filtros y paginación
 * @access  Private (Admin)
 */
router.get('/', 
  authenticateToken, 
  requireAdmin, 
  validatePaginationQuery,
  validateSearchQuery,
  SolicitudController.getSolicitudes
);

/**
 * @route   GET /api/solicitudes/stats
 * @desc    Obtener estadísticas de solicitudes
 * @access  Private (Admin)
 */
router.get('/stats', 
  authenticateToken, 
  requireAdmin, 
  SolicitudController.getStats
);

/**
 * @route   GET /api/solicitudes/recientes
 * @desc    Obtener solicitudes recientes
 * @access  Private (Admin)
 */
router.get('/recientes', 
  authenticateToken, 
  requireAdmin, 
  SolicitudController.getRecientes
);

/**
 * @route   GET /api/solicitudes/search
 * @desc    Buscar solicitudes
 * @access  Private (Admin)
 */
router.get('/search', 
  authenticateToken, 
  requireAdmin, 
  validatePaginationQuery,
  SolicitudController.searchSolicitudes
);

/**
 * @route   POST /api/solicitudes
 * @desc    Crear nueva solicitud de crédito
 * @access  Public (con archivos)
 */
router.post('/', 
  upload.array('archivos', 20),
  validateFileUpload,
  validateSolicitudBasic,
  conditionalValidation(
    (req) => req.body.tipo_persona === 'FISICA',
    validatePersonaFisica
  ),
  conditionalValidation(
    (req) => req.body.tipo_persona === 'MORAL', 
    validatePersonaMoral
  ),
  validateProveedores,
  validateDatosBancarios,
  SolicitudController.createSolicitud
);

/**
 * @route   POST /api/solicitudes/validate-files
 * @desc    Validar archivos antes de enviar solicitud
 * @access  Public
 */
router.post('/validate-files',
  upload.array('archivos', 20),
  SolicitudController.validateFiles
);

/**
 * @route   GET /api/solicitudes/folio/:folio
 * @desc    Obtener solicitud por folio
 * @access  Private (Admin)
 */
router.get('/folio/:folio', 
  authenticateToken, 
  requireAdmin, 
  SolicitudController.getSolicitudByFolio
);

/**
 * @route   GET /api/solicitudes/cliente/:clienteId
 * @desc    Obtener solicitudes de un cliente específico
 * @access  Private (Admin)
 */
router.get('/cliente/:clienteId', 
  authenticateToken, 
  requireAdmin, 
  validateIdParam,
  SolicitudController.getSolicitudesByCliente
);

/**
 * @route   GET /api/solicitudes/:id
 * @desc    Obtener solicitud por ID
 * @access  Private (Admin)
 */
router.get('/:id', 
  authenticateToken, 
  requireAdmin, 
  validateIdParam,
  SolicitudController.getSolicitud
);

/**
 * @route   PUT /api/solicitudes/:id/estado
 * @desc    Actualizar estado de solicitud
 * @access  Private (Admin)
 */
router.put('/:id/estado', 
  authenticateToken, 
  requireAdmin, 
  validateIdParam,
  validateEstadoUpdate,
  SolicitudController.updateEstado
);

/**
 * @route   GET /api/solicitudes/:id/archivos/download
 * @desc    Descargar archivos de solicitud en ZIP
 * @access  Private (Admin)
 */
router.get('/:id/archivos/download', 
  authenticateToken, 
  requireAdmin, 
  validateIdParam,
  SolicitudController.downloadArchivos
);

/**
 * @route   POST /api/solicitudes/:id/pdf/regenerate
 * @desc    Regenerar PDF de solicitud
 * @access  Private (Admin)
 */
router.post('/:id/pdf/regenerate', 
  authenticateToken, 
  requireAdmin, 
  validateIdParam,
  SolicitudController.regeneratePDF
);

/**
 * @route   DELETE /api/solicitudes/:id
 * @desc    Eliminar solicitud
 * @access  Private (Admin)
 */
router.delete('/:id', 
  authenticateToken, 
  requireAdmin, 
  validateIdParam,
  SolicitudController.deleteSolicitud
);

export default router;
