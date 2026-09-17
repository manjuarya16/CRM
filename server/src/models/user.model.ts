import { pool } from '@/config/db';

export interface User {
  id: number | string;
  name: string;
  email: string;
  password?: string;
  password_hash?: string;
  status?: boolean;
  view_permission?: string;
  role_id?: number;
  role?: string;
  role_name?: string;
  image?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type PublicUser = Omit<User, 'password' | 'password_hash'>;

export function toPublicUser(user: User): PublicUser {
  const { password: _password, password_hash: _passwordHash, ...rest } = user;
  return {
    ...rest,
    role: user.role_name || user.role || 'user',
  };
}

export const UserModel = {
  async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT u.*, r.name as role_name 
      FROM users u 
      LEFT JOIN roles r ON u.role_id = r.id 
      WHERE LOWER(u.email) = LOWER($1)
      LIMIT 1
    `;
    const { rows } = await pool.query<User>(query, [email.trim()]);
    if (!rows[0]) return null;
    
    // Normalise password field
    const user = rows[0];
    if (user.password && !user.password_hash) {
      user.password_hash = user.password;
    }
    return user;
  },

  async findById(id: number | string): Promise<User | null> {
    const query = `
      SELECT u.*, r.name as role_name 
      FROM users u 
      LEFT JOIN roles r ON u.role_id = r.id 
      WHERE u.id = $1
      LIMIT 1
    `;
    const { rows } = await pool.query<User>(query, [id]);
    if (!rows[0]) return null;
    
    const user = rows[0];
    if (user.password && !user.password_hash) {
      user.password_hash = user.password;
    }
    return user;
  },

  async create(input: {
    name: string;
    email: string;
    passwordHash: string;
    roleId?: number;
    status?: boolean;
  }): Promise<User> {
    const roleId = input.roleId ?? 1;
    const { rows } = await pool.query<User>(
      `INSERT INTO users (name, email, password, role_id, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [input.name, input.email, input.passwordHash, roleId, input.status ?? true],
    );
    return rows[0];
  },
};

