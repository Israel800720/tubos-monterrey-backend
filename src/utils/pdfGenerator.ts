import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import { Cliente, FormularioData, FormularioPersonaFisica, FormularioPersonaMoral } from '@/types';
import config from '@/config';

export interface PDFGenerationOptions {
  includeArchivos: boolean;
  includeWatermark: boolean;
  logoUrl?: string;
}

export class PDFGenerator {
  private static readonly PAGE_MARGIN = 50;
  private static readonly LINE_HEIGHT = 20;
  private static readonly SECTION_SPACING = 30;

  /**
   * Genera PDF de solicitud de crédito
   */
  static async generateSolicitudPDF(data: {
    folio: string;
    cliente: Cliente;
    formulario: FormularioData;
    tipoPersona: 'FISICA' | 'MORAL';
    archivos: string[];
    fechaCreacion: Date;
  }): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    
    // Configurar metadatos
    pdfDoc.setTitle(`Solicitud de Crédito - ${data.folio}`);
    pdfDoc.setSubject('Solicitud de Línea de Crédito');
    pdfDoc.setAuthor(config.email.company_name);
    pdfDoc.setCreator('Sistema de Solicitudes TUBOS MONTERREY');
    pdfDoc.setProducer('PDF-lib');
    pdfDoc.setCreationDate(data.fechaCreacion);

    // Cargar fuentes
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let currentPage = pdfDoc.addPage();
    let yPosition = currentPage.getHeight() - this.PAGE_MARGIN;

    // Generar contenido
    yPosition = await this.addHeader(currentPage, fontBold, fontRegular, data, yPosition);
    yPosition = await this.addClienteInfo(currentPage, fontBold, fontRegular, data.cliente, yPosition);
    
    if (data.tipoPersona === 'FISICA') {
      yPosition = await this.addPersonaFisicaForm(
        pdfDoc, 
        currentPage, 
        fontBold, 
        fontRegular, 
        data.formulario as FormularioPersonaFisica, 
        yPosition
      );
    } else {
      yPosition = await this.addPersonaMoralForm(
        pdfDoc,
        currentPage,
        fontBold,
        fontRegular,
        data.formulario as FormularioPersonaMoral,
        yPosition
      );
    }

    // Agregar lista de archivos
    yPosition = await this.addArchivos(pdfDoc, currentPage, fontBold, fontRegular, data.archivos, yPosition);

    // Agregar footer
    await this.addFooter(currentPage, fontRegular, data.fechaCreacion);

    return pdfDoc.save();
  }

  /**
   * Agregar encabezado del documento
   */
  private static async addHeader(
    page: PDFPage,
    fontBold: PDFFont,
    fontRegular: PDFFont,
    data: any,
    yPosition: number
  ): Promise<number> {
    const pageWidth = page.getWidth();
    
    // Título principal
    page.drawText(config.email.company_name, {
      x: this.PAGE_MARGIN,
      y: yPosition,
      size: 16,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.6)
    });
    yPosition -= 25;

    page.drawText('SOLICITUD DE LÍNEA DE CRÉDITO', {
      x: this.PAGE_MARGIN,
      y: yPosition,
      size: 14,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2)
    });
    yPosition -= this.LINE_HEIGHT;

    // Información del folio y fecha
    const tipoPersonaText = data.tipoPersona === 'FISICA' ? 'PERSONA FÍSICA' : 'PERSONA MORAL';
    
    page.drawText(`Folio: ${data.folio}`, {
      x: this.PAGE_MARGIN,
      y: yPosition,
      size: 12,
      font: fontBold
    });

    page.drawText(`Tipo: ${tipoPersonaText}`, {
      x: pageWidth - 200,
      y: yPosition,
      size: 12,
      font: fontBold
    });
    yPosition -= this.LINE_HEIGHT;

    page.drawText(`Fecha: ${data.fechaCreacion.toLocaleDateString('es-MX')}`, {
      x: this.PAGE_MARGIN,
      y: yPosition,
      size: 10,
      font: fontRegular
    });

    page.drawText(`Hora: ${data.fechaCreacion.toLocaleTimeString('es-MX')}`, {
      x: pageWidth - 200,
      y: yPosition,
      size: 10,
      font: fontRegular
    });
    yPosition -= this.SECTION_SPACING;

    // Línea separadora
    page.drawLine({
      start: { x: this.PAGE_MARGIN, y: yPosition },
      end: { x: pageWidth - this.PAGE_MARGIN, y: yPosition },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7)
    });
    yPosition -= 20;

    return yPosition;
  }

  /**
   * Agregar información del cliente
   */
  private static async addClienteInfo(
    page: PDFPage,
    fontBold: PDFFont,
    fontRegular: PDFFont,
    cliente: Cliente,
    yPosition: number
  ): Promise<number> {
    // Título de sección
    page.drawText('INFORMACIÓN DEL CLIENTE', {
      x: this.PAGE_MARGIN,
      y: yPosition,
      size: 12,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.6)
    });
    yPosition -= 25;

    // Datos del cliente
    const clienteData = [
      { label: 'Código SN:', value: cliente.codigo_sn },
      { label: 'Nombre/Razón Social:', value: cliente.nombre_sn },
      { label: 'RFC:', value: cliente.rfc },
      { label: 'Condiciones de Pago:', value: cliente.codigo_condiciones_pago },
      { label: 'Grupo:', value: cliente.codigo_grupo }
    ];

    for (const item of clienteData) {
      page.drawText(item.label, {
        x: this.PAGE_MARGIN,
        y: yPosition,
        size: 10,
        font: fontBold
      });

      page.drawText(item.value, {
        x: this.PAGE_MARGIN + 150,
        y: yPosition,
        size: 10,
        font: fontRegular
      });
      yPosition -= this.LINE_HEIGHT;
    }

    return yPosition - 10;
  }

  /**
   * Agregar formulario de persona física
   */
  private static async addPersonaFisicaForm(
    pdfDoc: PDFDocument,
    currentPage: PDFPage,
    fontBold: PDFFont,
    fontRegular: PDFFont,
    formulario: FormularioPersonaFisica,
    yPosition: number
  ): Promise<number> {
    // Verificar si necesitamos nueva página
    if (yPosition < 200) {
      currentPage = pdfDoc.addPage();
      yPosition = currentPage.getHeight() - this.PAGE_MARGIN;
    }

    // Datos básicos
    yPosition = await this.addSection(currentPage, fontBold, fontRegular, 'DATOS BÁSICOS', [
      { label: 'ID CIF:', value: formulario.id_cif },
      { label: 'Línea de Crédito Solicitada:', value: formulario.linea_credito_solicitada },
      { label: 'Agente de Ventas:', value: formulario.agente_ventas || 'No especificado' },
      { label: 'Nombre del Titular:', value: formulario.nombre_titular },
      { label: 'Teléfono Fijo:', value: formulario.telefono_fijo },
      { label: 'Celular:', value: formulario.celular },
      { label: 'Correo Electrónico:', value: formulario.correo_electronico },
      { label: 'Tipo de Domicilio:', value: formulario.tipo_domicilio }
    ], yPosition);

    // Datos del negocio
    yPosition = await this.addSection(currentPage, fontBold, fontRegular, 'DATOS DEL NEGOCIO', [
      { label: 'Calle y Número:', value: formulario.calle_numero_negocio },
      { label: 'Teléfono del Negocio:', value: formulario.telefono_negocio },
      { label: 'Colonia y Estado:', value: formulario.colonia_estado_negocio },
      { label: 'Código Postal:', value: formulario.codigo_postal_negocio },
      { label: 'Correo del Negocio:', value: formulario.correo_negocio },
      { label: 'Tipo de Domicilio Negocio:', value: formulario.tipo_domicilio_negocio },
      { label: 'Giro y Actividades:', value: formulario.giro_actividades }
    ], yPosition);

    // Proveedores
    yPosition = await this.addProveedores(currentPage, fontBold, fontRegular, formulario.proveedores, yPosition);

    // Datos bancarios
    yPosition = await this.addDatosBancarios(currentPage, fontBold, fontRegular, formulario.datos_bancarios, yPosition);

    return yPosition;
  }

  /**
   * Agregar formulario de persona moral
   */
  private static async addPersonaMoralForm(
    pdfDoc: PDFDocument,
    currentPage: PDFPage,
    fontBold: PDFFont,
    fontRegular: PDFFont,
    formulario: FormularioPersonaMoral,
    yPosition: number
  ): Promise<number> {
    // Verificar si necesitamos nueva página
    if (yPosition < 200) {
      currentPage = pdfDoc.addPage();
      yPosition = currentPage.getHeight() - this.PAGE_MARGIN;
    }

    // Datos básicos
    yPosition = await this.addSection(currentPage, fontBold, fontRegular, 'DATOS BÁSICOS', [
      { label: 'ID CIF:', value: formulario.id_cif },
      { label: 'Línea de Crédito Solicitada:', value: formulario.linea_credito_solicitada },
      { label: 'Agente de Ventas:', value: formulario.agente_ventas || 'No especificado' },
      { label: 'Correo de la Empresa:', value: formulario.correo_empresa },
      { label: 'Tipo de Domicilio Empresa:', value: formulario.tipo_domicilio_empresa }
    ], yPosition);

    // Datos constitutivos
    yPosition = await this.addSection(currentPage, fontBold, fontRegular, 'DATOS CONSTITUTIVOS', [
      { label: 'Fecha de Constitución:', value: formulario.fecha_constitucion },
      { label: 'Número de Escritura:', value: formulario.numero_escritura },
      { label: 'Folio de Registro:', value: formulario.folio_registro },
      { label: 'Fecha de Registro:', value: formulario.fecha_registro },
      { label: 'Capital Inicial:', value: formulario.capital_inicial },
      { label: 'Capital Actual:', value: formulario.capital_actual },
      { label: 'Fecha Último Aumento:', value: formulario.fecha_ultimo_aumento }
    ], yPosition);

    // Datos del local
    yPosition = await this.addSection(currentPage, fontBold, fontRegular, 'DATOS DEL LOCAL', [
      { label: 'Calle y Número:', value: formulario.calle_numero_local },
      { label: 'Teléfono del Local:', value: formulario.telefono_local },
      { label: 'Colonia y Estado:', value: formulario.colonia_estado_local },
      { label: 'Código Postal:', value: formulario.codigo_postal_local },
      { label: 'Correo del Local:', value: formulario.correo_local },
      { label: 'Tipo de Domicilio Local:', value: formulario.tipo_domicilio_local }
    ], yPosition);

    // Accionistas
    yPosition = await this.addAccionistas(currentPage, fontBold, fontRegular, formulario.accionistas, yPosition);

    // Representantes
    yPosition = await this.addSection(currentPage, fontBold, fontRegular, 'REPRESENTANTES', [
      { label: 'Representante Legal:', value: formulario.representante_legal },
      { label: 'Administrador:', value: formulario.administrador },
      { label: 'Persona con Poder de Dominio:', value: formulario.persona_poder_dominio },
      { label: 'Puesto/Cargo:', value: formulario.puesto_poder }
    ], yPosition);

    // Actividades
    yPosition = await this.addSection(currentPage, fontBold, fontRegular, 'ACTIVIDADES', [
      { label: 'Giro y Actividades:', value: formulario.giro_actividades }
    ], yPosition);

    // Proveedores
    yPosition = await this.addProveedores(currentPage, fontBold, fontRegular, formulario.proveedores, yPosition);

    // Datos bancarios
    yPosition = await this.addDatosBancarios(currentPage, fontBold, fontRegular, formulario.datos_bancarios, yPosition);

    return yPosition;
  }

  /**
   * Agregar una sección genérica
   */
  private static async addSection(
    page: PDFPage,
    fontBold: PDFFont,
    fontRegular: PDFFont,
    title: string,
    data: { label: string; value: string }[],
    yPosition: number
  ): Promise<number> {
    // Título de sección
    page.drawText(title, {
      x: this.PAGE_MARGIN,
      y: yPosition,
      size: 12,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.6)
    });
    yPosition -= 25;

    // Datos
    for (const item of data) {
      page.drawText(item.label, {
        x: this.PAGE_MARGIN,
        y: yPosition,
        size: 10,
        font: fontBold
      });

      // Dividir texto largo en múltiples líneas
      const value = item.value || 'No especificado';
      const maxWidth = 400;
      const words = value.split(' ');
      let line = '';
      let lineY = yPosition;

      for (const word of words) {
        const testLine = line + (line ? ' ' : '') + word;
        const textWidth = fontRegular.widthOfTextAtSize(testLine, 10);
        
        if (textWidth > maxWidth && line) {
          page.drawText(line, {
            x: this.PAGE_MARGIN + 180,
            y: lineY,
            size: 10,
            font: fontRegular
          });
          line = word;
          lineY -= this.LINE_HEIGHT;
        } else {
          line = testLine;
        }
      }

      if (line) {
        page.drawText(line, {
          x: this.PAGE_MARGIN + 180,
          y: lineY,
          size: 10,
          font: fontRegular
        });
      }

      yPosition = lineY - this.LINE_HEIGHT;
    }

    return yPosition - 10;
  }

  /**
   * Agregar información de proveedores
   */
  private static async addProveedores(
    page: PDFPage,
    fontBold: PDFFont,
    fontRegular: PDFFont,
    proveedores: any[],
    yPosition: number
  ): Promise<number> {
    page.drawText('PROVEEDORES PRINCIPALES', {
      x: this.PAGE_MARGIN,
      y: yPosition,
      size: 12,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.6)
    });
    yPosition -= 25;

    proveedores.forEach((proveedor, index) => {
      page.drawText(`${index + 1}. ${proveedor.nombre}`, {
        x: this.PAGE_MARGIN,
        y: yPosition,
        size: 10,
        font: fontBold
      });
      yPosition -= this.LINE_HEIGHT;

      const proveedorData = [
        { label: '   Domicilio:', value: proveedor.domicilio },
        { label: '   Promedio de Compra:', value: proveedor.promedio_compra },
        { label: '   Línea de Crédito:', value: proveedor.linea_credito },
        { label: '   Teléfono:', value: proveedor.telefono }
      ];

      for (const item of proveedorData) {
        page.drawText(item.label, {
          x: this.PAGE_MARGIN,
          y: yPosition,
          size: 9,
          font: fontRegular
        });

        page.drawText(item.value || 'No especificado', {
          x: this.PAGE_MARGIN + 140,
          y: yPosition,
          size: 9,
          font: fontRegular
        });
        yPosition -= 15;
      }
      yPosition -= 10;
    });

    return yPosition;
  }

  /**
   * Agregar información de accionistas
   */
  private static async addAccionistas(
    page: PDFPage,
    fontBold: PDFFont,
    fontRegular: PDFFont,
    accionistas: any[],
    yPosition: number
  ): Promise<number> {
    page.drawText('ACCIONISTAS', {
      x: this.PAGE_MARGIN,
      y: yPosition,
      size: 12,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.6)
    });
    yPosition -= 25;

    accionistas.forEach((accionista, index) => {
      const titulo = index === 0 ? 'Accionista Mayoritario' : 'Segundo Mayor Accionista';
      
      page.drawText(`${titulo}: ${accionista.nombre}`, {
        x: this.PAGE_MARGIN,
        y: yPosition,
        size: 10,
        font: fontBold
      });
      yPosition -= this.LINE_HEIGHT;

      const accionistaData = [
        { label: '   Edad:', value: accionista.edad },
        { label: '   Número de Acciones:', value: accionista.numero_acciones },
        { label: '   Teléfono:', value: accionista.telefono },
        { label: '   Domicilio:', value: accionista.domicilio },
        { label: '   Tipo de Domicilio:', value: accionista.tipo_domicilio }
      ];

      for (const item of accionistaData) {
        page.drawText(item.label, {
          x: this.PAGE_MARGIN,
          y: yPosition,
          size: 9,
          font: fontRegular
        });

        page.drawText(item.value || 'No especificado', {
          x: this.PAGE_MARGIN + 140,
          y: yPosition,
          size: 9,
          font: fontRegular
        });
        yPosition -= 15;
      }
      yPosition -= 10;
    });

    return yPosition;
  }

  /**
   * Agregar datos bancarios
   */
  private static async addDatosBancarios(
    page: PDFPage,
    fontBold: PDFFont,
    fontRegular: PDFFont,
    datosBancarios: any,
    yPosition: number
  ): Promise<number> {
    return await this.addSection(page, fontBold, fontRegular, 'DATOS BANCARIOS', [
      { label: 'Banco:', value: datosBancarios.nombre },
      { label: 'Número de Sucursal:', value: datosBancarios.numero_sucursal },
      { label: 'Teléfono del Banco:', value: datosBancarios.telefono },
      { label: 'Tipo de Cuenta:', value: datosBancarios.tipo_cuenta },
      { label: 'Monto de Cuenta/Crédito:', value: datosBancarios.monto }
    ], yPosition);
  }

  /**
   * Agregar lista de archivos
   */
  private static async addArchivos(
    pdfDoc: PDFDocument,
    currentPage: PDFPage,
    fontBold: PDFFont,
    fontRegular: PDFFont,
    archivos: string[],
    yPosition: number
  ): Promise<number> {
    // Verificar si necesitamos nueva página
    if (yPosition < 150) {
      currentPage = pdfDoc.addPage();
      yPosition = currentPage.getHeight() - this.PAGE_MARGIN;
    }

    page.drawText('ARCHIVOS ADJUNTOS', {
      x: this.PAGE_MARGIN,
      y: yPosition,
      size: 12,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.6)
    });
    yPosition -= 25;

    if (archivos.length === 0) {
      currentPage.drawText('No se adjuntaron archivos', {
        x: this.PAGE_MARGIN,
        y: yPosition,
        size: 10,
        font: fontRegular,
        color: rgb(0.5, 0.5, 0.5)
      });
      yPosition -= this.LINE_HEIGHT;
    } else {
      archivos.forEach((archivo, index) => {
        currentPage.drawText(`${index + 1}. ${archivo}`, {
          x: this.PAGE_MARGIN,
          y: yPosition,
          size: 10,
          font: fontRegular
        });
        yPosition -= this.LINE_HEIGHT;
      });
    }

    return yPosition - 20;
  }

  /**
   * Agregar footer del documento
   */
  private static async addFooter(
    page: PDFPage,
    fontRegular: PDFFont,
    fechaCreacion: Date
  ): Promise<void> {
    const pageWidth = page.getWidth();
    const footerY = 30;

    // Línea separadora
    page.drawLine({
      start: { x: this.PAGE_MARGIN, y: footerY + 20 },
      end: { x: pageWidth - this.PAGE_MARGIN, y: footerY + 20 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7)
    });

    // Texto del footer
    page.drawText(`Documento generado automáticamente por ${config.email.company_name}`, {
      x: this.PAGE_MARGIN,
      y: footerY,
      size: 8,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5)
    });

    page.drawText(`Fecha de generación: ${fechaCreacion.toLocaleString('es-MX')}`, {
      x: pageWidth - 200,
      y: footerY,
      size: 8,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5)
    });
  }

  /**
   * Genera un PDF de reporte de solicitudes
   */
  static async generateReportePDF(solicitudes: any[]): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let currentPage = pdfDoc.addPage();
    let yPosition = currentPage.getHeight() - this.PAGE_MARGIN;

    // Título
    currentPage.drawText('REPORTE DE SOLICITUDES DE CRÉDITO', {
      x: this.PAGE_MARGIN,
      y: yPosition,
      size: 16,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.6)
    });
    yPosition -= 30;

    currentPage.drawText(`Generado el: ${new Date().toLocaleString('es-MX')}`, {
      x: this.PAGE_MARGIN,
      y: yPosition,
      size: 12,
      font: fontRegular
    });
    yPosition -= 40;

    // Lista de solicitudes
    solicitudes.forEach((solicitud, index) => {
      if (yPosition < 100) {
        currentPage = pdfDoc.addPage();
        yPosition = currentPage.getHeight() - this.PAGE_MARGIN;
      }

      currentPage.drawText(`${index + 1}. Folio: ${solicitud.folio}`, {
        x: this.PAGE_MARGIN,
        y: yPosition,
        size: 12,
        font: fontBold
      });
      yPosition -= 20;

      const solicitudData = [
        `Cliente: ${solicitud.cliente?.nombre_sn || 'N/A'}`,
        `RFC: ${solicitud.cliente?.rfc || 'N/A'}`,
        `Tipo: ${solicitud.tipo_persona}`,
        `Estado: ${solicitud.estado}`,
        `Fecha: ${new Date(solicitud.created_at).toLocaleDateString('es-MX')}`
      ];

      solicitudData.forEach(item => {
        currentPage.drawText(item, {
          x: this.PAGE_MARGIN + 20,
          y: yPosition,
          size: 10,
          font: fontRegular
        });
        yPosition -= 15;
      });

      yPosition -= 10;
    });

    return pdfDoc.save();
  }
}

export default PDFGenerator;
