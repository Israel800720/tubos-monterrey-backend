import { Resend } from 'resend';
import config from '@/config';
import { EmailNotificationData, Cliente, FormularioData } from '@/types';

// Inicializar Resend
const resend = new Resend(config.email.api_key);

export class EmailService {
  // Enviar notificación de nueva solicitud al administrador
  static async sendSolicitudNotification(data: {
    folio: string;
    cliente: Cliente;
    tipo_persona: 'FISICA' | 'MORAL';
    formulario: FormularioData;
    pdf_url: string;
    archivos_urls: string[];
  }): Promise<boolean> {
    try {
      const emailHtml = this.generateSolicitudEmailHTML(data);
      const emailText = this.generateSolicitudEmailText(data);

      const result = await resend.emails.send({
        from: config.email.from_email,
        to: [config.email.admin_email],
        subject: `Nueva Solicitud de Crédito - Folio: ${data.folio}`,
        html: emailHtml,
        text: emailText,
        attachments: []
      });

      if (result.error) {
        console.error('Error enviando email:', result.error);
        return false;
      }

      console.log('✅ Email enviado exitosamente:', result.data?.id);
      return true;
    } catch (error) {
      console.error('Error en sendSolicitudNotification:', error);
      return false;
    }
  }

  // Generar HTML del email de notificación
  private static generateSolicitudEmailHTML(data: {
    folio: string;
    cliente: Cliente;
    tipo_persona: 'FISICA' | 'MORAL';
    formulario: FormularioData;
    pdf_url: string;
    archivos_urls: string[];
  }): string {
    const tipoPersonaText = data.tipo_persona === 'FISICA' ? 'Persona Física' : 'Persona Moral';
    const fechaActual = new Date().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nueva Solicitud de Crédito</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #1e40af;
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            text-align: center;
        }
        .content {
            background-color: #f8fafc;
            padding: 30px;
            border: 1px solid #e2e8f0;
        }
        .footer {
            background-color: #64748b;
            color: white;
            padding: 15px;
            border-radius: 0 0 8px 8px;
            text-align: center;
            font-size: 14px;
        }
        .info-box {
            background-color: white;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            padding: 20px;
            margin: 15px 0;
        }
        .info-title {
            font-weight: bold;
            color: #1e40af;
            font-size: 16px;
            margin-bottom: 10px;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 5px;
        }
        .info-row {
            display: flex;
            margin: 8px 0;
        }
        .info-label {
            font-weight: bold;
            min-width: 200px;
            color: #374151;
        }
        .info-value {
            color: #6b7280;
        }
        .button {
            display: inline-block;
            background-color: #1e40af;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 10px 5px;
            font-weight: bold;
        }
        .button:hover {
            background-color: #1d4ed8;
        }
        .archivo-list {
            background-color: #f1f5f9;
            padding: 15px;
            border-radius: 6px;
            margin: 10px 0;
        }
        .archivo-item {
            margin: 5px 0;
            padding: 8px;
            background-color: white;
            border-radius: 4px;
            border-left: 4px solid #1e40af;
        }
        .highlight {
            background-color: #fef3c7;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid #f59e0b;
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏢 ${config.email.company_name}</h1>
        <h2>Nueva Solicitud de Crédito</h2>
        <p><strong>Folio: ${data.folio}</strong></p>
    </div>

    <div class="content">
        <div class="highlight">
            <strong>📅 Fecha de Solicitud:</strong> ${fechaActual}<br>
            <strong>👤 Tipo de Persona:</strong> ${tipoPersonaText}<br>
            <strong>📋 Estado:</strong> PENDIENTE DE REVISIÓN
        </div>

        <div class="info-box">
            <div class="info-title">📊 Información del Cliente</div>
            <div class="info-row">
                <span class="info-label">Código SN:</span>
                <span class="info-value">${data.cliente.codigo_sn}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Nombre/Razón Social:</span>
                <span class="info-value">${data.cliente.nombre_sn}</span>
            </div>
            <div class="info-row">
                <span class="info-label">RFC:</span>
                <span class="info-value">${data.cliente.rfc}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Condiciones de Pago:</span>
                <span class="info-value">${data.cliente.codigo_condiciones_pago}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Grupo:</span>
                <span class="info-value">${data.cliente.codigo_grupo}</span>
            </div>
        </div>

        <div class="info-box">
            <div class="info-title">💰 Información de la Solicitud</div>
            <div class="info-row">
                <span class="info-label">ID CIF:</span>
                <span class="info-value">${data.formulario.id_cif}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Línea de Crédito Solicitada:</span>
                <span class="info-value">${data.formulario.linea_credito_solicitada}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Agente de Ventas:</span>
                <span class="info-value">${data.formulario.agente_ventas || 'No especificado'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Giro/Actividades:</span>
                <span class="info-value">${data.formulario.giro_actividades}</span>
            </div>
        </div>

        <div class="info-box">
            <div class="info-title">📁 Archivos Adjuntos (${data.archivos_urls.length})</div>
            <div class="archivo-list">
                ${data.archivos_urls.map((url, index) => `
                    <div class="archivo-item">
                        📄 Archivo ${index + 1}: <a href="${url}" target="_blank">Ver documento</a>
                    </div>
                `).join('')}
            </div>
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <a href="${data.pdf_url}" class="button">📄 Descargar PDF Completo</a>
            <a href="mailto:${config.email.from_email}?subject=Re: Solicitud ${data.folio}" class="button">📧 Responder</a>
        </div>

        <div class="info-box">
            <div class="info-title">📋 Próximos Pasos</div>
            <ol>
                <li><strong>Revisar documentación:</strong> Verificar que todos los archivos estén completos y legibles</li>
                <li><strong>Validar información:</strong> Confirmar datos del cliente y formulario</li>
                <li><strong>Análisis crediticio:</strong> Evaluar la solicitud según políticas internas</li>
                <li><strong>Comunicar decisión:</strong> Contactar al cliente con la resolución</li>
            </ol>
        </div>
    </div>

    <div class="footer">
        <p>Este email fue generado automáticamente por el Sistema de Solicitudes de Crédito</p>
        <p>${config.email.company_name} | ${fechaActual}</p>
    </div>
</body>
</html>
    `;
  }

  // Generar texto plano del email
  private static generateSolicitudEmailText(data: {
    folio: string;
    cliente: Cliente;
    tipo_persona: 'FISICA' | 'MORAL';
    formulario: FormularioData;
    pdf_url: string;
    archivos_urls: string[];
  }): string {
    const tipoPersonaText = data.tipo_persona === 'FISICA' ? 'Persona Física' : 'Persona Moral';
    const fechaActual = new Date().toLocaleDateString('es-MX');

    return `
${config.email.company_name}
NUEVA SOLICITUD DE CRÉDITO

Folio: ${data.folio}
Fecha: ${fechaActual}
Tipo: ${tipoPersonaText}
Estado: PENDIENTE DE REVISIÓN

INFORMACIÓN DEL CLIENTE:
- Código SN: ${data.cliente.codigo_sn}
- Nombre/Razón Social: ${data.cliente.nombre_sn}
- RFC: ${data.cliente.rfc}
- Condiciones de Pago: ${data.cliente.codigo_condiciones_pago}
- Grupo: ${data.cliente.codigo_grupo}

INFORMACIÓN DE LA SOLICITUD:
- ID CIF: ${data.formulario.id_cif}
- Línea de Crédito Solicitada: ${data.formulario.linea_credito_solicitada}
- Agente de Ventas: ${data.formulario.agente_ventas || 'No especificado'}
- Giro/Actividades: ${data.formulario.giro_actividades}

ARCHIVOS ADJUNTOS (${data.archivos_urls.length}):
${data.archivos_urls.map((url, index) => `${index + 1}. ${url}`).join('\n')}

PDF COMPLETO: ${data.pdf_url}

PRÓXIMOS PASOS:
1. Revisar documentación completa
2. Validar información del cliente
3. Realizar análisis crediticio
4. Comunicar decisión final

Este email fue generado automáticamente por el Sistema de Solicitudes de Crédito.
    `;
  }

  // Enviar email de confirmación al cliente
  static async sendClientConfirmation(data: {
    clienteEmail: string;
    clienteNombre: string;
    folio: string;
    tipo_persona: 'FISICA' | 'MORAL';
  }): Promise<boolean> {
    try {
      const tipoPersonaText = data.tipo_persona === 'FISICA' ? 'Persona Física' : 'Persona Moral';
      
      const result = await resend.emails.send({
        from: config.email.from_email,
        to: [data.clienteEmail],
        subject: `Confirmación de Solicitud de Crédito - Folio: ${data.folio}`,
        html: `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmación de Solicitud</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background-color: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
        .footer { background-color: #64748b; color: white; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; }
        .success-box { background-color: #dcfce7; border: 1px solid #16a34a; border-radius: 6px; padding: 20px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>✅ Solicitud Recibida</h1>
        <h2>${config.email.company_name}</h2>
    </div>
    <div class="content">
        <p>Estimado(a) <strong>${data.clienteNombre}</strong>,</p>
        
        <div class="success-box">
            <p><strong>Su solicitud de crédito ha sido recibida exitosamente.</strong></p>
            <p><strong>Folio:</strong> ${data.folio}</p>
            <p><strong>Tipo:</strong> ${tipoPersonaText}</p>
            <p><strong>Estado:</strong> En revisión</p>
        </div>
        
        <p>Nuestro equipo revisará su solicitud y documentación en las próximas 48 horas hábiles.</p>
        
        <p><strong>Información de contacto:</strong></p>
        <ul>
            <li>📞 Teléfono: 55 5078 7700</li>
            <li>📱 WhatsApp: 55 4144 8919</li>
            <li>✉️ Email: tubosmty@tubosmonterrey.com.mx</li>
        </ul>
        
        <p>Gracias por confiar en nosotros.</p>
        <p>Atentamente,<br><strong>Equipo de Crédito - ${config.email.company_name}</strong></p>
    </div>
    <div class="footer">
        <p>Este es un email automático, por favor no responda a esta dirección.</p>
    </div>
</body>
</html>
        `,
        text: `
Estimado(a) ${data.clienteNombre},

Su solicitud de crédito ha sido recibida exitosamente.

Folio: ${data.folio}
Tipo: ${tipoPersonaText}
Estado: En revisión

Nuestro equipo revisará su solicitud en las próximas 48 horas hábiles.

Contacto:
- Teléfono: 55 5078 7700
- WhatsApp: 55 4144 8919
- Email: tubosmty@tubosmonterrey.com.mx

Atentamente,
Equipo de Crédito - ${config.email.company_name}
        `
      });

      return !result.error;
    } catch (error) {
      console.error('Error enviando confirmación al cliente:', error);
      return false;
    }
  }

  // Enviar email de actualización de estado
  static async sendStatusUpdate(data: {
    clienteEmail: string;
    clienteNombre: string;
    folio: string;
    nuevoEstado: 'PROCESADA' | 'RECHAZADA';
    comentarios?: string;
  }): Promise<boolean> {
    try {
      const estadoText = data.nuevoEstado === 'PROCESADA' ? 'APROBADA' : 'RECHAZADA';
      const colorEstado = data.nuevoEstado === 'PROCESADA' ? '#16a34a' : '#dc2626';
      const iconoEstado = data.nuevoEstado === 'PROCESADA' ? '✅' : '❌';

      const result = await resend.emails.send({
        from: config.email.from_email,
        to: [data.clienteEmail],
        subject: `Actualización de Solicitud - ${estadoText} - Folio: ${data.folio}`,
        html: `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background-color: ${colorEstado}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
        .status-box { background-color: white; border: 2px solid ${colorEstado}; border-radius: 6px; padding: 20px; margin: 20px 0; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${iconoEstado} Solicitud ${estadoText}</h1>
        <h2>${config.email.company_name}</h2>
    </div>
    <div class="content">
        <p>Estimado(a) <strong>${data.clienteNombre}</strong>,</p>
        
        <div class="status-box">
            <h3>Su solicitud de crédito ha sido ${estadoText.toLowerCase()}</h3>
            <p><strong>Folio:</strong> ${data.folio}</p>
            <p><strong>Estado:</strong> ${estadoText}</p>
        </div>
        
        ${data.comentarios ? `<p><strong>Comentarios:</strong><br>${data.comentarios}</p>` : ''}
        
        <p>Para cualquier consulta, no dude en contactarnos:</p>
        <ul>
            <li>📞 Teléfono: 55 5078 7700</li>
            <li>📱 WhatsApp: 55 4144 8919</li>
            <li>✉️ Email: tubosmty@tubosmonterrey.com.mx</li>
        </ul>
        
        <p>Atentamente,<br><strong>Equipo de Crédito - ${config.email.company_name}</strong></p>
    </div>
</body>
</html>
        `
      });

      return !result.error;
    } catch (error) {
      console.error('Error enviando actualización de estado:', error);
      return false;
    }
  }

  // Verificar configuración de email
  static async testEmailConnection(): Promise<boolean> {
    try {
      // Resend no tiene un endpoint específico de test, pero podemos verificar la API key
      const result = await resend.emails.send({
        from: config.email.from_email,
        to: [config.email.admin_email],
        subject: 'Test de Configuración - Sistema TUBOS MONTERREY',
        text: 'Este es un email de prueba para verificar la configuración del servicio de correo.'
      });

      if (result.error) {
        console.error('Error en test de email:', result.error);
        return false;
      }

      console.log('✅ Configuración de email verificada correctamente');
      return true;
    } catch (error) {
      console.error('Error verificando configuración de email:', error);
      return false;
    }
  }
}

export default EmailService;
