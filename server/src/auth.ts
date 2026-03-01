import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { getDb } from './database';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface AuthRequest extends Request {
  userId?: number;
  telegramId?: string;
}

export function validateTelegramInitData(initData: string, botToken: string): TelegramUser | null {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    params.delete('hash');

    const dataCheckArr: string[] = [];
    params.forEach((value, key) => {
      dataCheckArr.push(`${key}=${value}`);
    });
    dataCheckArr.sort();
    const dataCheckString = dataCheckArr.join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (computedHash !== hash) return null;

    const userStr = params.get('user');
    if (!userStr) return null;

    const user: TelegramUser = JSON.parse(userStr);
    return user;
  } catch {
    return null;
  }
}

export function createSession(userId: number): { token: string; expiresAt: string } {
  const db = getDb();
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  db.prepare(
    'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)'
  ).run(userId, token, expiresAt);

  return { token, expiresAt };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.substring(7);
  const db = getDb();

  const session = db.prepare(
    'SELECT user_id, expires_at FROM sessions WHERE token = ?'
  ).get(token) as { user_id: number; expires_at: string } | undefined;

  if (!session) {
    res.status(401).json({ error: 'Invalid session token' });
    return;
  }

  if (new Date(session.expires_at) < new Date()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    res.status(401).json({ error: 'Session expired' });
    return;
  }

  const user = db.prepare('SELECT id, telegram_id, is_banned FROM users WHERE id = ?').get(session.user_id) as {
    id: number;
    telegram_id: string;
    is_banned: number;
  } | undefined;

  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  if (user.is_banned) {
    res.status(403).json({ error: 'User is banned' });
    return;
  }

  req.userId = user.id;
  req.telegramId = user.telegram_id;
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  const adminKey = req.headers['x-admin-key'];
  const expectedKey = process.env.ADMIN_KEY || 'taprealm-admin-secret';

  if (adminKey !== expectedKey) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}
