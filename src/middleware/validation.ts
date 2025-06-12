import { Request, Response, NextFunction } from 'express';
import { body, query, param, validationResult, ValidationChain } from 'express-validator';
import { ApiResponse } from '@/types';
import { RFCValidator } from '@/utils/rfcValidator';

/**
 * Middleware para manejar errores de validación
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: 'param' in error ? error.param : 'unknown',
      message: error.msg,
      value: 'value' in error ? error.value : undefined
    }));

    res.status(400).json({
      success: false,
      message: 'Errores de validación encontrados',
      error: 'VALIDATION_ERROR',
      data: {
        errors: formattedErrors
      }
    } as ApiResponse);
    return;
  }

  next();
};

/**
 * Validaciones para autenticación de cliente
 */
export const validateClientAuth = [
  body('numero_cliente')
    .notEmpty()
    .withMessage('Número de cliente es requerido')
    .isLength({ min: 1, max: 50 })
    .withMessage('Número de cliente debe tener entre 1 y 50 caracteres')
    .trim(),
  
  body('rfc')
    .notEmpty()
    .withMessage('RFC es requerido')
    .custom((value) => {
      const validation = RFCValidator.validate(value);
      if (!validation.isValid) {
        throw new Error(`RFC inválido: ${validation.errors.join(', ')}`);
      }
      return true;
    })
    .customSanitizer((value) => RFCValidator.normalize(value)),
  
  handleValidationErrors
];

/**
 * Validaciones para autenticación de administrador
 */
export const validateAdminAuth = [
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail()
    .toLowerCase(),
  
  body('password')
    .notEmpty()
    .withMessage('Contraseña es requerida')
    .isLength({ min: 6 })
    .withMessage('Contraseña debe tener al menos 6 caracteres'),
  
  handleValidationErrors
];

/**
 * Validaciones para crear/actualizar cliente
 */
export const validateCliente = [
  body('codigo_sn')
    .notEmpty()
    .withMessage('Código SN es requerido')
    .isLength({ min: 1, max: 50 })
    .withMessage('Código SN debe tener entre 1 y 50 caracteres')
    .trim()
    .toUpperCase(),
  
  body('nombre_sn')
    .notEmpty()
    .withMessage('Nombre SN es requerido')
    .isLength({ min: 1, max: 200 })
    .withMessage('Nombre SN debe tener entre 1 y 200 caracteres')
    .trim()
    .toUpperCase(),
  
  body('rfc')
    .notEmpty()
    .withMessage('RFC es requerido')
    .custom((value) => {
      const validation = RFCValidator.validate(value);
      if (!validation.isValid) {
        throw new Error(`RFC inválido: ${validation.errors.join(', ')}`);
      }
      return true;
    })
    .customSanitizer((value) => RFCValidator.normalize(value)),
  
  body('codigo_condiciones_pago')
    .notEmpty()
    .withMessage('Código de condiciones de pago es requerido')
    .isLength({ min: 1, max: 20 })
    .withMessage('Código de condiciones de pago debe tener entre 1 y 20 caracteres')
    .trim()
    .toUpperCase(),
  
  body('codigo_grupo')
    .notEmpty()
    .withMessage('Código de grupo es requerido')
    .isLength({ min: 1, max: 10 })
    .withMessage('Código de grupo debe tener entre 1 y 10 caracteres')
    .trim()
    .toUpperCase(),
  
  handleValidationErrors
];

/**
 * Validaciones para solicitud de crédito - datos básicos
 */
export const validateSolicitudBasic = [
  body('tipo_persona')
    .isIn(['FISICA', 'MORAL'])
    .withMessage('Tipo de persona debe ser FISICA o MORAL'),
  
  body('cliente_id')
    .isInt({ min: 1 })
    .withMessage('ID de cliente debe ser un número entero positivo'),
  
  body('formulario.id_cif')
    .notEmpty()
    .withMessage('ID CIF es requerido')
    .trim()
    .toUpperCase(),
  
  body('formulario.linea_credito_solicitada')
    .notEmpty()
    .withMessage('Línea de crédito solicitada es requerida')
    .trim()
    .toUpperCase(),
  
  body('formulario.giro_actividades')
    .notEmpty()
    .withMessage('Giro y actividades es requerido')
    .isLength({ min: 5, max: 500 })
    .withMessage('Giro y actividades debe tener entre 5 y 500 caracteres')
    .trim()
    .toUpperCase(),
  
  handleValidationErrors
];

/**
 * Validaciones específicas para persona física
 */
export const validatePersonaFisica = [
  body('formulario.nombre_titular')
    .notEmpty()
    .withMessage('Nombre del titular es requerido')
    .isLength({ min: 2, max: 100 })
    .withMessage('Nombre del titular debe tener entre 2 y 100 caracteres')
    .trim()
    .toUpperCase(),
  
  body('formulario.telefono_fijo')
    .notEmpty()
    .withMessage('Teléfono fijo es requerido')
    .matches(/^[\d\s\-\(\)\+]+$/)
    .withMessage('Teléfono fijo debe contener solo números, espacios, guiones, paréntesis o símbolo +')
    .isLength({ min: 10, max: 20 })
    .withMessage('Teléfono fijo debe tener entre 10 y 20 caracteres'),
  
  body('formulario.celular')
    .notEmpty()
    .withMessage('Celular es requerido')
    .matches(/^[\d\s\-\(\)\+]+$/)
    .withMessage('Celular debe contener solo números, espacios, guiones, paréntesis o símbolo +')
    .isLength({ min: 10, max: 20 })
    .withMessage('Celular debe tener entre 10 y 20 caracteres'),
  
  body('formulario.correo_electronico')
    .isEmail()
    .withMessage('Correo electrónico inválido')
    .normalizeEmail()
    .toLowerCase(),
  
  body('formulario.tipo_domicilio')
    .isIn(['PROPIO', 'RENTA'])
    .withMessage('Tipo de domicilio debe ser PROPIO o RENTA'),
  
  handleValidationErrors
];

/**
 * Validaciones específicas para persona moral
 */
export const validatePersonaMoral = [
  body('formulario.correo_empresa')
    .isEmail()
    .withMessage('Correo de empresa inválido')
    .normalizeEmail()
    .toLowerCase(),
  
  body('formulario.fecha_constitucion')
    .notEmpty()
    .withMessage('Fecha de constitución es requerida')
    .matches(/^\d{2}\/\d{2}\/\d{4}$/)
    .withMessage('Fecha de constitución debe tener formato DD/MM/AAAA')
    .custom((value) => {
      const [day, month, year] = value.split('/').map(Number);
      const date = new Date(year, month - 1, day);
      const now = new Date();
      
      if (date > now) {
        throw new Error('Fecha de constitución no puede ser futura');
      }
      
      if (year < 1900) {
        throw new Error('Fecha de constitución no puede ser anterior a 1900');
      }
      
      return true;
    }),
  
  body('formulario.numero_escritura')
    .notEmpty()
    .withMessage('Número de escritura es requerido')
    .trim()
    .toUpperCase(),
  
  body('formulario.representante_legal')
    .notEmpty()
    .withMessage('Representante legal es requerido')
    .isLength({ min: 2, max: 100 })
    .withMessage('Representante legal debe tener entre 2 y 100 caracteres')
    .trim()
    .toUpperCase(),
  
  handleValidationErrors
];

/**
 * Validaciones para proveedores
 */
export const validateProveedores = [
  body('formulario.proveedores')
    .isArray({ min: 3, max: 3 })
    .withMessage('Debe proporcionar exactamente 3 proveedores'),
  
  body('formulario.proveedores.*.nombre')
    .notEmpty()
    .withMessage('Nombre del proveedor es requerido')
    .isLength({ min: 2, max: 100 })
    .withMessage('Nombre del proveedor debe tener entre 2 y 100 caracteres')
    .trim()
    .toUpperCase(),
  
  body('formulario.proveedores.*.domicilio')
    .notEmpty()
    .withMessage('Domicilio del proveedor es requerido')
    .isLength({ min: 5, max: 200 })
    .withMessage('Domicilio del proveedor debe tener entre 5 y 200 caracteres')
    .trim()
    .toUpperCase(),
  
  body('formulario.proveedores.*.telefono')
    .notEmpty()
    .withMessage('Teléfono del proveedor es requerido')
    .matches(/^[\d\s\-\(\)\+]+$/)
    .withMessage('Teléfono del proveedor debe contener solo números, espacios, guiones, paréntesis o símbolo +'),
  
  handleValidationErrors
];

/**
 * Validaciones para datos bancarios
 */
export const validateDatosBancarios = [
  body('formulario.datos_bancarios.nombre')
    .notEmpty()
    .withMessage('Nombre del banco es requerido')
    .isLength({ min: 2, max: 100 })
    .withMessage('Nombre del banco debe tener entre 2 y 100 caracteres')
    .trim()
    .toUpperCase(),
  
  body('formulario.datos_bancarios.tipo_cuenta')
    .isIn(['Cheques', 'Débito', 'Crédito'])
    .withMessage('Tipo de cuenta debe ser Cheques, Débito o Crédito'),
  
  body('formulario.datos_bancarios.telefono')
    .notEmpty()
    .withMessage('Teléfono del banco es requerido')
    .matches(/^[\d\s\-\(\)\+]+$/)
    .withMessage('Teléfono del banco debe contener solo números, espacios, guiones, paréntesis o símbolo +'),
  
  handleValidationErrors
];

/**
 * Validaciones para parámetros de consulta
 */
export const validatePaginationQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página debe ser un número entero positivo')
    .toInt(),
  
  query('per_page')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Elementos por página debe ser un número entre 1 y 100')
    .toInt(),
  
  handleValidationErrors
];

/**
 * Validaciones para búsqueda
 */
export const validateSearchQuery = [
  query('search')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Término de búsqueda debe tener entre 1 y 100 caracteres')
    .trim(),
  
  query('filter')
    .optional()
    .isIn(['PENDIENTE', 'PROCESADA', 'RECHAZADA', 'FISICA', 'MORAL'])
    .withMessage('Filtro inválido'),
  
  handleValidationErrors
];

/**
 * Validaciones para parámetros de ID
 */
export const validateIdParam = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID debe ser un número entero positivo')
    .toInt(),
  
  handleValidationErrors
];

/**
 * Validaciones para cambio de estado de solicitud
 */
export const validateEstadoUpdate = [
  body('estado')
    .isIn(['PENDIENTE', 'PROCESADA', 'RECHAZADA'])
    .withMessage('Estado debe ser PENDIENTE, PROCESADA o RECHAZADA'),
  
  body('comentarios')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Comentarios no pueden exceder 500 caracteres')
    .trim(),
  
  handleValidationErrors
];

/**
 * Validaciones para archivos
 */
export const validateFileUpload = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const files = req.files as Express.Multer.File[];
  
  if (!files || files.length === 0) {
    res.status(400).json({
      success: false,
      message: 'Al menos un archivo es requerido',
      error: 'NO_FILES_UPLOADED'
    } as ApiResponse);
    return;
  }

  // Validar tipos de archivo permitidos
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  const invalidFiles = files.filter(file => !allowedTypes.includes(file.mimetype));
  
  if (invalidFiles.length > 0) {
    res.status(400).json({
      success: false,
      message: 'Tipos de archivo no permitidos encontrados',
      error: 'INVALID_FILE_TYPE',
      data: {
        invalidFiles: invalidFiles.map(f => f.originalname),
        allowedTypes
      }
    } as ApiResponse);
    return;
  }

  // Validar tamaño de archivos (10MB máximo por archivo)
  const maxSize = 10 * 1024 * 1024; // 10MB
  const oversizedFiles = files.filter(file => file.size > maxSize);
  
  if (oversizedFiles.length > 0) {
    res.status(400).json({
      success: false,
      message: 'Archivos exceden el tamaño máximo permitido (10MB)',
      error: 'FILE_TOO_LARGE',
      data: {
        oversizedFiles: oversizedFiles.map(f => ({
          name: f.originalname,
          size: f.size,
          maxSize
        }))
      }
    } as ApiResponse);
    return;
  }

  next();
};

/**
 * Validación para creación de usuario administrador
 */
export const validateCreateUser = [
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail()
    .toLowerCase(),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Contraseña debe contener al menos una letra minúscula, una mayúscula y un número'),
  
  body('name')
    .notEmpty()
    .withMessage('Nombre es requerido')
    .isLength({ min: 2, max: 100 })
    .withMessage('Nombre debe tener entre 2 y 100 caracteres')
    .trim(),
  
  body('role')
    .optional()
    .isIn(['admin', 'client'])
    .withMessage('Rol debe ser admin o client'),
  
  handleValidationErrors
];

/**
 * Función helper para crear validaciones condicionales
 */
export const conditionalValidation = (
  condition: (req: Request) => boolean,
  validations: ValidationChain[]
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (condition(req)) {
      Promise.all(validations.map(validation => validation.run(req)))
        .then(() => handleValidationErrors(req, res, next))
        .catch(next);
    } else {
      next();
    }
  };
};

/**
 * Sanitización de strings para entrada de usuario
 */
export const sanitizeString = (str: string): string => {
  return str
    .trim()
    .replace(/\s+/g, ' ') // Múltiples espacios a uno solo
    .substring(0, 1000); // Limitar longitud máxima
};

/**
 * Validación de fecha en formato DD/MM/AAAA
 */
export const isValidDate = (dateString: string): boolean => {
  const regex = /^\d{2}\/\d{2}\/\d{4}$/;
  if (!regex.test(dateString)) return false;
  
  const [day, month, year] = dateString.split('/').map(Number);
  const date = new Date(year, month - 1, day);
  
  return date.getDate() === day &&
         date.getMonth() === month - 1 &&
         date.getFullYear() === year &&
         year >= 1900 &&
         date <= new Date();
};
