const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { validateTelegramWebAppData } = require('../middleware/auth');

const router = express.Router();

function generateReferralCode() {
  return uuidv4().replace(/-/g, '').substring(0, 10).toUpperCase();
}

function getLeagueForScore(totalEarned) {
  const league = db.prepare(
    'SELECT name FROM leagues WHERE min_score <= ? AND max_score >= ? ORDER BY sort_order DESC LIMIT 1'
  ).get(totalEarned, totalEarned);
  return league ? league.name : 'Bronze';
}

router.post('/validate', (req, res) => {
  const { initData, startParam } = req.body;
  const botToken = process.env.BOT_TOKEN;

  let telegramUser;

  // In development mode without BOT_TOKEN, accept mock data
  if (!botToken && process.env.NODE_ENV === 'development') {
    telegramUser = req.body.mockUser;
    if (!telegramUser || !telegramUser.id) {
      return res.status(400).json({ error: 'Mock user data required in development mode' });
    }
  } else {
    if (!initData) {
      return res.status(400).json({ error: 'Missing initData' });
    }

    telegramUser = validateTelegramWebAppData(initData, botToken);
    if (!telegramUser) {
      return res.status(401).json({ error: 'Invalid Telegram init data' });
    }
  }

  const telegramId = String(telegramUser.id);

  // Find or create user
  let user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);

  if (!user) {
    const referralCode = generateReferralCode();

    db.prepare(
      `INSERT INTO users (telegram_id, username, first_name, last_name, is_premium, language_code, referral_code)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      telegramId,
      telegramUser.username || null,
      telegramUser.first_name || null,
      telegramUser.last_name || null,
      telegramUser.is_premium ? 1 : 0,
      telegramUser.language_code || 'en',
      referralCode
    );

    user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);

    // Create energy state
    const maxEnergyBase = parseInt(
      db.prepare("SELECT value FROM app_settings WHERE key = 'max_energy_base'").get()?.value || '500',
      10
    );
    db.prepare(
      'INSERT INTO energy_state (user_id, current_energy, max_energy) VALUES (?, ?, ?)'
    ).run(user.id, maxEnergyBase, maxEnergyBase);

    // Handle referral from startParam
    if (startParam) {
      const inviter = db.prepare('SELECT * FROM users WHERE referral_code = ?').get(startParam);
      if (inviter && inviter.id !== user.id) {
        const league = db.prepare('SELECT * FROM leagues WHERE name = ?').get(inviter.current_league);
        const bonusPct = league ? league.referral_bonus_pct : 5;
        const inviterReward = 1000 * (1 + bonusPct / 100);
        const inviteeReward = 500;

        db.prepare('UPDATE users SET referred_by = ? WHERE id = ?').run(inviter.id, user.id);
        db.prepare(
          'INSERT INTO referrals (inviter_id, invitee_id, inviter_reward, invitee_reward) VALUES (?, ?, ?, ?)'
        ).run(inviter.id, user.id, inviterReward, inviteeReward);

        db.prepare('UPDATE users SET balance = balance + ?, total_earned = total_earned + ? WHERE id = ?')
          .run(inviterReward, inviterReward, inviter.id);
        db.prepare('UPDATE users SET balance = balance + ?, total_earned = total_earned + ? WHERE id = ?')
          .run(inviteeReward, inviteeReward, user.id);

        // Update inviter league
        const updatedInviter = db.prepare('SELECT total_earned FROM users WHERE id = ?').get(inviter.id);
        const newLeague = getLeagueForScore(updatedInviter.total_earned);
        db.prepare('UPDATE users SET current_league = ? WHERE id = ?').run(newLeague, inviter.id);

        // Refresh user
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
      }
    }

    // Initialize onboarding task progress
    const onboardingTasks = db.prepare(
      "SELECT id FROM task_definitions WHERE category = 'onboarding' AND is_active = 1"
    ).all();
    const insertProgress = db.prepare(
      "INSERT INTO task_progress (user_id, task_id, status, progress, max_progress) VALUES (?, ?, 'pending', 0, 1)"
    );
    for (const task of onboardingTasks) {
      insertProgress.run(user.id, task.id);
    }
  } else {
    // Update existing user info
    db.prepare(
      `UPDATE users SET username = ?, first_name = ?, last_name = ?, is_premium = ?,
       language_code = ?, last_active_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      telegramUser.username || user.username,
      telegramUser.first_name || user.first_name,
      telegramUser.last_name || user.last_name,
      telegramUser.is_premium ? 1 : user.is_premium,
      telegramUser.language_code || user.language_code,
      user.id
    );

    user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  }

  // Create session
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  db.prepare(
    'INSERT INTO sessions (id, user_id, telegram_init_hash, expires_at) VALUES (?, ?, ?, ?)'
  ).run(sessionId, user.id, initData ? 'validated' : 'dev', expiresAt);

  // Get energy state
  const energy = db.prepare('SELECT * FROM energy_state WHERE user_id = ?').get(user.id);

  // Get league info
  const league = db.prepare('SELECT * FROM leagues WHERE name = ?').get(user.current_league);

  // Get active announcements
  const announcements = db.prepare(
    'SELECT id, title, content, type FROM announcements WHERE is_active = 1 ORDER BY created_at DESC LIMIT 5'
  ).all();

  res.json({
    token: sessionId,
    user: {
      id: user.id,
      telegram_id: user.telegram_id,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      is_premium: !!user.is_premium,
      balance: user.balance,
      total_earned: user.total_earned,
      current_league: user.current_league,
      rank: user.rank,
      referral_code: user.referral_code,
    },
    energy: energy ? {
      current: energy.current_energy,
      max: energy.max_energy,
      last_regen_at: energy.last_regen_at,
    } : null,
    league,
    announcements,
  });
});

module.exports = router;
