import { Router, Response } from 'express';
import { AuthRequest, validateTelegramInitData, createSession, requireAuth } from '../auth';
import { getDb, generateReferralCode } from '../database';

const router = Router();

interface UserRow {
  id: number;
  telegram_id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  is_premium: number;
  photo_url: string | null;
  balance: number;
  total_earned: number;
  league: string;
  energy: number;
  max_energy: number;
  energy_regen_rate: number;
  last_energy_update: string | null;
  tap_power: number;
  referral_code: string;
  referred_by: number | null;
  squad_id: number | null;
  is_banned: number;
  fraud_score: number;
  created_at: string;
  updated_at: string;
}

function calculateCurrentEnergy(user: UserRow): number {
  if (!user.last_energy_update) return user.energy;
  const elapsed = (Date.now() - new Date(user.last_energy_update).getTime()) / 1000;
  const regenerated = Math.floor(elapsed * user.energy_regen_rate);
  return Math.min(user.max_energy, user.energy + regenerated);
}

function determineLeague(totalEarned: number): string {
  const db = getDb();
  const league = db.prepare(
    'SELECT name FROM leagues WHERE min_score <= ? ORDER BY min_score DESC LIMIT 1'
  ).get(totalEarned) as { name: string } | undefined;
  return league?.name || 'bronze';
}

// POST /api/auth/telegram
router.post('/auth/telegram', (req: AuthRequest, res: Response): void => {
  const { initData, referralCode } = req.body;

  if (!initData) {
    res.status(400).json({ error: 'initData is required' });
    return;
  }

  const botToken = process.env.BOT_TOKEN || '';

  // In development, allow bypassing validation
  let telegramUser;
  if (process.env.NODE_ENV === 'development' && !botToken) {
    try {
      const params = new URLSearchParams(initData);
      const userStr = params.get('user');
      telegramUser = userStr ? JSON.parse(userStr) : null;
    } catch {
      telegramUser = null;
    }
  } else {
    telegramUser = validateTelegramInitData(initData, botToken);
  }

  if (!telegramUser) {
    res.status(401).json({ error: 'Invalid Telegram init data' });
    return;
  }

  const db = getDb();

  let user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(
    String(telegramUser.id)
  ) as UserRow | undefined;

  if (user) {
    db.prepare(
      `UPDATE users SET username = ?, first_name = ?, last_name = ?, is_premium = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(
      telegramUser.username || null,
      telegramUser.first_name,
      telegramUser.last_name || null,
      telegramUser.is_premium ? 1 : 0,
      user.id
    );
  } else {
    const refCode = generateReferralCode();

    const result = db.prepare(
      `INSERT INTO users (telegram_id, username, first_name, last_name, is_premium, referral_code, last_energy_update)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    ).run(
      String(telegramUser.id),
      telegramUser.username || null,
      telegramUser.first_name,
      telegramUser.last_name || null,
      telegramUser.is_premium ? 1 : 0,
      refCode
    );

    user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as UserRow;

    // Handle referral
    if (referralCode) {
      const inviter = db.prepare('SELECT id FROM users WHERE referral_code = ?').get(referralCode) as { id: number } | undefined;
      if (inviter && inviter.id !== user.id) {
        db.prepare('UPDATE users SET referred_by = ? WHERE id = ?').run(inviter.id, user.id);
        const rewardAmount = telegramUser.is_premium ? 2500 : 500;
        db.prepare(
          'INSERT INTO referrals (inviter_id, invitee_id, reward_amount) VALUES (?, ?, ?)'
        ).run(inviter.id, user.id, rewardAmount);
      }
    }
  }

  const session = createSession(user.id);
  const currentEnergy = calculateCurrentEnergy(user);

  res.json({
    token: session.token,
    expiresAt: session.expiresAt,
    user: {
      id: user.id,
      telegramId: user.telegram_id,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      isPremium: !!user.is_premium,
      balance: user.balance,
      totalEarned: user.total_earned,
      league: user.league,
      energy: currentEnergy,
      maxEnergy: user.max_energy,
      energyRegenRate: user.energy_regen_rate,
      tapPower: user.tap_power,
      referralCode: user.referral_code,
      squadId: user.squad_id,
    },
  });
});

// GET /api/user/profile
router.get('/user/profile', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId) as UserRow;

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const currentEnergy = calculateCurrentEnergy(user);

  // Update energy in DB
  db.prepare(
    `UPDATE users SET energy = ?, last_energy_update = datetime('now') WHERE id = ?`
  ).run(currentEnergy, user.id);

  let squadInfo = null;
  if (user.squad_id) {
    squadInfo = db.prepare('SELECT id, name, emblem, member_count FROM squads WHERE id = ?').get(user.squad_id);
  }

  res.json({
    id: user.id,
    telegramId: user.telegram_id,
    username: user.username,
    firstName: user.first_name,
    lastName: user.last_name,
    isPremium: !!user.is_premium,
    balance: user.balance,
    totalEarned: user.total_earned,
    league: user.league,
    energy: currentEnergy,
    maxEnergy: user.max_energy,
    energyRegenRate: user.energy_regen_rate,
    tapPower: user.tap_power,
    referralCode: user.referral_code,
    squad: squadInfo,
  });
});

// GET /api/user/state
router.get('/user/state', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId) as UserRow;

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const currentEnergy = calculateCurrentEnergy(user);
  db.prepare(
    `UPDATE users SET energy = ?, last_energy_update = datetime('now') WHERE id = ?`
  ).run(currentEnergy, user.id);

  const upgrades = db.prepare(
    'SELECT upgrade_type, level FROM upgrades WHERE user_id = ?'
  ).all(req.userId);

  const activeBoosts = db.prepare(
    `SELECT boost_type, claimed_at, next_available FROM boost_claims 
     WHERE user_id = ? AND next_available > datetime('now')
     ORDER BY claimed_at DESC`
  ).all(req.userId);

  const taskProgress = db.prepare(
    `SELECT td.id, td.category, td.title, td.description, td.reward, td.type, td.target_value, td.icon,
            COALESCE(tp.progress, 0) as progress, COALESCE(tp.status, 'available') as status
     FROM task_definitions td
     LEFT JOIN task_progress tp ON td.id = tp.task_id AND tp.user_id = ?
     WHERE td.is_active = 1
     ORDER BY td.sort_order`
  ).all(req.userId);

  const dailyReward = db.prepare(
    'SELECT day_streak, last_claim FROM daily_rewards WHERE user_id = ?'
  ).get(req.userId) as { day_streak: number; last_claim: string | null } | undefined;

  const announcements = db.prepare(
    `SELECT id, title, content, type FROM announcements 
     WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > datetime('now'))
     ORDER BY created_at DESC LIMIT 5`
  ).all();

  res.json({
    user: {
      id: user.id,
      telegramId: user.telegram_id,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      isPremium: !!user.is_premium,
      balance: user.balance,
      totalEarned: user.total_earned,
      league: user.league,
      energy: currentEnergy,
      maxEnergy: user.max_energy,
      energyRegenRate: user.energy_regen_rate,
      tapPower: user.tap_power,
      referralCode: user.referral_code,
      squadId: user.squad_id,
    },
    upgrades,
    activeBoosts,
    tasks: taskProgress,
    dailyReward: dailyReward || { dayStreak: 0, lastClaim: null },
    announcements,
  });
});

export default router;
