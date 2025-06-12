import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '@/models/User';
import { AuthenticatedRequest, ApiResponse } from '@/types';
import config from '@/config';

/**
 * Middleware de autenticación JWT
 */
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Token de acceso requerido',
        error: 'MISSING_TOKEN'
      } as ApiResponse);
      return;
    }

    // Verificar token
    const decoded = jwt.verify(token, config.jwt.secret) as { userId: number; email: string };
    
    // Obtener información del usuario
    const user = await UserModel.findById(decoded.userId);
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Token inválido o usuario no encontrado',
        error: 'INVALID_TOKEN'
      } as ApiResponse);
      return;
    }

    // Agregar usuario a la request
    req.user = {
      id: user.id!,
      email: user.email,
      name: user.name,
      role: user.role,
      is_active: user.is_active ?? true,
      created_at: user.created_at,
      updated_at: user.updated_at,
      password_hash: '' // No incluir el hash en las requests
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Token inválido',
        error: 'INVALID_TOKEN'
      } as ApiResponse);
    } else if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token expirado',
        error: 'EXPIRED_TOKEN'
      } as ApiResponse);
    } else {
      console.error('Error en autenticación:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      } as ApiResponse);
    }
  }
};

/**
 * Middleware para verificar rol de administrador
 */
export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Usuario no autenticado',
      error: 'NOT_AUTHENTICATED'
    } as ApiResponse);
    return;
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de administrador',
      error: 'INSUFFICIENT_PERMISSIONS'
    } as ApiResponse);
    return;
  }

  next();
};

/**
 * Middleware para verificar usuario activo
 */
export const requireActiveUser = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Usuario no autenticado',
      error: 'NOT_AUTHENTICATED'
    } as ApiResponse);
    return;
  }

  if (!req.user.is_active) {
    res.status(403).json({
      success: false,
      message: 'Cuenta desactivada. Contacte al administrador',
      error: 'ACCOUNT_DISABLED'
    } as ApiResponse);
    return;
  }

  next();
};

/**
 * Genera token JWT
 */
export const generateToken = (payload: { userId: number; email: string }): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as string,
    issuer: 'tubos-monterrey-api',
    audience: 'tubos-monterrey-app'
  });
};

/**
 * Verifica token JWT sin middleware (para uso en servicios)
 */
export const verifyToken = (token: string): { userId: number; email: string } | null => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as { userId: number; email: string };
    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Middleware opcional de autenticación (no falla si no hay token)
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret) as { userId: number; email: string };
      const user = await UserModel.findById(decoded.userId);
      
      if (user && user.is_active) {
        req.user = {
          id: user.id!,
          email: user.email,
          name: user.name,
          role: user.role,
          is_active: user.is_active ?? true,
          created_at: user.created_at,
          updated_at: user.updated_at,
          password_hash: ''
        };
      }
    }

    next();
  } catch (error) {
    // Ignorar errores en autenticación opcional
    next();
  }
};

/**
 * Middleware para validar API key (futuro uso)
 */
export const validateApiKey = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    res.status(401).json({
      success: false,
      message: 'API Key requerida',
      error: 'MISSING_API_KEY'
    } as ApiResponse);
    return;
  }

  // TODO: Implementar validación de API keys almacenadas en BD
  // Por ahora, usar una API key estática para desarrollo
  const validApiKey = process.env.API_KEY || 'tubos-monterrey-dev-key';
  
  if (apiKey !== validApiKey) {
    res.status(401).json({
      success: false,
      message: 'API Key inválida',
      error: 'INVALID_API_KEY'
    } as ApiResponse);
    return;
  }

  next();
};

/**
 * Middleware para rate limiting por usuario
 */
export const userRateLimit = (maxRequests: number, windowMs: number) => {
  const requests = new Map<number, { count: number; resetTime: number }>();

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next();
      return;
    }

    const userId = req.user.id;
    if (!userId) {
      next();
      return;
    }
    
    const now = Date.now();
    const userRequests = requests.get(userId);

    if (!userRequests || now > userRequests.resetTime) {
      // Primera request o ventana expirada
      requests.set(userId, {
        count: 1,
        resetTime: now + windowMs
      });
      next();
      return;
    }

    if (userRequests.count >= maxRequests) {
      res.status(429).json({
        success: false,
        message: 'Demasiadas solicitudes. Intente más tarde',
        error: 'RATE_LIMIT_EXCEEDED'
      } as ApiResponse);
      return;
    }

    userRequests.count++;
    next();
  };
};

/**
 * Middleware para logging de accesos
 */
export const logAccess = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  
  // Log de request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - User: ${req.user?.email || 'Anonymous'} - IP: ${req.ip}`);
  
  // Log de response cuando termine
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
  });

  next();
};
