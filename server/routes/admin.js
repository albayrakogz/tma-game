const express = require('express');
const db = require('../db');
const { adminMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(adminMiddleware);

// Dashboard stats
router.get('/dashboard', (_req, res) => {
  const totalUsers = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt;
  const activeToday = db.prepare(
    "SELECT COUNT(*) as cnt FROM users WHERE last_active_at >= date('now')"
  ).get().cnt;
  const totalEarned = db.prepare(
    'SELECT COALESCE(SUM(total_earned), 0) as total FROM users'
  ).get().total;
  const totalSquads = db.prepare('SELECT COUNT(*) as cnt FROM squads').get().cnt;
  const restrictedUsers = db.prepare(
    'SELECT COUNT(*) as cnt FROM users WHERE is_restricted = 1'
  ).get().cnt;
  const leagueDistribution = db.prepare(
    'SELECT current_league, COUNT(*) as cnt FROM users GROUP BY current_league'
  ).all();

  res.json({
    total_users: totalUsers,
    active_today: activeToday,
    total_earned: totalEarned,
    total_squads: totalSquads,
    restricted_users: restrictedUsers,
    league_distribution: leagueDistribution,
  });
});

// Search users
router.get('/users', (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  let query = 'SELECT * FROM users';
  const params = [];

  if (search) {
    query += ' WHERE username LIKE ? OR first_name LIKE ? OR telegram_id = ?';
    params.push(`%${search}%`, `%${search}%`, search);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit, 10), offset);

  const users = db.prepare(query).all(...params);

  res.json({ users });
});

// Adjust user balance
router.post('/users/:id/adjust-balance', (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const { amount, reason } = req.body;

  if (typeof amount !== 'number') {
    return res.status(400).json({ error: 'Amount must be a number' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const newBalance = user.balance + amount;
  if (newBalance < 0) {
    return res.status(400).json({ error: 'Resulting balance cannot be negative' });
  }

  db.prepare("UPDATE users SET balance = ?, updated_at = datetime('now') WHERE id = ?")
    .run(newBalance, userId);

  if (amount > 0) {
    db.prepare("UPDATE users SET total_earned = total_earned + ?, updated_at = datetime('now') WHERE id = ?")
      .run(amount, userId);
  }

  db.prepare(
    "INSERT INTO audit_logs (user_id, action, details) VALUES (?, 'admin_balance_adjust', ?)"
  ).run(userId, JSON.stringify({ amount, reason: reason || 'Admin adjustment', old_balance: user.balance, new_balance: newBalance }));

  res.json({ user_id: userId, old_balance: user.balance, new_balance: newBalance });
});

// Fraud queue
router.get('/fraud-queue', (req, res) => {
  const flaggedUsers = db.prepare(
    `SELECT u.id, u.telegram_id, u.username, u.fraud_score, u.is_restricted,
            COUNT(ff.id) as flag_count
     FROM users u
     LEFT JOIN fraud_flags ff ON ff.user_id = u.id
     WHERE u.fraud_score > 0
     GROUP BY u.id
     ORDER BY u.fraud_score DESC
     LIMIT 50`
  ).all();

  res.json({ flagged_users: flaggedUsers });
});

// Restrict / unrestrict user
router.post('/users/:id/restrict', (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const { restrict } = req.body;

  db.prepare("UPDATE users SET is_restricted = ?, updated_at = datetime('now') WHERE id = ?")
    .run(restrict ? 1 : 0, userId);

  db.prepare(
    "INSERT INTO audit_logs (user_id, action, details) VALUES (?, 'admin_restrict', ?)"
  ).run(userId, JSON.stringify({ restricted: !!restrict }));

  res.json({ user_id: userId, is_restricted: !!restrict });
});

// Announcements CRUD
router.get('/announcements', (_req, res) => {
  const announcements = db.prepare('SELECT * FROM announcements ORDER BY created_at DESC').all();
  res.json({ announcements });
});

router.post('/announcements', (req, res) => {
  const { title, content, type } = req.body;

  if (!title) return res.status(400).json({ error: 'Title is required' });

  const result = db.prepare(
    'INSERT INTO announcements (title, content, type) VALUES (?, ?, ?)'
  ).run(title, content || '', type || 'info');

  const announcement = db.prepare('SELECT * FROM announcements WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json({ announcement });
});

router.delete('/announcements/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  db.prepare('DELETE FROM announcements WHERE id = ?').run(id);
  res.json({ message: 'Announcement deleted' });
});

// App settings
router.get('/settings', (_req, res) => {
  const settings = db.prepare('SELECT * FROM app_settings ORDER BY key').all();
  res.json({ settings });
});

router.post('/settings', (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ error: 'Key is required' });

  db.prepare(
    "INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))"
  ).run(key, String(value));

  res.json({ key, value: String(value) });
});

module.exports = router;
