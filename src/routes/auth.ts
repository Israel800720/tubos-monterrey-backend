import { Router } from 'express';
import { AuthController } from '@/controllers/authController';
import { 
  validateClientAuth, 
  validateAdminAuth,
  validateCreateUser 
} from '@/middleware/validation';
import { authenticateToken, requireAdmin } from '@/middleware/auth';

const router = Router();

/**
 * @route   POST /api/auth/cliente
 * @desc    Autenticación de cliente con número de cliente y RFC
 * @access  Public
 */
router.post('/cliente', validateClientAuth, AuthController.loginCliente);

/**
 * @route   POST /api/auth/admin
 * @desc    Autenticación de administrador con email y contraseña
 * @access  Public
 */
router.post('/admin', validateAdminAuth, AuthController.loginAdmin);

/**
 * @route   GET /api/auth/verify
 * @desc    Verificar token de autenticación
 * @access  Private
 */
router.get('/verify', authenticateToken, AuthController.verifyAuth);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refrescar token de autenticación
 * @access  Private
 */
router.post('/refresh', authenticateToken, AuthController.refreshToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Cerrar sesión (invalidar token)
 * @access  Private
 */
router.post('/logout', authenticateToken, AuthController.logout);

/**
 * @route   POST /api/auth/validate-rfc
 * @desc    Validar RFC de cliente sin autenticación completa
 * @access  Public
 */
router.post('/validate-rfc', AuthController.validateClienteRFC);

/**
 * @route   POST /api/auth/validate-codigo
 * @desc    Validar código de cliente
 * @access  Public
 */
router.post('/validate-codigo', AuthController.validateCodigoCliente);

/**
 * @route   POST /api/auth/setup-admin
 * @desc    Crear primer usuario administrador (solo para setup inicial)
 * @access  Public (solo si no existen administradores)
 */
router.post('/setup-admin', validateCreateUser, AuthController.setupAdmin);

/**
 * @route   GET /api/auth/session
 * @desc    Obtener información de sesión actual
 * @access  Private
 */
router.get('/session', authenticateToken, AuthController.getCurrentSession);

export default router;
