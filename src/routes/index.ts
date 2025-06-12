import { Router } from 'express';
import authRoutes from './auth';
import clienteRoutes from './clientes';
import solicitudRoutes from './solicitudes';
import adminRoutes from './admin';

const router = Router();

/**
 * Configuración principal de rutas de la API
 * Todas las rutas están prefijadas con /api
 */

// Rutas de autenticación
router.use('/auth', authRoutes);

// Rutas de gestión de clientes
router.use('/clientes', clienteRoutes);

// Rutas de solicitudes de crédito
router.use('/solicitudes', solicitudRoutes);

// Rutas de administración
router.use('/admin', adminRoutes);

// Ruta de salud de la API
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API funcionando correctamente',
    data: {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime()
    }
  });
});

// Ruta de información de la API
router.get('/info', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Sistema de Solicitudes de Crédito - TUBOS MONTERREY S.A. DE C.V.',
    data: {
      name: 'TUBOS MONTERREY Credit Application API',
      version: process.env.npm_package_version || '1.0.0',
      description: 'API REST para gestión de solicitudes de líneas de crédito',
      endpoints: {
        auth: {
          description: 'Autenticación de clientes y administradores',
          routes: [
            'POST /api/auth/cliente - Login de cliente',
            'POST /api/auth/admin - Login de administrador', 
            'GET /api/auth/verify - Verificar token',
            'POST /api/auth/refresh - Refrescar token'
          ]
        },
        clientes: {
          description: 'Gestión de base de datos de clientes',
          routes: [
            'GET /api/clientes - Listar clientes',
            'POST /api/clientes - Crear cliente',
            'PUT /api/clientes/:id - Actualizar cliente',
            'DELETE /api/clientes/:id - Eliminar cliente',
            'POST /api/clientes/upload - Cargar Excel',
            'GET /api/clientes/template - Descargar plantilla'
          ]
        },
        solicitudes: {
          description: 'Gestión de solicitudes de crédito',
          routes: [
            'GET /api/solicitudes - Listar solicitudes',
            'POST /api/solicitudes - Crear solicitud',
            'GET /api/solicitudes/:id - Ver solicitud',
            'PUT /api/solicitudes/:id/estado - Actualizar estado',
            'GET /api/solicitudes/:id/archivos/download - Descargar archivos'
          ]
        },
        admin: {
          description: 'Panel de administración y reportes',
          routes: [
            'GET /api/admin/dashboard - Dashboard principal',
            'GET /api/admin/export/solicitudes - Exportar solicitudes',
            'GET /api/admin/system/info - Información del sistema',
            'POST /api/admin/test/email - Probar email'
          ]
        }
      },
      features: [
        'Autenticación dual (clientes/administradores)',
        'Validación automática de RFC mexicano',
        'Formularios dinámicos (persona física/moral)',
        'Subida y validación de archivos con OCR',
        'Generación automática de PDFs',
        'Notificaciones por email',
        'Dashboard administrativo completo',
        'Exportación a Excel y PDF',
        'Sistema de búsqueda y filtros'
      ],
      technologies: [
        'Node.js + Express + TypeScript',
        'PostgreSQL con Neon',
        'Cloudinary para archivos',
        'Resend para emails',
        'JWT para autenticación',
        'PDF-lib para generación de PDFs',
        'XLSX para manejo de Excel'
      ],
      contact: {
        company: 'TUBOS MONTERREY S.A. DE C.V.',
        phone: '55 5078 7700',
        whatsapp: '55 4144 8919',
        email: 'tubosmty@tubosmonterrey.com.mx'
      }
    }
  });
});

export default router;
