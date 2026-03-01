const crypto = require('crypto');
const db = require('../db');

function validateTelegramWebAppData(initData, botToken) {
  if (!initData || !botToken) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;

  params.delete('hash');

  const entries = Array.from(params.entries());
  entries.sort((a, b) => a[0].localeCompare(b[0]));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (computedHash !== hash) return null;

  // Check auth_date is not too old (allow 1 hour)
  const authDate = parseInt(params.get('auth_date'), 10);
  if (isNaN(authDate)) return null;
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > 3600) return null;

  const userStr = params.get('user');
  if (!userStr) return null;

  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const botToken = process.env.BOT_TOKEN;

  // Allow bypass in development if no BOT_TOKEN set
  if (!botToken && process.env.NODE_ENV === 'development') {
    const devUserId = req.headers['x-dev-user-id'];
    if (devUserId) {
      const user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(devUserId);
      if (user) {
        req.user = user;
        return next();
      }
    }
    return res.status(401).json({ error: 'Authentication required' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  // Check session token first
  const token = authHeader.replace('Bearer ', '');
  const session = db.prepare(
    `SELECT s.*, u.* FROM sessions s JOIN users u ON s.user_id = u.id
     WHERE s.id = ? AND s.expires_at > datetime('now')`
  ).get(token);

  if (session) {
    req.user = {
      id: session.user_id,
      telegram_id: session.telegram_id,
      username: session.username,
      first_name: session.first_name,
      last_name: session.last_name,
      is_premium: session.is_premium,
      balance: session.balance,
      total_earned: session.total_earned,
      current_league: session.current_league,
      rank: session.rank,
      referral_code: session.referral_code,
      squad_id: session.squad_id,
      fraud_score: session.fraud_score,
      is_restricted: session.is_restricted,
    };
    return next();
  }

  return res.status(401).json({ error: 'Invalid or expired session' });
}

function adminMiddleware(req, res, next) {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) {
    return res.status(403).json({ error: 'Admin access not configured' });
  }

  const provided = req.headers['x-admin-key'];
  if (provided !== adminKey) {
    return res.status(403).json({ error: 'Invalid admin key' });
  }

  next();
}

module.exports = { validateTelegramWebAppData, authMiddleware, adminMiddleware };
