import { BaseModel, query } from './database';
import { Solicitud, SolicitudWithCliente, FormularioData } from '@/types';

export class SolicitudModel extends BaseModel {
  protected static tableName = 'solicitudes';

  // Crear solicitud
  static async create(solicitudData: {
    folio: string;
    tipo_persona: 'FISICA' | 'MORAL';
    cliente_id: number;
    formulario_data: FormularioData;
    archivos_urls: string[];
  }): Promise<Solicitud> {
    const result = await query(
      `INSERT INTO solicitudes (folio, tipo_persona, cliente_id, formulario_data, archivos_urls, estado)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        solicitudData.folio,
        solicitudData.tipo_persona,
        solicitudData.cliente_id,
        JSON.stringify(solicitudData.formulario_data),
        JSON.stringify(solicitudData.archivos_urls),
        'PENDIENTE'
      ]
    );

    // Parsear los campos JSON
    const solicitud = result.rows[0];
    solicitud.formulario_data = JSON.parse(solicitud.formulario_data);
    solicitud.archivos_urls = JSON.parse(solicitud.archivos_urls);
    
    return solicitud;
  }

  // Buscar solicitud por ID
  static async findById(id: number): Promise<SolicitudWithCliente | null> {
    const result = await query(
      `SELECT s.*, c.codigo_sn, c.nombre_sn, c.rfc, c.codigo_condiciones_pago, c.codigo_grupo
       FROM solicitudes s
       JOIN clientes c ON s.cliente_id = c.id
       WHERE s.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return this.formatSolicitudWithCliente(row);
  }

  // Buscar solicitud por folio
  static async findByFolio(folio: string): Promise<Solicitud | null> {
    const result = await query(
      `SELECT s.*, c.codigo_sn, c.nombre_sn, c.rfc, c.codigo_condiciones_pago, c.codigo_grupo
       FROM solicitudes s
       JOIN clientes c ON s.cliente_id = c.id
       WHERE s.folio = $1`,
      [folio]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return this.formatSolicitudWithCliente(row);
  }

  // Obtener todas las solicitudes con paginación
  static async findAll(
    page: number = 1,
    perPage: number = 20,
    filters?: {
      estado?: 'PENDIENTE' | 'PROCESADA' | 'RECHAZADA';
      tipo_persona?: 'FISICA' | 'MORAL';
      fecha_desde?: Date;
      fecha_hasta?: Date;
      cliente_id?: number;
    }
  ): Promise<{
    solicitudes: Solicitud[];
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  }> {
    const offset = (page - 1) * perPage;
    let whereClause = '';
    const params: any[] = [];
    let paramCount = 0;

    // Construir filtros
    if (filters) {
      const conditions: string[] = [];

      if (filters.estado) {
        conditions.push(`s.estado = $${++paramCount}`);
        params.push(filters.estado);
      }

      if (filters.tipo_persona) {
        conditions.push(`s.tipo_persona = $${++paramCount}`);
        params.push(filters.tipo_persona);
      }

      if (filters.fecha_desde) {
        conditions.push(`s.created_at >= $${++paramCount}`);
        params.push(filters.fecha_desde);
      }

      if (filters.fecha_hasta) {
        conditions.push(`s.created_at <= $${++paramCount}`);
        params.push(filters.fecha_hasta);
      }

      if (filters.cliente_id) {
        conditions.push(`s.cliente_id = $${++paramCount}`);
        params.push(filters.cliente_id);
      }

      if (conditions.length > 0) {
        whereClause = `WHERE ${conditions.join(' AND ')}`;
      }
    }

    // Contar total
    const countQuery = `
      SELECT COUNT(*) 
      FROM solicitudes s
      JOIN clientes c ON s.cliente_id = c.id
      ${whereClause}
    `;
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    // Obtener solicitudes
    const solicitudesQuery = `
      SELECT s.*, c.codigo_sn, c.nombre_sn, c.rfc, c.codigo_condiciones_pago, c.codigo_grupo
      FROM solicitudes s
      JOIN clientes c ON s.cliente_id = c.id
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;
    params.push(perPage, offset);

    const result = await query(solicitudesQuery, params);
    const solicitudes = result.rows.map(row => this.formatSolicitudWithCliente(row));

    return {
      solicitudes,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage)
    };
  }

  // Buscar solicitudes por cliente
  static async findByCliente(clienteId: number): Promise<Solicitud[]> {
    const result = await query(
      `SELECT s.*, c.codigo_sn, c.nombre_sn, c.rfc, c.codigo_condiciones_pago, c.codigo_grupo
       FROM solicitudes s
       JOIN clientes c ON s.cliente_id = c.id
       WHERE s.cliente_id = $1
       ORDER BY s.created_at DESC`,
      [clienteId]
    );

    return result.rows.map(row => this.formatSolicitudWithCliente(row));
  }

  // Actualizar estado de solicitud
  static async updateEstado(
    id: number,
    estado: 'PENDIENTE' | 'PROCESADA' | 'RECHAZADA'
  ): Promise<Solicitud | null> {
    const result = await query(
      `UPDATE solicitudes 
       SET estado = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [estado, id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    // Obtener datos completos con cliente
    return this.findById(id);
  }

  // Eliminar solicitud
  static async delete(id: number): Promise<boolean> {
    const result = await query(
      'DELETE FROM solicitudes WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }

  // Generar folio único
  static async generateFolio(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    // Contar solicitudes del día actual
    const countResult = await query(
      `SELECT COUNT(*) 
       FROM solicitudes 
       WHERE DATE(created_at) = CURRENT_DATE`
    );
    
    const dailyCount = parseInt(countResult.rows[0].count, 10) + 1;
    const sequence = String(dailyCount).padStart(3, '0');
    
    return `TM-${year}${month}${day}-${sequence}`;
  }

  // Obtener estadísticas de solicitudes
  static async getStats(): Promise<{
    total: number;
    pendientes: number;
    procesadas: number;
    rechazadas: number;
    personasFisicas: number;
    personasMorales: number;
    solicitudesPorMes: { mes: string; cantidad: number }[];
    solicitudesPorDia: { dia: string; cantidad: number }[];
  }> {
    // Estadísticas generales
    const generalResult = await query(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN estado = 'PENDIENTE' THEN 1 ELSE 0 END) as pendientes,
         SUM(CASE WHEN estado = 'PROCESADA' THEN 1 ELSE 0 END) as procesadas,
         SUM(CASE WHEN estado = 'RECHAZADA' THEN 1 ELSE 0 END) as rechazadas,
         SUM(CASE WHEN tipo_persona = 'FISICA' THEN 1 ELSE 0 END) as personas_fisicas,
         SUM(CASE WHEN tipo_persona = 'MORAL' THEN 1 ELSE 0 END) as personas_morales
       FROM solicitudes`
    );

    // Solicitudes por mes (últimos 12 meses)
    const mesResult = await query(
      `SELECT 
         TO_CHAR(created_at, 'YYYY-MM') as mes,
         COUNT(*) as cantidad
       FROM solicitudes
       WHERE created_at >= NOW() - INTERVAL '12 months'
       GROUP BY TO_CHAR(created_at, 'YYYY-MM')
       ORDER BY mes DESC`
    );

    // Solicitudes por día (últimos 30 días)
    const diaResult = await query(
      `SELECT 
         TO_CHAR(created_at, 'YYYY-MM-DD') as dia,
         COUNT(*) as cantidad
       FROM solicitudes
       WHERE created_at >= NOW() - INTERVAL '30 days'
       GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
       ORDER BY dia DESC`
    );

    const stats = generalResult.rows[0];
    return {
      total: parseInt(stats.total, 10),
      pendientes: parseInt(stats.pendientes, 10),
      procesadas: parseInt(stats.procesadas, 10),
      rechazadas: parseInt(stats.rechazadas, 10),
      personasFisicas: parseInt(stats.personas_fisicas, 10),
      personasMorales: parseInt(stats.personas_morales, 10),
      solicitudesPorMes: mesResult.rows.map(row => ({
        mes: row.mes,
        cantidad: parseInt(row.cantidad, 10)
      })),
      solicitudesPorDia: diaResult.rows.map(row => ({
        dia: row.dia,
        cantidad: parseInt(row.cantidad, 10)
      }))
    };
  }

  // Buscar solicitudes por término de búsqueda
  static async search(
    searchTerm: string,
    page: number = 1,
    perPage: number = 20
  ): Promise<{
    solicitudes: Solicitud[];
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  }> {
    const offset = (page - 1) * perPage;
    const searchPattern = `%${searchTerm.toUpperCase()}%`;

    // Contar resultados
    const countResult = await query(
      `SELECT COUNT(*) 
       FROM solicitudes s
       JOIN clientes c ON s.cliente_id = c.id
       WHERE UPPER(s.folio) LIKE $1 
          OR UPPER(c.nombre_sn) LIKE $1 
          OR UPPER(c.codigo_sn) LIKE $1
          OR UPPER(c.rfc) LIKE $1`,
      [searchPattern]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Obtener resultados
    const result = await query(
      `SELECT s.*, c.codigo_sn, c.nombre_sn, c.rfc, c.codigo_condiciones_pago, c.codigo_grupo
       FROM solicitudes s
       JOIN clientes c ON s.cliente_id = c.id
       WHERE UPPER(s.folio) LIKE $1 
          OR UPPER(c.nombre_sn) LIKE $1 
          OR UPPER(c.codigo_sn) LIKE $1
          OR UPPER(c.rfc) LIKE $1
       ORDER BY s.created_at DESC
       LIMIT $2 OFFSET $3`,
      [searchPattern, perPage, offset]
    );

    const solicitudes = result.rows.map(row => this.formatSolicitudWithCliente(row));

    return {
      solicitudes,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage)
    };
  }

  // Función auxiliar para formatear solicitud con datos de cliente
  private static formatSolicitudWithCliente(row: any): SolicitudWithCliente {
    return {
      id: row.id,
      folio: row.folio,
      tipo_persona: row.tipo_persona,
      cliente_id: row.cliente_id,
      formulario_data: typeof row.formulario_data === 'string' 
        ? JSON.parse(row.formulario_data) 
        : row.formulario_data,
      archivos_urls: typeof row.archivos_urls === 'string'
        ? JSON.parse(row.archivos_urls)
        : row.archivos_urls,
      estado: row.estado,
      created_at: row.created_at,
      updated_at: row.updated_at,
      // Datos del cliente incluidos
      cliente: {
        id: row.cliente_id,
        codigo_sn: row.codigo_sn,
        nombre_sn: row.nombre_sn,
        rfc: row.rfc,
        codigo_condiciones_pago: row.codigo_condiciones_pago,
        codigo_grupo: row.codigo_grupo
      }
    };
  }

  // Obtener solicitudes recientes
  static async getRecientes(limit: number = 10): Promise<Solicitud[]> {
    const result = await query(
      `SELECT s.*, c.codigo_sn, c.nombre_sn, c.rfc, c.codigo_condiciones_pago, c.codigo_grupo
       FROM solicitudes s
       JOIN clientes c ON s.cliente_id = c.id
       ORDER BY s.created_at DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows.map(row => this.formatSolicitudWithCliente(row));
  }

  // Contar solicitudes por cliente
  static async countByCliente(clienteId: number): Promise<number> {
    const result = await query(
      'SELECT COUNT(*) FROM solicitudes WHERE cliente_id = $1',
      [clienteId]
    );
    return parseInt(result.rows[0].count, 10);
  }
}
