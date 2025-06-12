import { BaseModel, query } from './database';
import { Cliente } from '@/types';

export class ClienteModel extends BaseModel {
  protected static tableName = 'clientes';

  // Crear cliente
  static async create(cliente: Omit<Cliente, 'id' | 'created_at' | 'updated_at'>): Promise<Cliente> {
    const result = await query(
      `INSERT INTO clientes (codigo_sn, nombre_sn, rfc, codigo_condiciones_pago, codigo_grupo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        cliente.codigo_sn,
        cliente.nombre_sn,
        cliente.rfc,
        cliente.codigo_condiciones_pago,
        cliente.codigo_grupo
      ]
    );
    return result.rows[0];
  }

  // Buscar cliente por código SN y RFC
  static async findByCodigoAndRFC(codigoSN: string, rfc: string): Promise<Cliente | null> {
    const result = await query(
      `SELECT * FROM clientes WHERE codigo_sn = $1 AND rfc = $2`,
      [codigoSN, rfc]
    );
    return result.rows[0] || null;
  }

  // Buscar cliente por RFC
  static async findByRFC(rfc: string): Promise<Cliente | null> {
    const result = await query(
      `SELECT * FROM clientes WHERE rfc = $1`,
      [rfc]
    );
    return result.rows[0] || null;
  }

  // Buscar cliente por código SN
  static async findByCodigoSN(codigoSN: string): Promise<Cliente | null> {
    const result = await query(
      `SELECT * FROM clientes WHERE codigo_sn = $1`,
      [codigoSN]
    );
    return result.rows[0] || null;
  }

  // Obtener todos los clientes con paginación
  static async findAll(page: number = 1, perPage: number = 50): Promise<{
    clientes: Cliente[];
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  }> {
    const offset = (page - 1) * perPage;
    
    // Contar total
    const countResult = await query('SELECT COUNT(*) FROM clientes');
    const total = parseInt(countResult.rows[0].count, 10);
    
    // Obtener clientes
    const result = await query(
      `SELECT * FROM clientes 
       ORDER BY nombre_sn ASC 
       LIMIT $1 OFFSET $2`,
      [perPage, offset]
    );
    
    return {
      clientes: result.rows,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage)
    };
  }

  // Actualizar cliente
  static async update(id: number, updates: Partial<Cliente>): Promise<Cliente | null> {
    const setClause = Object.keys(updates)
      .filter(key => key !== 'id' && key !== 'created_at')
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    if (!setClause) {
      throw new Error('No hay campos para actualizar');
    }
    
    const values = Object.values(updates).filter((_, index) => {
      const key = Object.keys(updates)[index];
      return key !== 'id' && key !== 'created_at';
    });
    
    const result = await query(
      `UPDATE clientes 
       SET ${setClause}, updated_at = NOW() 
       WHERE id = $1 
       RETURNING *`,
      [id, ...values]
    );
    
    return result.rows[0] || null;
  }

  // Eliminar cliente
  static async delete(id: number): Promise<boolean> {
    const result = await query(
      'DELETE FROM clientes WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }

  // Eliminar todos los clientes
  static async deleteAll(): Promise<number> {
    const result = await query('DELETE FROM clientes');
    return result.rowCount;
  }

  // Insertar múltiples clientes (para carga masiva desde Excel)
  static async createMany(clientes: Omit<Cliente, 'id' | 'created_at' | 'updated_at'>[]): Promise<Cliente[]> {
    if (clientes.length === 0) {
      return [];
    }

    const values = clientes.map((cliente, index) => {
      const base = index * 5;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
    }).join(', ');

    const params = clientes.flatMap(cliente => [
      cliente.codigo_sn,
      cliente.nombre_sn,
      cliente.rfc,
      cliente.codigo_condiciones_pago,
      cliente.codigo_grupo
    ]);

    const result = await query(
      `INSERT INTO clientes (codigo_sn, nombre_sn, rfc, codigo_condiciones_pago, codigo_grupo)
       VALUES ${values}
       RETURNING *`,
      params
    );

    return result.rows;
  }

  // Buscar clientes por término de búsqueda
  static async search(searchTerm: string, page: number = 1, perPage: number = 20): Promise<{
    clientes: Cliente[];
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  }> {
    const offset = (page - 1) * perPage;
    const searchPattern = `%${searchTerm.toUpperCase()}%`;
    
    // Contar resultados
    const countResult = await query(
      `SELECT COUNT(*) FROM clientes 
       WHERE UPPER(nombre_sn) LIKE $1 
          OR UPPER(codigo_sn) LIKE $1 
          OR UPPER(rfc) LIKE $1`,
      [searchPattern]
    );
    const total = parseInt(countResult.rows[0].count, 10);
    
    // Obtener resultados
    const result = await query(
      `SELECT * FROM clientes 
       WHERE UPPER(nombre_sn) LIKE $1 
          OR UPPER(codigo_sn) LIKE $1 
          OR UPPER(rfc) LIKE $1
       ORDER BY nombre_sn ASC 
       LIMIT $2 OFFSET $3`,
      [searchPattern, perPage, offset]
    );
    
    return {
      clientes: result.rows,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage)
    };
  }

  // Verificar si existe un cliente con el mismo RFC
  static async existsByRFC(rfc: string, excludeId?: number): Promise<boolean> {
    let queryText = 'SELECT 1 FROM clientes WHERE rfc = $1';
    const params: any[] = [rfc];
    
    if (excludeId) {
      queryText += ' AND id != $2';
      params.push(excludeId);
    }
    
    const result = await query(queryText, params);
    return result.rows.length > 0;
  }

  // Verificar si existe un cliente con el mismo código SN
  static async existsByCodigoSN(codigoSN: string, excludeId?: number): Promise<boolean> {
    let queryText = 'SELECT 1 FROM clientes WHERE codigo_sn = $1';
    const params: any[] = [codigoSN];
    
    if (excludeId) {
      queryText += ' AND id != $2';
      params.push(excludeId);
    }
    
    const result = await query(queryText, params);
    return result.rows.length > 0;
  }

  // Obtener estadísticas de clientes
  static async getStats(): Promise<{
    total: number;
    porGrupo: { grupo: string; cantidad: number }[];
    porCondicionesPago: { condicion: string; cantidad: number }[];
  }> {
    // Total
    const totalResult = await query('SELECT COUNT(*) FROM clientes');
    const total = parseInt(totalResult.rows[0].count, 10);
    
    // Por grupo
    const grupoResult = await query(
      `SELECT codigo_grupo as grupo, COUNT(*) as cantidad 
       FROM clientes 
       GROUP BY codigo_grupo 
       ORDER BY cantidad DESC`
    );
    
    // Por condiciones de pago
    const condicionesResult = await query(
      `SELECT codigo_condiciones_pago as condicion, COUNT(*) as cantidad 
       FROM clientes 
       GROUP BY codigo_condiciones_pago 
       ORDER BY cantidad DESC`
    );
    
    return {
      total,
      porGrupo: grupoResult.rows.map(row => ({
        grupo: row.grupo,
        cantidad: parseInt(row.cantidad, 10)
      })),
      porCondicionesPago: condicionesResult.rows.map(row => ({
        condicion: row.condicion,
        cantidad: parseInt(row.cantidad, 10)
      }))
    };
  }
}
