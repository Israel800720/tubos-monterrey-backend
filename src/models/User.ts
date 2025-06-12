import bcrypt from 'bcryptjs';
import { BaseModel, query } from './database';
import { User } from '@/types';

export class UserModel extends BaseModel {
  protected static tableName = 'users';

  // Crear usuario
  static async create(userData: {
    email: string;
    password: string;
    name: string;
    role?: 'admin' | 'client';
  }): Promise<Omit<User, 'password_hash'>> {
    // Hash de la contraseña
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(userData.password, saltRounds);

    const result = await query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role, is_active, created_at, updated_at`,
      [
        userData.email.toLowerCase(),
        password_hash,
        userData.name,
        userData.role || 'admin'
      ]
    );

    return result.rows[0];
  }

  // Buscar usuario por email
  static async findByEmail(email: string): Promise<User | null> {
    const result = await query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase()]
    );
    return result.rows[0] || null;
  }

  // Buscar usuario por ID
  static async findById(id: number): Promise<Omit<User, 'password_hash'> | null> {
    const result = await query(
      `SELECT id, email, name, role, is_active, created_at, updated_at 
       FROM users WHERE id = $1 AND is_active = true`,
      [id]
    );
    return result.rows[0] || null;
  }

  // Validar contraseña
  static async validatePassword(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return null;
    }

    return user;
  }

  // Obtener todos los usuarios (sin contraseñas)
  static async findAll(): Promise<Omit<User, 'password_hash'>[]> {
    const result = await query(
      `SELECT id, email, name, role, is_active, created_at, updated_at 
       FROM users 
       WHERE is_active = true 
       ORDER BY created_at DESC`
    );
    return result.rows;
  }

  // Actualizar usuario
  static async update(
    id: number, 
    updates: Partial<Pick<User, 'email' | 'name' | 'role' | 'is_active'>>
  ): Promise<Omit<User, 'password_hash'> | null> {
    const allowedFields = ['email', 'name', 'role', 'is_active'];
    const setClause = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    if (!setClause) {
      throw new Error('No hay campos válidos para actualizar');
    }

    const values = Object.entries(updates)
      .filter(([key]) => allowedFields.includes(key))
      .map(([key, value]) => key === 'email' ? value.toLowerCase() : value);

    const result = await query(
      `UPDATE users 
       SET ${setClause}, updated_at = NOW() 
       WHERE id = $1 
       RETURNING id, email, name, role, is_active, created_at, updated_at`,
      [id, ...values]
    );

    return result.rows[0] || null;
  }

  // Cambiar contraseña
  static async changePassword(id: number, newPassword: string): Promise<boolean> {
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(newPassword, saltRounds);

    const result = await query(
      `UPDATE users 
       SET password_hash = $1, updated_at = NOW() 
       WHERE id = $2`,
      [password_hash, id]
    );

    return result.rowCount > 0;
  }

  // Desactivar usuario (soft delete)
  static async deactivate(id: number): Promise<boolean> {
    const result = await query(
      `UPDATE users 
       SET is_active = false, updated_at = NOW() 
       WHERE id = $1`,
      [id]
    );
    return result.rowCount > 0;
  }

  // Activar usuario
  static async activate(id: number): Promise<boolean> {
    const result = await query(
      `UPDATE users 
       SET is_active = true, updated_at = NOW() 
       WHERE id = $1`,
      [id]
    );
    return result.rowCount > 0;
  }

  // Verificar si existe un usuario con el mismo email
  static async existsByEmail(email: string, excludeId?: number): Promise<boolean> {
    let queryText = 'SELECT 1 FROM users WHERE email = $1';
    const params: any[] = [email.toLowerCase()];

    if (excludeId) {
      queryText += ' AND id != $2';
      params.push(excludeId);
    }

    const result = await query(queryText, params);
    return result.rows.length > 0;
  }

  // Obtener usuarios por rol
  static async findByRole(role: 'admin' | 'client'): Promise<Omit<User, 'password_hash'>[]> {
    const result = await query(
      `SELECT id, email, name, role, is_active, created_at, updated_at 
       FROM users 
       WHERE role = $1 AND is_active = true 
       ORDER BY created_at DESC`,
      [role]
    );
    return result.rows;
  }

  // Obtener estadísticas de usuarios
  static async getStats(): Promise<{
    total: number;
    activos: number;
    inactivos: number;
    admins: number;
    clients: number;
  }> {
    const result = await query(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as activos,
         SUM(CASE WHEN is_active = false THEN 1 ELSE 0 END) as inactivos,
         SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins,
         SUM(CASE WHEN role = 'client' THEN 1 ELSE 0 END) as clients
       FROM users`
    );

    const stats = result.rows[0];
    return {
      total: parseInt(stats.total, 10),
      activos: parseInt(stats.activos, 10),
      inactivos: parseInt(stats.inactivos, 10),
      admins: parseInt(stats.admins, 10),
      clients: parseInt(stats.clients, 10)
    };
  }

  // Crear usuario administrador por defecto
  static async createDefaultAdmin(adminData: {
    email: string;
    password: string;
    name: string;
  }): Promise<Omit<User, 'password_hash'> | null> {
    try {
      // Verificar si ya existe un admin
      const existingAdmin = await query(
        'SELECT id FROM users WHERE role = $1 AND is_active = true LIMIT 1',
        ['admin']
      );

      if (existingAdmin.rows.length > 0) {
        console.log('Ya existe un usuario administrador');
        return null;
      }

      // Crear admin por defecto
      const admin = await this.create({
        ...adminData,
        role: 'admin'
      });

      console.log('✅ Usuario administrador por defecto creado:', admin.email);
      return admin;
    } catch (error) {
      console.error('Error creando administrador por defecto:', error);
      return null;
    }
  }

  // Actualizar último login
  static async updateLastLogin(id: number): Promise<void> {
    await query(
      'UPDATE users SET updated_at = NOW() WHERE id = $1',
      [id]
    );
  }
}
