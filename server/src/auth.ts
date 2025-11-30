import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import db from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'haustracker-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

export interface AuthRequest extends Request {
  userId?: number;
  userEmail?: string;
}

// Generate random password
export function generatePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Generate JWT token
export function generateToken(userId: number, email: string): string {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify JWT token
export function verifyToken(token: string): { userId: number; email: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
  } catch {
    return null;
  }
}

// Auth middleware
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'Nicht authentifiziert' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Ungültiges oder abgelaufenes Token' });
  }

  req.userId = decoded.userId;
  req.userEmail = decoded.email;
  next();
}

// Initialize users table and seed default user
export function initializeAuth() {
  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Check if any users exist
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  
  if (userCount.count === 0) {
    // Seed default user
    const defaultPassword = generatePassword();
    const hashedPassword = bcrypt.hashSync(defaultPassword, 10);
    
    db.prepare('INSERT INTO users (email, password, name) VALUES (?, ?, ?)')
      .run('christian@tiehs.de', hashedPassword, 'Christian');
    
    console.log('');
    console.log('='.repeat(60));
    console.log('DEFAULT USER CREATED');
    console.log('='.repeat(60));
    console.log('Email:    christian@tiehs.de');
    console.log('Password:', defaultPassword);
    console.log('='.repeat(60));
    console.log('BITTE SPEICHERE DIESES PASSWORT!');
    console.log('='.repeat(60));
    console.log('');
  }
}
