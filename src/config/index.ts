import dotenv from 'dotenv';
import { EmailConfig, CloudinaryConfig } from '@/types';

// Cargar variables de entorno
dotenv.config();

// Validar variables de entorno obligatorias
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'RESEND_API_KEY',
  'ADMIN_EMAIL',
  'FROM_EMAIL'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Variable de entorno requerida no encontrada: ${envVar}`);
  }
}

// Configuración del servidor
export const config = {
  // Servidor
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  
  // CORS
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  
  // Base de datos
  database: {
    url: process.env.DATABASE_URL!,
    ssl: process.env.NODE_ENV === 'production'
  },
  
  // Cloudinary
  cloudinary: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
    api_key: process.env.CLOUDINARY_API_KEY!,
    api_secret: process.env.CLOUDINARY_API_SECRET!
  } as CloudinaryConfig,
  
  // Email
  email: {
    api_key: process.env.RESEND_API_KEY!,
    from_email: process.env.FROM_EMAIL!,
    admin_email: process.env.ADMIN_EMAIL!,
    company_name: process.env.COMPANY_NAME || 'TUBOS MONTERREY S.A. DE C.V.'
  } as EmailConfig,
  
  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 min
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
  },
  
  // Archivos
  files: {
    maxSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
    allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || ['png', 'jpg', 'jpeg', 'pdf']
  },
  
  // Administrador por defecto
  defaultAdmin: {
    email: process.env.ADMIN_EMAIL_DEFAULT || 'ijimenez@tubosmonterrey.com.mx',
    password: process.env.ADMIN_PASSWORD_DEFAULT || 'RealDelB05',
    name: process.env.ADMIN_NAME_DEFAULT || 'Administrador Sistema'
  }
};

// Configuración de desarrollo
export const isDevelopment = config.nodeEnv === 'development';
export const isProduction = config.nodeEnv === 'production';
export const isTesting = config.nodeEnv === 'test';

// Exportar configuraciones específicas
export { config as default };
