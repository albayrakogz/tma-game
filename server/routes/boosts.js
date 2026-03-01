const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

function getSetting(key) {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

function getUpgradeLevel(userId, type) {
  const row = db.prepare(
    'SELECT level FROM upgrades WHERE user_id = ? AND upgrade_type = ? ORDER BY level DESC LIMIT 1'
  ).get(userId, type);
  return row ? row.level : 0;
}

function getLeagueForScore(totalEarned) {
  const league = db.prepare(
    'SELECT name FROM leagues WHERE min_score <= ? AND max_score >= ? ORDER BY sort_order DESC LIMIT 1'
  ).get(totalEarned, totalEarned);
  return league ? league.name : 'Bronze';
}

router.post('/claim', (req, res) => {
  const userId = req.user.id;
  const { boost_type } = req.body;

  if (!['full_energy', 'turbo'].includes(boost_type)) {
    return res.status(400).json({ error: 'Invalid boost type' });
  }

  const limitKey = boost_type === 'full_energy' ? 'full_energy_daily_limit' : 'turbo_daily_limit';
  const dailyLimit = parseInt(getSetting(limitKey) || '3', 10);

  // Count claims today
  const todayClaims = db.prepare(
    "SELECT COUNT(*) as cnt FROM boost_claims WHERE user_id = ? AND boost_type = ? AND claimed_at >= date('now')"
  ).get(userId, boost_type);

  if (todayClaims.cnt >= dailyLimit) {
    return res.status(400).json({
      error: `Daily ${boost_type} limit reached (${dailyLimit}/day)`,
      claims_today: todayClaims.cnt,
      limit: dailyLimit,
    });
  }

  if (boost_type === 'full_energy') {
    // Restore energy to max
    const energy = db.prepare('SELECT max_energy FROM energy_state WHERE user_id = ?').get(userId);
    if (!energy) return res.status(400).json({ error: 'Energy state not found' });

    db.prepare(
      "UPDATE energy_state SET current_energy = max_energy, last_regen_at = datetime('now') WHERE user_id = ?"
    ).run(userId);

    db.prepare(
      'INSERT INTO boost_claims (user_id, boost_type, expires_at) VALUES (?, ?, NULL)'
    ).run(userId, boost_type);

    return res.json({
      boost_type,
      energy: { current: energy.max_energy, max: energy.max_energy },
      claims_remaining: dailyLimit - todayClaims.cnt - 1,
    });
  }

  if (boost_type === 'turbo') {
    const duration = parseInt(getSetting('turbo_duration') || '10', 10);
    const expiresAt = new Date(Date.now() + duration * 1000).toISOString();

    db.prepare(
      'INSERT INTO boost_claims (user_id, boost_type, expires_at) VALUES (?, ?, ?)'
    ).run(userId, boost_type, expiresAt);

    return res.json({
      boost_type,
      expires_at: expiresAt,
      duration,
      multiplier: parseInt(getSetting('turbo_multiplier') || '5', 10),
      claims_remaining: dailyLimit - todayClaims.cnt - 1,
    });
  }
});

router.post('/upgrade', (req, res) => {
  const userId = req.user.id;
  const { upgrade_type } = req.body;

  const validTypes = [
    'multitap', 'energy_limit', 'regen_speed', 'auto_tap',
    'critical_tap', 'combo_multiplier', 'offline_earnings',
  ];

  if (!validTypes.includes(upgrade_type)) {
    return res.status(400).json({ error: 'Invalid upgrade type' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // League gating for certain upgrades
  const leagueGates = {
    auto_tap: 'Silver',
    critical_tap: 'Gold',
    combo_multiplier: 'Gold',
    offline_earnings: 'Platinum',
  };

  if (leagueGates[upgrade_type]) {
    const requiredLeague = db.prepare('SELECT sort_order FROM leagues WHERE name = ?')
      .get(leagueGates[upgrade_type]);
    const userLeague = db.prepare('SELECT sort_order FROM leagues WHERE name = ?')
      .get(user.current_league);

    if (requiredLeague && userLeague && userLeague.sort_order < requiredLeague.sort_order) {
      return res.status(400).json({
        error: `Requires ${leagueGates[upgrade_type]} league or higher`,
      });
    }
  }

  const currentLevel = getUpgradeLevel(userId, upgrade_type);
  const basePrice = parseInt(getSetting(`${upgrade_type}_base_price`) || '100', 10);
  const cost = basePrice * Math.pow(2, currentLevel);

  if (user.balance < cost) {
    return res.status(400).json({
      error: 'Insufficient balance',
      cost,
      balance: user.balance,
    });
  }

  // Deduct balance
  db.prepare("UPDATE users SET balance = balance - ?, updated_at = datetime('now') WHERE id = ?")
    .run(cost, userId);

  // Insert or update upgrade
  const newLevel = currentLevel + 1;
  if (currentLevel === 0) {
    db.prepare('INSERT INTO upgrades (user_id, upgrade_type, level) VALUES (?, ?, ?)')
      .run(userId, upgrade_type, newLevel);
  } else {
    db.prepare('UPDATE upgrades SET level = ?, purchased_at = datetime(\'now\') WHERE user_id = ? AND upgrade_type = ?')
      .run(newLevel, userId, upgrade_type);
  }

  // Apply energy_limit upgrade immediately
  if (upgrade_type === 'energy_limit') {
    const maxEnergyBase = parseInt(getSetting('max_energy_base') || '500', 10);
    const newMaxEnergy = maxEnergyBase + newLevel * 100;
    db.prepare('UPDATE energy_state SET max_energy = ? WHERE user_id = ?')
      .run(newMaxEnergy, userId);
  }

  const updatedUser = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId);
  const nextCost = basePrice * Math.pow(2, newLevel);

  res.json({
    upgrade_type,
    new_level: newLevel,
    cost,
    balance: updatedUser.balance,
    next_cost: nextCost,
  });
});

module.exports = router;
