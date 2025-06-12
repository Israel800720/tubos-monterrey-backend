import { Request, Response } from 'express';
import { UserModel } from '@/models/User';
import { ClienteModel } from '@/models/Cliente';
import { generateToken } from '@/middleware/auth';
import { ApiResponse, LoginClienteRequest, LoginAdminRequest, AuthResponse, ClienteAuthResponse } from '@/types';
import { RFCValidator } from '@/utils/rfcValidator';
import { asyncHandler, BusinessError, AuthenticationError } from '@/middleware/errorHandler';

/**
 * Controlador de Autenticación
 */
export class AuthController {
  /**
   * Login de cliente - Valida número de cliente y RFC
   */
  static loginCliente = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { numero_cliente, rfc }: LoginClienteRequest = req.body;

    // Normalizar RFC
    const rfcNormalizado = RFCValidator.normalize(rfc);

    // Validar RFC
    const rfcValidation = RFCValidator.validate(rfcNormalizado);
    if (!rfcValidation.isValid) {
      throw new BusinessError(
        `RFC inválido: ${rfcValidation.errors.join(', ')}`,
        400,
        'INVALID_RFC'
      );
    }

    // Buscar cliente en la base de datos
    const cliente = await ClienteModel.findByCodigoAndRFC(numero_cliente, rfcNormalizado);
    
    if (!cliente) {
      throw new AuthenticationError(
        'No encontramos su número de cliente y/o RFC en nuestra base de datos, lo que significa que no cumple con la primera condición para solicitar una línea de crédito: ser un cliente activo con al menos 3 meses de antigüedad. Para comenzar a generar su historial, le recomendamos realizar compras de contado durante los próximos 3 meses. Una vez cumplido este periodo, podrá aplicar a una línea de crédito conforme a nuestras políticas. Si tiene alguna duda o requiere más información, no dude en contactarnos: 📞 Teléfono: 55 5078 7700 📱 WhatsApp: 55 4144 8919 ✉️ Email: tubosmty@tubosmonterrey.com.mx Estamos aquí para apoyarlo.'
      );
    }

    // Determinar tipo de persona basado en RFC
    const tipoPersona = RFCValidator.getTipoPersona(rfcNormalizado);
    
    if (!tipoPersona) {
      throw new BusinessError(
        'No se puede determinar el tipo de persona del RFC proporcionado',
        400,
        'INVALID_RFC_TYPE'
      );
    }

    // Log de acceso exitoso
    console.log(`[AUTH] Cliente autenticado exitosamente: ${cliente.codigo_sn} - ${cliente.nombre_sn}`);

    const response: ApiResponse<ClienteAuthResponse> = {
      success: true,
      message: 'Cliente autenticado exitosamente',
      data: {
        cliente,
        tipo_persona: tipoPersona
      }
    };

    res.status(200).json(response);
  });

  /**
   * Login de administrador - Valida email y contraseña
   */
  static loginAdmin = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password }: LoginAdminRequest = req.body;

    // Validar credenciales
    const user = await UserModel.validatePassword(email, password);
    
    if (!user) {
      throw new AuthenticationError('Credenciales inválidas');
    }

    if (user.role !== 'admin') {
      throw new AuthenticationError('Acceso denegado. Se requieren permisos de administrador');
    }

    if (!user.is_active) {
      throw new AuthenticationError('Cuenta desactivada. Contacte al administrador del sistema');
    }

    // Generar token JWT
    const token = generateToken({
      userId: user.id!,
      email: user.email
    });

    // Actualizar último login
    await UserModel.updateLastLogin(user.id!);

    // Log de acceso exitoso
    console.log(`[AUTH] Administrador autenticado exitosamente: ${user.email}`);

    const response: ApiResponse<AuthResponse> = {
      success: true,
      message: 'Administrador autenticado exitosamente',
      data: {
        token,
        user: {
          id: user.id!,
          email: user.email,
          name: user.name,
          role: user.role,
          is_active: user.is_active ?? true,
          created_at: user.created_at,
          updated_at: user.updated_at
        }
      }
    };

    res.status(200).json(response);
  });

  /**
   * Verificar estado de autenticación
   */
  static verifyAuth = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;

    if (!user) {
      throw new AuthenticationError('No autenticado');
    }

    const response: ApiResponse = {
      success: true,
      message: 'Token válido',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          is_active: user.is_active
        }
      }
    };

    res.status(200).json(response);
  });

  /**
   * Refrescar token de autenticación
   */
  static refreshToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;

    if (!user) {
      throw new AuthenticationError('No autenticado');
    }

    // Verificar que el usuario siga activo
    const currentUser = await UserModel.findById(user.id);
    
    if (!currentUser || !currentUser.is_active) {
      throw new AuthenticationError('Usuario no encontrado o desactivado');
    }

    // Generar nuevo token
    const token = generateToken({
      userId: currentUser.id!,
      email: currentUser.email
    });

    const response: ApiResponse<{ token: string }> = {
      success: true,
      message: 'Token refrescado exitosamente',
      data: { token }
    };

    res.status(200).json(response);
  });

  /**
   * Logout (invalidar token - para futuro uso con blacklist)
   */
  static logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;

    // TODO: Implementar blacklist de tokens si es necesario
    console.log(`[AUTH] Usuario ${user?.email || 'Unknown'} cerró sesión`);

    const response: ApiResponse = {
      success: true,
      message: 'Sesión cerrada exitosamente'
    };

    res.status(200).json(response);
  });

  /**
   * Validar existencia de cliente por RFC (sin autenticación completa)
   */
  static validateClienteRFC = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { rfc } = req.body;

    if (!rfc) {
      throw new BusinessError('RFC es requerido', 400, 'MISSING_RFC');
    }

    // Normalizar y validar RFC
    const rfcNormalizado = RFCValidator.normalize(rfc);
    const rfcValidation = RFCValidator.validate(rfcNormalizado);
    
    if (!rfcValidation.isValid) {
      throw new BusinessError(
        `RFC inválido: ${rfcValidation.errors.join(', ')}`,
        400,
        'INVALID_RFC'
      );
    }

    // Buscar cliente por RFC
    const cliente = await ClienteModel.findByRFC(rfcNormalizado);
    const tipoPersona = RFCValidator.getTipoPersona(rfcNormalizado);

    const response: ApiResponse = {
      success: true,
      message: 'RFC validado',
      data: {
        exists: !!cliente,
        tipo_persona: tipoPersona,
        rfc_valido: true
      }
    };

    res.status(200).json(response);
  });

  /**
   * Validar código de cliente
   */
  static validateCodigoCliente = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { codigo_sn } = req.body;

    if (!codigo_sn) {
      throw new BusinessError('Código SN es requerido', 400, 'MISSING_CODIGO_SN');
    }

    // Buscar cliente por código SN
    const cliente = await ClienteModel.findByCodigoSN(codigo_sn);

    const response: ApiResponse = {
      success: true,
      message: 'Código de cliente validado',
      data: {
        exists: !!cliente,
        cliente: cliente ? {
          codigo_sn: cliente.codigo_sn,
          nombre_sn: cliente.nombre_sn,
          rfc: cliente.rfc
        } : null
      }
    };

    res.status(200).json(response);
  });

  /**
   * Crear primer usuario administrador (solo para setup inicial)
   */
  static setupAdmin = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password, name } = req.body;

    // Verificar si ya existe un administrador
    const existingAdmins = await UserModel.findByRole('admin');
    
    if (existingAdmins.length > 0) {
      throw new BusinessError(
        'Ya existe al menos un usuario administrador en el sistema',
        409,
        'ADMIN_EXISTS'
      );
    }

    // Crear administrador
    const admin = await UserModel.create({
      email,
      password,
      name,
      role: 'admin'
    });

    console.log(`[SETUP] Administrador inicial creado: ${admin.email}`);

    const response: ApiResponse = {
      success: true,
      message: 'Usuario administrador creado exitosamente',
      data: {
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role
        }
      }
    };

    res.status(201).json(response);
  });

  /**
   * Obtener información de sesión actual
   */
  static getCurrentSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;

    if (!user) {
      throw new AuthenticationError('No hay sesión activa');
    }

    // Obtener información actualizada del usuario
    const currentUser = await UserModel.findById(user.id);
    
    if (!currentUser) {
      throw new AuthenticationError('Usuario no encontrado');
    }

    const response: ApiResponse = {
      success: true,
      message: 'Información de sesión obtenida',
      data: {
        user: currentUser,
        session: {
          authenticated: true,
          loginTime: user.updated_at,
          role: user.role
        }
      }
    };

    res.status(200).json(response);
  });
}

export default AuthController;
