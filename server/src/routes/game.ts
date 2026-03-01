import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../auth';
import { getDb } from '../database';

const router = Router();

interface UserRow {
  id: number;
  balance: number;
  total_earned: number;
  energy: number;
  max_energy: number;
  energy_regen_rate: number;
  last_energy_update: string | null;
  tap_power: number;
  league: string;
  fraud_score: number;
}

const UPGRADE_BASE_PRICES: Record<string, number> = {
  multitap: 500,
  energy_limit: 500,
  regen_speed: 1000,
  auto_tap: 5000,
  critical_tap: 2000,
  combo_multiplier: 3000,
};

const MAX_UPGRADE_LEVEL = 20;

// Rate limiting store
const tapRateMap = new Map<number, number[]>();

function calculateCurrentEnergy(user: UserRow): number {
  if (!user.last_energy_update) return user.energy;
  const elapsed = (Date.now() - new Date(user.last_energy_update).getTime()) / 1000;
  const regenerated = Math.floor(elapsed * user.energy_regen_rate);
  return Math.min(user.max_energy, user.energy + regenerated);
}

function getUpgradePrice(upgradeType: string, currentLevel: number): number {
  const base = UPGRADE_BASE_PRICES[upgradeType] || 1000;
  return Math.floor(base * Math.pow(1.5, currentLevel));
}

function determineLeague(totalEarned: number): string {
  const db = getDb();
  const league = db.prepare(
    'SELECT name FROM leagues WHERE min_score <= ? ORDER BY min_score DESC LIMIT 1'
  ).get(totalEarned) as { name: string } | undefined;
  return league?.name || 'bronze';
}

// POST /api/game/tap
router.post('/game/tap', requireAuth, (req: AuthRequest, res: Response): void => {
  const { count } = req.body;
  const userId = req.userId!;

  if (!count || typeof count !== 'number' || count < 1) {
    res.status(400).json({ error: 'Invalid tap count' });
    return;
  }

  if (count > 20) {
    // Flag for fraud
    const db = getDb();
    db.prepare(
      'INSERT INTO fraud_flags (user_id, flag_type, details) VALUES (?, ?, ?)'
    ).run(userId, 'excessive_taps', `Attempted ${count} taps in single request`);
    db.prepare('UPDATE users SET fraud_score = fraud_score + 5 WHERE id = ?').run(userId);
    res.status(400).json({ error: 'Too many taps in single request' });
    return;
  }

  // Rate limiting: max 15 taps/sec
  const now = Date.now();
  const userTaps = tapRateMap.get(userId) || [];
  const recentTaps = userTaps.filter(t => t > now - 1000);
  if (recentTaps.length + count > 15) {
    res.status(429).json({ error: 'Rate limit exceeded. Max 15 taps per second.' });
    return;
  }
  for (let i = 0; i < count; i++) {
    recentTaps.push(now);
  }
  tapRateMap.set(userId, recentTaps);

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRow;

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const currentEnergy = calculateCurrentEnergy(user);

  if (currentEnergy < count) {
    res.status(400).json({ error: 'Not enough energy', currentEnergy });
    return;
  }

  // Calculate coins earned with tap_power
  const coinsEarned = count * user.tap_power;
  const energySpent = count;
  const newEnergy = currentEnergy - energySpent;
  const newBalance = user.balance + coinsEarned;
  const newTotalEarned = user.total_earned + coinsEarned;
  const newLeague = determineLeague(newTotalEarned);

  const updateUser = db.prepare(
    `UPDATE users SET balance = ?, total_earned = ?, energy = ?, last_energy_update = datetime('now'), league = ?, updated_at = datetime('now') WHERE id = ?`
  );
  updateUser.run(newBalance, newTotalEarned, newEnergy, newLeague, userId);

  db.prepare(
    'INSERT INTO tap_events (user_id, taps, coins_earned, energy_spent) VALUES (?, ?, ?, ?)'
  ).run(userId, count, coinsEarned, energySpent);

  // Update squad contribution if in a squad
  {
    const membership = db.prepare(
      'SELECT squad_id FROM squad_memberships WHERE user_id = ?'
    ).get(userId) as { squad_id: number } | undefined;
    if (membership) {
      db.prepare('UPDATE squad_memberships SET contribution = contribution + ? WHERE user_id = ?').run(coinsEarned, userId);
      db.prepare('UPDATE squads SET total_score = total_score + ? WHERE id = ?').run(coinsEarned, membership.squad_id);
    }
  }

  res.json({
    balance: newBalance,
    totalEarned: newTotalEarned,
    energy: newEnergy,
    maxEnergy: user.max_energy,
    coinsEarned,
    league: newLeague,
  });
});

// POST /api/game/claim-daily
router.post('/game/claim-daily', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const userId = req.userId!;

  const dailyReward = db.prepare(
    'SELECT day_streak, last_claim FROM daily_rewards WHERE user_id = ?'
  ).get(userId) as { day_streak: number; last_claim: string | null } | undefined;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  if (dailyReward?.last_claim) {
    const lastClaimDate = dailyReward.last_claim.split('T')[0];
    if (lastClaimDate === todayStr) {
      res.status(400).json({ error: 'Daily reward already claimed today' });
      return;
    }
  }

  let newStreak = 1;
  if (dailyReward?.last_claim) {
    const lastClaim = new Date(dailyReward.last_claim);
    const diffDays = Math.floor((now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      newStreak = dailyReward.day_streak + 1;
    }
  }

  const baseReward = 100;
  const streakBonus = 50;
  const reward = baseReward + (newStreak - 1) * streakBonus;

  if (dailyReward) {
    db.prepare(
      'UPDATE daily_rewards SET day_streak = ?, last_claim = ? WHERE user_id = ?'
    ).run(newStreak, now.toISOString(), userId);
  } else {
    db.prepare(
      'INSERT INTO daily_rewards (user_id, day_streak, last_claim) VALUES (?, ?, ?)'
    ).run(userId, newStreak, now.toISOString());
  }

  db.prepare(
    `UPDATE users SET balance = balance + ?, total_earned = total_earned + ?, updated_at = datetime('now') WHERE id = ?`
  ).run(reward, reward, userId);

  const user = db.prepare('SELECT balance, total_earned FROM users WHERE id = ?').get(userId) as {
    balance: number;
    total_earned: number;
  };

  res.json({
    reward,
    streak: newStreak,
    balance: user.balance,
    totalEarned: user.total_earned,
  });
});

// POST /api/game/boost/claim
router.post('/game/boost/claim', requireAuth, (req: AuthRequest, res: Response): void => {
  const { boostType } = req.body;
  const userId = req.userId!;

  if (!['full_energy', 'turbo'].includes(boostType)) {
    res.status(400).json({ error: 'Invalid boost type' });
    return;
  }

  const db = getDb();

  // Check cooldown
  const lastClaim = db.prepare(
    `SELECT next_available FROM boost_claims 
     WHERE user_id = ? AND boost_type = ? 
     ORDER BY claimed_at DESC LIMIT 1`
  ).get(userId, boostType) as { next_available: string } | undefined;

  if (lastClaim && new Date(lastClaim.next_available) > new Date()) {
    res.status(400).json({
      error: 'Boost on cooldown',
      nextAvailable: lastClaim.next_available,
    });
    return;
  }

  const cooldownSetting = db.prepare("SELECT value FROM app_settings WHERE key = 'boost_cooldown_hours'").get() as { value: string } | undefined;
  const cooldownHours = cooldownSetting ? parseInt(cooldownSetting.value, 10) : 8;
  const nextAvailable = new Date(Date.now() + cooldownHours * 60 * 60 * 1000).toISOString();

  db.prepare(
    'INSERT INTO boost_claims (user_id, boost_type, next_available) VALUES (?, ?, ?)'
  ).run(userId, boostType, nextAvailable);

  if (boostType === 'full_energy') {
    const user = db.prepare('SELECT max_energy FROM users WHERE id = ?').get(userId) as { max_energy: number };
    db.prepare(
      `UPDATE users SET energy = ?, last_energy_update = datetime('now') WHERE id = ?`
    ).run(user.max_energy, userId);

    res.json({ boostType, energy: user.max_energy, nextAvailable });
  } else {
    // turbo - handled client-side, just record the claim
    res.json({ boostType, duration: 10, multiplier: 5, nextAvailable });
  }
});

// POST /api/game/upgrade/buy
router.post('/game/upgrade/buy', requireAuth, (req: AuthRequest, res: Response): void => {
  const { upgradeType } = req.body;
  const userId = req.userId!;

  if (!UPGRADE_BASE_PRICES[upgradeType]) {
    res.status(400).json({ error: 'Invalid upgrade type' });
    return;
  }

  const db = getDb();
  const user = db.prepare('SELECT balance, max_energy, tap_power, energy_regen_rate FROM users WHERE id = ?').get(userId) as {
    balance: number;
    max_energy: number;
    tap_power: number;
    energy_regen_rate: number;
  };

  const existing = db.prepare(
    'SELECT level FROM upgrades WHERE user_id = ? AND upgrade_type = ?'
  ).get(userId, upgradeType) as { level: number } | undefined;

  const currentLevel = existing?.level || 0;

  if (currentLevel >= MAX_UPGRADE_LEVEL) {
    res.status(400).json({ error: 'Upgrade already at max level' });
    return;
  }

  const price = getUpgradePrice(upgradeType, currentLevel);

  if (user.balance < price) {
    res.status(400).json({ error: 'Insufficient balance', required: price, current: user.balance });
    return;
  }

  const newLevel = currentLevel + 1;

  db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(price, userId);

  if (existing) {
    db.prepare(
      `UPDATE upgrades SET level = ?, updated_at = datetime('now') WHERE user_id = ? AND upgrade_type = ?`
    ).run(newLevel, userId, upgradeType);
  } else {
    db.prepare(
      'INSERT INTO upgrades (user_id, upgrade_type, level) VALUES (?, ?, ?)'
    ).run(userId, upgradeType, newLevel);
  }

  // Apply upgrade effects
  switch (upgradeType) {
    case 'multitap':
      db.prepare('UPDATE users SET tap_power = ? WHERE id = ?').run(1 + newLevel, userId);
      break;
    case 'energy_limit':
      db.prepare('UPDATE users SET max_energy = ? WHERE id = ?').run(500 + newLevel * 100, userId);
      break;
    case 'regen_speed':
      db.prepare('UPDATE users SET energy_regen_rate = ? WHERE id = ?').run(1 + newLevel, userId);
      break;
  }

  const updatedUser = db.prepare('SELECT balance, tap_power, max_energy, energy_regen_rate FROM users WHERE id = ?').get(userId);

  res.json({
    upgradeType,
    newLevel,
    price,
    nextPrice: newLevel < MAX_UPGRADE_LEVEL ? getUpgradePrice(upgradeType, newLevel) : null,
    user: updatedUser,
  });
});

// GET /api/game/upgrades
router.get('/game/upgrades', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const userId = req.userId!;

  const userUpgrades = db.prepare(
    'SELECT upgrade_type, level FROM upgrades WHERE user_id = ?'
  ).all(userId) as { upgrade_type: string; level: number }[];

  const upgradeMap: Record<string, number> = {};
  for (const u of userUpgrades) {
    upgradeMap[u.upgrade_type] = u.level;
  }

  const upgrades = Object.entries(UPGRADE_BASE_PRICES).map(([type, basePrice]) => {
    const level = upgradeMap[type] || 0;
    return {
      type,
      level,
      maxLevel: MAX_UPGRADE_LEVEL,
      currentPrice: level < MAX_UPGRADE_LEVEL ? getUpgradePrice(type, level) : null,
      basePrice,
    };
  });

  res.json({ upgrades });
});

export default router;
