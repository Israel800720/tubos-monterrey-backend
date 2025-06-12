/**
 * Utilidades para validación y análisis de RFC mexicano
 * TUBOS MONTERREY S.A. DE C.V.
 */

export interface RFCAnalysis {
  isValid: boolean;
  tipoPersona: 'FISICA' | 'MORAL' | null;
  length: number;
  format: string;
  errors: string[];
}

export class RFCValidator {
  // Expresiones regulares para validación
  private static readonly RFC_FISICA_REGEX = /^[A-Z&Ñ]{4}[0-9]{6}[A-Z0-9]{3}$/;
  private static readonly RFC_MORAL_REGEX = /^[A-Z&Ñ]{3}[0-9]{6}[A-Z0-9]{3}$/;
  
  // Caracteres válidos
  private static readonly VALID_CHARS = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ0123456789&';
  
  // Palabras prohibidas en RFC
  private static readonly FORBIDDEN_WORDS = [
    'BUEI', 'BUEY', 'CACA', 'CACO', 'CAGA', 'CAGO', 'CAKA', 'CAKO',
    'COGE', 'COGI', 'COJA', 'COJE', 'COJI', 'COJO', 'COLA', 'CULO',
    'FALO', 'FETO', 'GETA', 'GUEY', 'JETA', 'JOTO', 'KACA', 'KACO',
    'KAGA', 'KAGO', 'KAKA', 'KAKO', 'KOGE', 'KOGI', 'KOJA', 'KOJE',
    'KOJI', 'KOJO', 'KOLA', 'KULO', 'LILO', 'LOCA', 'LOCO', 'LOKA',
    'LOKO', 'MAME', 'MAMO', 'MEAR', 'MEAS', 'MEON', 'MIAR', 'MION',
    'MOCO', 'MOKO', 'MULA', 'MULO', 'NACA', 'NACO', 'PEDA', 'PEDO',
    'PENE', 'PIPI', 'PITO', 'POPO', 'PUTA', 'PUTO', 'QULO', 'RATA',
    'ROBA', 'ROBE', 'ROBO', 'RUIN', 'SENO', 'TETA', 'VACA', 'VAGA',
    'VAGO', 'VAKA', 'VUEI', 'VUEY', 'WUEI', 'WUEY'
  ];

  /**
   * Valida un RFC completo
   */
  static validate(rfc: string): RFCAnalysis {
    const result: RFCAnalysis = {
      isValid: false,
      tipoPersona: null,
      length: 0,
      format: '',
      errors: []
    };

    // Verificaciones básicas
    if (!rfc) {
      result.errors.push('RFC es requerido');
      return result;
    }

    // Limpiar y normalizar
    const cleanRFC = rfc.trim().toUpperCase().replace(/\s+/g, '');
    result.length = cleanRFC.length;
    result.format = cleanRFC;

    // Verificar longitud
    if (cleanRFC.length !== 12 && cleanRFC.length !== 13) {
      result.errors.push('RFC debe tener 12 caracteres (Persona Moral) o 13 caracteres (Persona Física)');
      return result;
    }

    // Determinar tipo de persona
    if (cleanRFC.length === 13) {
      result.tipoPersona = 'FISICA';
      return this.validatePersonaFisica(cleanRFC, result);
    } else {
      result.tipoPersona = 'MORAL';
      return this.validatePersonaMoral(cleanRFC, result);
    }
  }

  /**
   * Valida RFC de Persona Física (13 caracteres)
   */
  private static validatePersonaFisica(rfc: string, result: RFCAnalysis): RFCAnalysis {
    // Verificar formato general
    if (!this.RFC_FISICA_REGEX.test(rfc)) {
      result.errors.push('Formato de RFC de Persona Física inválido');
      return result;
    }

    // Extraer componentes
    const apellidoPaterno = rfc.substring(0, 2);
    const apellidoMaterno = rfc.substring(2, 3);
    const nombre = rfc.substring(3, 4);
    const fechaNacimiento = rfc.substring(4, 10);
    const homoclave = rfc.substring(10, 13);

    // Validar componentes
    this.validateLetters(apellidoPaterno, 'Apellido paterno', result);
    this.validateLetters(apellidoMaterno, 'Apellido materno', result);
    this.validateLetters(nombre, 'Nombre', result);
    this.validateFechaNacimiento(fechaNacimiento, result);
    this.validateHomoclave(homoclave, result);

    // Verificar palabras prohibidas
    const iniciales = rfc.substring(0, 4);
    if (this.FORBIDDEN_WORDS.includes(iniciales)) {
      result.errors.push(`Las iniciales "${iniciales}" no están permitidas en RFC`);
    }

    // Verificar caracteres válidos
    this.validateCharacters(rfc, result);

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Valida RFC de Persona Moral (12 caracteres)
   */
  private static validatePersonaMoral(rfc: string, result: RFCAnalysis): RFCAnalysis {
    // Verificar formato general
    if (!this.RFC_MORAL_REGEX.test(rfc)) {
      result.errors.push('Formato de RFC de Persona Moral inválido');
      return result;
    }

    // Extraer componentes
    const razonSocial = rfc.substring(0, 3);
    const fechaConstitucion = rfc.substring(3, 9);
    const homoclave = rfc.substring(9, 12);

    // Validar componentes
    this.validateLetters(razonSocial, 'Razón social', result);
    this.validateFechaConstitucion(fechaConstitucion, result);
    this.validateHomoclave(homoclave, result);

    // Verificar palabras prohibidas
    if (this.FORBIDDEN_WORDS.includes(razonSocial)) {
      result.errors.push(`Las iniciales "${razonSocial}" no están permitidas en RFC`);
    }

    // Verificar caracteres válidos
    this.validateCharacters(rfc, result);

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Valida que una cadena contenga solo letras válidas
   */
  private static validateLetters(text: string, fieldName: string, result: RFCAnalysis): void {
    if (!/^[A-Z&Ñ]+$/.test(text)) {
      result.errors.push(`${fieldName} debe contener solo letras válidas (A-Z, Ñ, &)`);
    }
  }

  /**
   * Valida fecha de nacimiento (AAMMDD)
   */
  private static validateFechaNacimiento(fecha: string, result: RFCAnalysis): void {
    if (!/^\d{6}$/.test(fecha)) {
      result.errors.push('Fecha de nacimiento debe tener formato AAMMDD');
      return;
    }

    const año = parseInt(fecha.substring(0, 2), 10);
    const mes = parseInt(fecha.substring(2, 4), 10);
    const dia = parseInt(fecha.substring(4, 6), 10);

    // Validar mes
    if (mes < 1 || mes > 12) {
      result.errors.push('Mes de nacimiento inválido (01-12)');
    }

    // Validar día
    if (dia < 1 || dia > 31) {
      result.errors.push('Día de nacimiento inválido (01-31)');
    }

    // Validar año (considerando que puede ser 1900s o 2000s)
    const currentYear = new Date().getFullYear() % 100;
    if (año > currentYear + 10) {
      result.errors.push('Año de nacimiento parece inválido');
    }
  }

  /**
   * Valida fecha de constitución (AAMMDD)
   */
  private static validateFechaConstitucion(fecha: string, result: RFCAnalysis): void {
    if (!/^\d{6}$/.test(fecha)) {
      result.errors.push('Fecha de constitución debe tener formato AAMMDD');
      return;
    }

    const año = parseInt(fecha.substring(0, 2), 10);
    const mes = parseInt(fecha.substring(2, 4), 10);
    const dia = parseInt(fecha.substring(4, 6), 10);

    // Validar mes
    if (mes < 1 || mes > 12) {
      result.errors.push('Mes de constitución inválido (01-12)');
    }

    // Validar día
    if (dia < 1 || dia > 31) {
      result.errors.push('Día de constitución inválido (01-31)');
    }
  }

  /**
   * Valida homoclave (3 caracteres alfanuméricos)
   */
  private static validateHomoclave(homoclave: string, result: RFCAnalysis): void {
    if (!/^[A-Z0-9]{3}$/.test(homoclave)) {
      result.errors.push('Homoclave debe tener 3 caracteres alfanuméricos');
    }
  }

  /**
   * Valida que todos los caracteres sean válidos
   */
  private static validateCharacters(rfc: string, result: RFCAnalysis): void {
    for (let i = 0; i < rfc.length; i++) {
      if (!this.VALID_CHARS.includes(rfc[i])) {
        result.errors.push(`Carácter inválido encontrado: "${rfc[i]}" en posición ${i + 1}`);
      }
    }
  }

  /**
   * Determina el tipo de persona basado en la longitud del RFC
   */
  static getTipoPersona(rfc: string): 'FISICA' | 'MORAL' | null {
    if (!rfc) return null;
    
    const cleanRFC = rfc.trim().toUpperCase().replace(/\s+/g, '');
    
    if (cleanRFC.length === 13) {
      return 'FISICA';
    } else if (cleanRFC.length === 12) {
      return 'MORAL';
    }
    
    return null;
  }

  /**
   * Limpia y normaliza un RFC
   */
  static normalize(rfc: string): string {
    if (!rfc) return '';
    return rfc.trim().toUpperCase().replace(/\s+/g, '');
  }

  /**
   * Verifica si un RFC es válido de forma rápida
   */
  static isValid(rfc: string): boolean {
    const analysis = this.validate(rfc);
    return analysis.isValid;
  }

  /**
   * Extrae información detallada de un RFC válido
   */
  static extractInfo(rfc: string): {
    tipoPersona: 'FISICA' | 'MORAL' | null;
    iniciales?: string;
    fecha?: string;
    homoclave?: string;
    isValid: boolean;
  } | null {
    const cleanRFC = this.normalize(rfc);
    const analysis = this.validate(cleanRFC);
    
    if (!analysis.isValid) {
      return null;
    }

    if (analysis.tipoPersona === 'FISICA') {
      return {
        tipoPersona: 'FISICA',
        iniciales: cleanRFC.substring(0, 4),
        fecha: cleanRFC.substring(4, 10),
        homoclave: cleanRFC.substring(10, 13),
        isValid: true
      };
    } else if (analysis.tipoPersona === 'MORAL') {
      return {
        tipoPersona: 'MORAL',
        iniciales: cleanRFC.substring(0, 3),
        fecha: cleanRFC.substring(3, 9),
        homoclave: cleanRFC.substring(9, 12),
        isValid: true
      };
    }

    return null;
  }

  /**
   * Genera un RFC de ejemplo para testing
   */
  static generateExample(tipoPersona: 'FISICA' | 'MORAL'): string {
    const currentYear = new Date().getFullYear() % 100;
    const year = String(currentYear - 25).padStart(2, '0');
    const month = '06';
    const day = '15';
    const homoclave = 'ABC';

    if (tipoPersona === 'FISICA') {
      return `GOPE${year}${month}${day}${homoclave}`;
    } else {
      return `TUB${year}${month}${day}${homoclave}`;
    }
  }

  /**
   * Obtiene un mensaje de error amigable para mostrar al usuario
   */
  static getErrorMessage(rfc: string): string {
    const analysis = this.validate(rfc);
    
    if (analysis.isValid) {
      return '';
    }

    if (analysis.errors.length === 0) {
      return 'RFC inválido';
    }

    // Devolver el primer error más específico
    return analysis.errors[0];
  }
}

export default RFCValidator;
