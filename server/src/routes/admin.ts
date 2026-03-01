import { Router, Response } from 'express';
import { AuthRequest, requireAdmin } from '../auth';
import { getDb } from '../database';

const router = Router();

// All admin routes require admin key
router.use(requireAdmin);

// GET /api/admin/dashboard
router.get('/admin/dashboard', (req: AuthRequest, res: Response): void => {
  const db = getDb();

  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  const totalTaps = db.prepare('SELECT COALESCE(SUM(taps), 0) as total FROM tap_events').get() as { total: number };
  const totalCoins = db.prepare('SELECT COALESCE(SUM(coins_earned), 0) as total FROM tap_events').get() as { total: number };
  const suspiciousUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE fraud_score > 10').get() as { count: number };
  const activeToday = db.prepare(
    `SELECT COUNT(DISTINCT user_id) as count FROM tap_events WHERE created_at >= date('now')`
  ).get() as { count: number };

  res.json({
    totalUsers: totalUsers.count,
    totalTaps: totalTaps.total,
    totalCoins: totalCoins.total,
    suspiciousUsers: suspiciousUsers.count,
    activeToday: activeToday.count,
  });
});

// GET /api/admin/users
router.get('/admin/users', (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const { search, page = '1', limit = '20' } = req.query;
  const offset = (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10);

  let users;
  if (search) {
    users = db.prepare(
      `SELECT id, telegram_id, username, first_name, balance, total_earned, league, is_banned, fraud_score, created_at
       FROM users
       WHERE username LIKE ? OR first_name LIKE ? OR telegram_id LIKE ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    ).all(`%${search}%`, `%${search}%`, `%${search}%`, parseInt(limit as string, 10), offset);
  } else {
    users = db.prepare(
      `SELECT id, telegram_id, username, first_name, balance, total_earned, league, is_banned, fraud_score, created_at
       FROM users
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    ).all(parseInt(limit as string, 10), offset);
  }

  const total = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };

  res.json({ users, total: total.count, page: parseInt(page as string, 10) });
});

// GET /api/admin/users/:id
router.get('/admin/users/:id', (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const userId = parseInt(req.params.id as string, 10);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const upgrades = db.prepare('SELECT * FROM upgrades WHERE user_id = ?').all(userId);
  const recentTaps = db.prepare(
    'SELECT * FROM tap_events WHERE user_id = ? ORDER BY created_at DESC LIMIT 20'
  ).all(userId);
  const fraudFlags = db.prepare(
    'SELECT * FROM fraud_flags WHERE user_id = ? ORDER BY created_at DESC'
  ).all(userId);

  res.json({ user, upgrades, recentTaps, fraudFlags });
});

// POST /api/admin/users/:id/adjust-balance
router.post('/admin/users/:id/adjust-balance', (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const userId = parseInt(req.params.id as string, 10);
  const { amount, reason } = req.body;

  if (typeof amount !== 'number') {
    res.status(400).json({ error: 'Amount must be a number' });
    return;
  }

  const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId) as { balance: number } | undefined;
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const newBalance = user.balance + amount;
  if (newBalance < 0) {
    res.status(400).json({ error: 'Balance cannot go below zero' });
    return;
  }

  db.prepare('UPDATE users SET balance = ? WHERE id = ?').run(newBalance, userId);

  db.prepare(
    'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)'
  ).run(userId, 'balance_adjust', JSON.stringify({ amount, reason, oldBalance: user.balance, newBalance }), req.ip);

  res.json({ userId, oldBalance: user.balance, newBalance, amount });
});

// POST /api/admin/users/:id/ban
router.post('/admin/users/:id/ban', (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const userId = parseInt(req.params.id as string, 10);
  const { banned, reason } = req.body;

  const user = db.prepare('SELECT is_banned FROM users WHERE id = ?').get(userId) as { is_banned: number } | undefined;
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  db.prepare('UPDATE users SET is_banned = ? WHERE id = ?').run(banned ? 1 : 0, userId);

  // Invalidate sessions if banning
  if (banned) {
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  }

  db.prepare(
    'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)'
  ).run(userId, banned ? 'user_ban' : 'user_unban', JSON.stringify({ reason }), req.ip);

  res.json({ userId, banned: !!banned });
});

// GET /api/admin/fraud-queue
router.get('/admin/fraud-queue', (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const flaggedUsers = db.prepare(
    `SELECT u.id, u.username, u.first_name, u.telegram_id, u.fraud_score, u.is_banned,
            COUNT(ff.id) as flag_count
     FROM users u
     JOIN fraud_flags ff ON u.id = ff.user_id
     WHERE u.fraud_score > 0
     GROUP BY u.id
     ORDER BY u.fraud_score DESC
     LIMIT 50`
  ).all();

  res.json({ flaggedUsers });
});

// GET /api/admin/audit-log
router.get('/admin/audit-log', (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const { page = '1', limit = '50' } = req.query;
  const offset = (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10);

  const logs = db.prepare(
    `SELECT al.*, u.username, u.first_name
     FROM audit_logs al
     LEFT JOIN users u ON al.user_id = u.id
     ORDER BY al.created_at DESC
     LIMIT ? OFFSET ?`
  ).all(parseInt(limit as string, 10), offset);

  res.json({ logs });
});

// GET /api/admin/announcements
router.get('/admin/announcements', (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const announcements = db.prepare(
    'SELECT * FROM announcements ORDER BY created_at DESC'
  ).all();

  res.json({ announcements });
});

// POST /api/admin/announcements
router.post('/admin/announcements', (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const { title, content, type, expiresAt } = req.body;

  if (!title || !content) {
    res.status(400).json({ error: 'Title and content are required' });
    return;
  }

  const result = db.prepare(
    'INSERT INTO announcements (title, content, type, expires_at) VALUES (?, ?, ?, ?)'
  ).run(title, content, type || 'info', expiresAt || null);

  const announcement = db.prepare('SELECT * FROM announcements WHERE id = ?').get(result.lastInsertRowid);
  res.json({ announcement });
});

// GET /api/admin/settings
router.get('/admin/settings', (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const settings = db.prepare('SELECT * FROM app_settings').all();
  res.json({ settings });
});

// POST /api/admin/settings
router.post('/admin/settings', (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const { settings } = req.body;

  if (!settings || typeof settings !== 'object') {
    res.status(400).json({ error: 'Settings object is required' });
    return;
  }

  const update = db.prepare(
    'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)'
  );

  const updateAll = db.transaction(() => {
    for (const [key, value] of Object.entries(settings)) {
      update.run(key, String(value));
    }
  });

  updateAll();

  db.prepare(
    'INSERT INTO audit_logs (action, details, ip_address) VALUES (?, ?, ?)'
  ).run('settings_update', JSON.stringify(settings), req.ip);

  const allSettings = db.prepare('SELECT * FROM app_settings').all();
  res.json({ settings: allSettings });
});

export default router;
