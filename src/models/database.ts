import { Pool, PoolConfig } from 'pg';
import config from '@/config';

// Configuración de la base de datos
const poolConfig: PoolConfig = {
  connectionString: config.database.url,
  ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
  max: 20, // Máximo número de conexiones en el pool
  idleTimeoutMillis: 30000, // Tiempo de espera antes de cerrar conexión inactiva
  connectionTimeoutMillis: 2000, // Tiempo máximo para establecer conexión
};

// Pool de conexiones
export const pool = new Pool(poolConfig);

// Manejar errores del pool
pool.on('error', (err) => {
  console.error('Error inesperado en el pool de base de datos:', err);
  process.exit(-1);
});

// Función para verificar conexión
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Conexión a base de datos establecida correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error);
    return false;
  }
}

// Función para cerrar el pool de conexiones
export async function closePool(): Promise<void> {
  try {
    await pool.end();
    console.log('Pool de conexiones cerrado');
  } catch (error) {
    console.error('Error cerrando pool de conexiones:', error);
  }
}

// Funciones de utilidad para consultas
export async function query(text: string, params?: any[]): Promise<any> {
  const start = Date.now();
  const client = await pool.connect();
  
  try {
    const result = await client.query(text, params);
    const duration = Date.now() - start;
    
    if (config.nodeEnv === 'development') {
      console.log('Consulta ejecutada:', { text, duration, rows: result.rowCount });
    }
    
    return result;
  } catch (error) {
    console.error('Error en consulta SQL:', { text, params, error });
    throw error;
  } finally {
    client.release();
  }
}

// Función para ejecutar transacciones
export async function transaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Funciones de utilidad para modelos
export class BaseModel {
  protected static tableName: string;

  static async findById(id: number): Promise<any> {
    const result = await query(
      `SELECT * FROM ${this.tableName} WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  protected static async findAll(
    limit?: number,
    offset?: number
  ): Promise<any[]> {
    let queryText = `SELECT * FROM ${this.tableName} ORDER BY created_at DESC`;
    const params: any[] = [];

    if (limit) {
      queryText += ` LIMIT $1`;
      params.push(limit);
      
      if (offset) {
        queryText += ` OFFSET $2`;
        params.push(offset);
      }
    }

    const result = await query(queryText, params);
    return result.rows;
  }

  protected static async count(): Promise<number> {
    const result = await query(`SELECT COUNT(*) FROM ${this.tableName}`);
    return parseInt(result.rows[0]?.count || '0', 10);
  }

  protected static async deleteById(id: number): Promise<boolean> {
    const result = await query(
      `DELETE FROM ${this.tableName} WHERE id = $1`,
      [id]
    );
    return result.rowCount > 0;
  }
}

export default pool;
