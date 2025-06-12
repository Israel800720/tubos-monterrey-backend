import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import config, { isDevelopment } from '@/config';
import routes from '@/routes';
import { 
  errorHandler, 
  notFoundHandler,
  jsonErrorHandler,
  securityErrorHandler,
  cleanupHandler,
  timeoutHandler
} from '@/middleware/errorHandler';
import { testConnection, closePool } from '@/models/database';
import { UserModel } from '@/models/User';
import { pathToFileURL } from 'node:url';
import process from 'node:process';

// Crear aplicación Express
const app = express();

/**
 * CONFIGURACIÓN DE MIDDLEWARES DE SEGURIDAD
 */

// Helmet para headers de seguridad
app.use(helmet({
  contentSecurityPolicy: isDevelopment ? false : {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  exposedHeaders: ['Content-Disposition']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    message: 'Demasiadas solicitudes desde esta IP, intente más tarde',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

/**
 * CONFIGURACIÓN DE MIDDLEWARES GENERALES
 */

// Compresión gzip
app.use(compression());

// Timeout para requests
app.use(timeoutHandler(30000)); // 30 segundos

// Logging de requests
if (isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Parse JSON con límite de tamaño
app.use(express.json({ 
  limit: '10mb',
  verify: (_req, _res, buf) => {
    // Verificar que el JSON no esté malformado
    try {
      JSON.parse(buf.toString());
    } catch (e) {
      throw new Error('JSON inválido');
    }
  }
}));

// Parse URL encoded
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Middleware para manejo de errores JSON
app.use(jsonErrorHandler);

/**
 * RUTAS DE LA API
 */

// Health check simple en root
app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: '🏢 TUBOS MONTERREY S.A. DE C.V. - API Sistema de Solicitudes de Crédito',
    data: {
      status: 'online',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: config.nodeEnv
    }
  });
});

// Rutas principales de la API
app.use('/api', routes);

/**
 * MIDDLEWARE DE MANEJO DE ERRORES
 */

// Cleanup de recursos en errores
app.use(cleanupHandler);

// Log de errores de seguridad
app.use(securityErrorHandler);

// Ruta no encontrada (404)
app.use(notFoundHandler);

// Manejo global de errores
app.use(errorHandler);

/**
 * FUNCIONES DE INICIALIZACIÓN
 */

// Función para inicializar la base de datos
async function initializeDatabase(): Promise<void> {
  try {
    console.log('🔄 Verificando conexión a la base de datos...');
    const connected = await testConnection();
    
    if (!connected) {
      throw new Error('No se pudo conectar a la base de datos');
    }

    console.log('✅ Base de datos conectada correctamente');

    // Crear usuario administrador por defecto si no existe
    if (config.defaultAdmin.email && config.defaultAdmin.password) {
      await UserModel.createDefaultAdmin({
        email: config.defaultAdmin.email,
        password: config.defaultAdmin.password,
        name: config.defaultAdmin.name
      });
    }

  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    throw error;
  }
}

// Función para iniciar el servidor
async function startServer(): Promise<void> {
  try {
    await initializeDatabase();

    const server = app.listen(config.port, () => {
      console.log('\n🚀 ========================================');
      console.log(`   TUBOS MONTERREY - API Server`);
      console.log('========================================');
      console.log(`🌐 Servidor corriendo en puerto: ${config.port}`);
      console.log(`📝 Entorno: ${config.nodeEnv}`);
      console.log(`🔗 URL local: http://localhost:${config.port}`);
      console.log(`🎯 API endpoint: http://localhost:${config.port}/api`);
      console.log(`💻 Frontend URL: ${config.frontendUrl}`);
      console.log('========================================\n');
      
      if (isDevelopment) {
        console.log('📋 Endpoints disponibles:');
        console.log('   GET  /api/health - Health check');
        console.log('   GET  /api/info - Información de la API');
        console.log('   POST /api/auth/cliente - Login cliente');
        console.log('   POST /api/auth/admin - Login administrador');
        console.log('   GET  /api/admin/dashboard - Dashboard');
        console.log('   POST /api/solicitudes - Crear solicitud');
        console.log('   GET  /api/clientes - Gestionar clientes\n');
      }
    });

    // Manejar cierre graceful
    const gracefulShutdown = (signal: string) => {
      console.log(`\n🛑 Señal ${signal} recibida. Cerrando servidor...`);
      
      server.close(async () => {
        console.log('🔌 Servidor HTTP cerrado');
        
        try {
          await closePool();
          console.log('🗄️  Conexiones de base de datos cerradas');
        } catch (error) {
          console.error('❌ Error cerrando conexiones de BD:', error);
        }
        
        console.log('✅ Servidor cerrado correctamente');
        process.exit(0);
      });

      // Forzar cierre después de 10 segundos
      setTimeout(() => {
        console.error('⚠️  Forzando cierre del servidor...');
        process.exit(1);
      }, 10000);
    };

    // Listeners para señales de cierre
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Manejar errores no capturados
    process.on('uncaughtException', (error) => {
      console.error('💥 Excepción no capturada:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Promesa rechazada no manejada en:', promise, 'razón:', reason);
      process.exit(1);
    });

  } catch (error) {
    console.error('💥 Error fatal iniciando servidor:', error);
    process.exit(1);
  }
}

// En ES Modules, se compara la URL del módulo actual con la URL del script principal
const scriptUrl = pathToFileURL(process.argv[1]).href;
if (import.meta.url === scriptUrl) {
  startServer();
}

export default app;
export { startServer, initializeDatabase };
