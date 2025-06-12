import { Router } from 'express';
import multer from 'multer';
import { ClienteController } from '@/controllers/clienteController';
import { authenticateToken, requireAdmin } from '@/middleware/auth';
import { 
  validateCliente, 
  validatePaginationQuery, 
  validateSearchQuery,
  validateIdParam,
  handleValidationErrors
} from '@/middleware/validation';

const router = Router();

// Configuración de multer para upload de archivos Excel
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
    files: 1 // Solo un archivo Excel
  },
  fileFilter: (req, file, cb) => {
    // Aceptar solo archivos Excel
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel' // .xls
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls)'));
    }
  }
});

/**
 * @route   GET /api/clientes
 * @desc    Obtener todos los clientes con paginación y búsqueda
 * @access  Private (Admin)
 */
router.get('/', 
  authenticateToken, 
  requireAdmin, 
  validatePaginationQuery,
  validateSearchQuery,
  ClienteController.getClientes
);

/**
 * @route   GET /api/clientes/stats
 * @desc    Obtener estadísticas de clientes
 * @access  Private (Admin)
 */
router.get('/stats', 
  authenticateToken, 
  requireAdmin, 
  ClienteController.getStats
);

/**
 * @route   GET /api/clientes/search
 * @desc    Buscar clientes
 * @access  Private (Admin)
 */
router.get('/search', 
  authenticateToken, 
  requireAdmin, 
  validatePaginationQuery,
  ClienteController.searchClientes
);

/**
 * @route   GET /api/clientes/template
 * @desc    Descargar plantilla Excel para clientes
 * @access  Private (Admin)
 */
router.get('/template', 
  authenticateToken, 
  requireAdmin, 
  ClienteController.downloadTemplate
);

/**
 * @route   GET /api/clientes/export
 * @desc    Exportar clientes a Excel
 * @access  Private (Admin)
 */
router.get('/export', 
  authenticateToken, 
  requireAdmin, 
  ClienteController.exportExcel
);

/**
 * @route   POST /api/clientes
 * @desc    Crear nuevo cliente
 * @access  Private (Admin)
 */
router.post('/', 
  authenticateToken, 
  requireAdmin, 
  validateCliente, 
  ClienteController.createCliente
);

/**
 * @route   POST /api/clientes/upload
 * @desc    Cargar clientes desde archivo Excel
 * @access  Private (Admin)
 */
router.post('/upload', 
  authenticateToken, 
  requireAdmin,
  upload.single('excel'),
  ClienteController.uploadExcel
);

/**
 * @route   POST /api/clientes/validate
 * @desc    Validar datos de cliente
 * @access  Private (Admin)
 */
router.post('/validate', 
  authenticateToken, 
  requireAdmin, 
  ClienteController.validateCliente
);

/**
 * @route   DELETE /api/clientes/clear
 * @desc    Limpiar base de datos de clientes
 * @access  Private (Admin)
 */
router.delete('/clear', 
  authenticateToken, 
  requireAdmin, 
  ClienteController.clearDatabase
);

/**
 * @route   GET /api/clientes/:id
 * @desc    Obtener cliente por ID
 * @access  Private (Admin)
 */
router.get('/:id', 
  authenticateToken, 
  requireAdmin, 
  validateIdParam,
  ClienteController.getCliente
);

/**
 * @route   PUT /api/clientes/:id
 * @desc    Actualizar cliente
 * @access  Private (Admin)
 */
router.put('/:id', 
  authenticateToken, 
  requireAdmin, 
  validateIdParam,
  validateCliente,
  ClienteController.updateCliente
);

/**
 * @route   DELETE /api/clientes/:id
 * @desc    Eliminar cliente
 * @access  Private (Admin)
 */
router.delete('/:id', 
  authenticateToken, 
  requireAdmin, 
  validateIdParam,
  ClienteController.deleteCliente
);

export default router;
