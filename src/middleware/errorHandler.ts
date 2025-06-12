import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '@/types';
import config from '@/config';

// Interfaces para errores personalizados
export interface CustomError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

/**
 * Middleware principal de manejo de errores
 */
export const errorHandler = (
  error: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Error interno del servidor';
  let errorCode = error.code || 'INTERNAL_ERROR';

  // Log del error
  console.error(`[ERROR] ${new Date().toISOString()} - ${req.method} ${req.originalUrl}:`, {
    message: error.message,
    stack: error.stack,
    statusCode,
    code: errorCode,
    user: (req as any).user?.email || 'Anonymous',
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Manejar errores específicos de base de datos
  if (error.message.includes('duplicate key value')) {
    statusCode = 409;
    message = 'El registro ya existe';
    errorCode = 'DUPLICATE_ENTRY';
  }

  if (error.message.includes('foreign key constraint')) {
    statusCode = 400;
    message = 'Referencia inválida en los datos';
    errorCode = 'FOREIGN_KEY_ERROR';
  }

  if (error.message.includes('not found')) {
    statusCode = 404;
    message = 'Recurso no encontrado';
    errorCode = 'NOT_FOUND';
  }

  // Manejar errores de validación
  if (error.message.includes('validation failed')) {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
  }

  // Manejar errores de autenticación
  if (error.message.includes('jwt') || error.message.includes('token')) {
    statusCode = 401;
    message = 'Token inválido o expirado';
    errorCode = 'AUTHENTICATION_ERROR';
  }

  // Manejar errores de permisos
  if (error.message.includes('permission') || error.message.includes('forbidden')) {
    statusCode = 403;
    message = 'Permisos insuficientes';
    errorCode = 'PERMISSION_ERROR';
  }

  // Respuesta de error
  const errorResponse: ApiResponse = {
    success: false,
    message,
    error: errorCode
  };

  // En desarrollo, incluir más detalles del error
  if (config.nodeEnv === 'development') {
    errorResponse.data = {
      stack: error.stack,
      originalMessage: error.message,
      statusCode
    };
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Middleware para manejar rutas no encontradas
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error: CustomError = new Error(`Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  error.code = 'ROUTE_NOT_FOUND';
  next(error);
};

/**
 * Wrapper para funciones async para capturar errores automáticamente
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Crear error personalizado
 */
export const createError = (
  message: string,
  statusCode: number = 500,
  code: string = 'CUSTOM_ERROR'
): CustomError => {
  const error: CustomError = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.isOperational = true;
  return error;
};

/**
 * Errores específicos del negocio
 */
export class BusinessError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean = true;

  constructor(message: string, statusCode: number = 400, code: string = 'BUSINESS_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'BusinessError';
  }
}

export class ValidationError extends Error {
  public statusCode: number = 400;
  public code: string = 'VALIDATION_ERROR';
  public isOperational: boolean = true;
  public fields: any[];

  constructor(message: string, fields: any[] = []) {
    super(message);
    this.fields = fields;
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  public statusCode: number = 401;
  public code: string = 'AUTHENTICATION_ERROR';
  public isOperational: boolean = true;

  constructor(message: string = 'No autenticado') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  public statusCode: number = 403;
  public code: string = 'AUTHORIZATION_ERROR';
  public isOperational: boolean = true;

  constructor(message: string = 'Acceso denegado') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  public statusCode: number = 404;
  public code: string = 'NOT_FOUND';
  public isOperational: boolean = true;

  constructor(message: string = 'Recurso no encontrado') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  public statusCode: number = 409;
  public code: string = 'CONFLICT';
  public isOperational: boolean = true;

  constructor(message: string = 'Conflicto con el estado actual del recurso') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class ExternalServiceError extends Error {
  public statusCode: number = 503;
  public code: string = 'EXTERNAL_SERVICE_ERROR';
  public isOperational: boolean = true;
  public service: string;

  constructor(message: string, service: string = 'Unknown') {
    super(message);
    this.service = service;
    this.name = 'ExternalServiceError';
  }
}

/**
 * Middleware para validar límites de rate limiting
 */
export const rateLimitErrorHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.status(429).json({
    success: false,
    message: 'Demasiadas solicitudes. Intente más tarde',
    error: 'RATE_LIMIT_EXCEEDED',
    data: {
      retryAfter: 60, // segundos
      limit: 100,
      windowMs: 900000 // 15 minutos
    }
  } as ApiResponse);
};

/**
 * Middleware para manejar timeouts
 */
export const timeoutHandler = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          message: 'La solicitud ha superado el tiempo límite',
          error: 'REQUEST_TIMEOUT'
        } as ApiResponse);
      }
    }, timeoutMs);

    // Limpiar timeout cuando la respuesta sea enviada
    res.on('finish', () => {
      clearTimeout(timeout);
    });

    next();
  };
};

/**
 * Middleware para manejar errores de CORS
 */
export const corsErrorHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const origin = req.get('Origin');
  const allowedOrigins = config.corsOrigins;

  if (origin && !allowedOrigins.includes(origin)) {
    const error: CustomError = new Error(`Origen no permitido: ${origin}`);
    error.statusCode = 403;
    error.code = 'CORS_ERROR';
    next(error);
    return;
  }

  next();
};

/**
 * Middleware para capturar errores de JSON malformado
 */
export const jsonErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({
      success: false,
      message: 'JSON inválido en el cuerpo de la solicitud',
      error: 'INVALID_JSON'
    } as ApiResponse);
    return;
  }

  next(error);
};

/**
 * Middleware para logs de errores de seguridad
 */
export const securityErrorHandler = (
  error: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log de errores de seguridad para monitoreo
  if (error.statusCode === 401 || error.statusCode === 403) {
    console.warn(`[SECURITY] ${new Date().toISOString()} - ${error.message}:`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      method: req.method,
      headers: req.headers
    });
  }

  next(error);
};

/**
 * Función para reportar errores críticos (para futuro uso con servicios de monitoreo)
 */
export const reportCriticalError = (error: Error, context: any = {}): void => {
  if (config.nodeEnv === 'production') {
    // TODO: Integrar con servicio de monitoreo como Sentry
    console.error('[CRITICAL ERROR]', {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Middleware para cleanup de recursos en caso de error
 */
export const cleanupHandler = (
  error: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Limpiar recursos temporales, conexiones, etc.
  if ((req as any).tempFiles) {
    // Limpiar archivos temporales
    console.log('Limpiando archivos temporales...');
  }

  if ((req as any).activeConnections) {
    // Cerrar conexiones activas
    console.log('Cerrando conexiones activas...');
  }

  next(error);
};
