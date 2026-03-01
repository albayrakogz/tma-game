const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Anti-abuse constants
const MAX_TAPS_PER_REQUEST = 20;
const MIN_TAP_INTERVAL_MS = 100;

// In-memory rate limit tracker: userId -> lastTapTime
const lastTapTimes = new Map();

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

function hasTurboActive(userId) {
  const row = db.prepare(
    "SELECT id FROM boost_claims WHERE user_id = ? AND boost_type = 'turbo' AND expires_at > datetime('now') LIMIT 1"
  ).get(userId);
  return !!row;
}

function calculateEnergy(userId) {
  const energyState = db.prepare('SELECT * FROM energy_state WHERE user_id = ?').get(userId);
  if (!energyState) return null;

  const regenRate = parseInt(getSetting('energy_regen_rate') || '1', 10);
  const regenSpeedLevel = getUpgradeLevel(userId, 'regen_speed');
  const effectiveRegenRate = regenRate + regenSpeedLevel;

  const lastRegen = new Date(energyState.last_regen_at + 'Z').getTime();
  const now = Date.now();
  const elapsedSeconds = Math.floor((now - lastRegen) / 1000);
  const regenAmount = elapsedSeconds * effectiveRegenRate;

  const currentEnergy = Math.min(
    energyState.current_energy + regenAmount,
    energyState.max_energy
  );

  return {
    current: currentEnergy,
    max: energyState.max_energy,
    last_regen_at: energyState.last_regen_at,
    effective_regen_rate: effectiveRegenRate,
  };
}

function getLeagueForScore(totalEarned) {
  const league = db.prepare(
    'SELECT name FROM leagues WHERE min_score <= ? AND max_score >= ? ORDER BY sort_order DESC LIMIT 1'
  ).get(totalEarned, totalEarned);
  return league ? league.name : 'Bronze';
}

router.get('/state', (req, res) => {
  const userId = req.user.id;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const energy = calculateEnergy(userId);
  const upgrades = db.prepare('SELECT upgrade_type, level FROM upgrades WHERE user_id = ?').all(userId);
  const activeBoosts = db.prepare(
    "SELECT boost_type, expires_at FROM boost_claims WHERE user_id = ? AND expires_at > datetime('now')"
  ).all(userId);
  const league = db.prepare('SELECT * FROM leagues WHERE name = ?').get(user.current_league);

  const baseTap = parseInt(getSetting('base_tap_value') || '1', 10);
  const multitapLevel = getUpgradeLevel(userId, 'multitap');
  const tapValue = baseTap * (1 + multitapLevel);
  const turboActive = hasTurboActive(userId);
  const turboMultiplier = parseInt(getSetting('turbo_multiplier') || '5', 10);

  res.json({
    user: {
      id: user.id,
      telegram_id: user.telegram_id,
      username: user.username,
      first_name: user.first_name,
      balance: user.balance,
      total_earned: user.total_earned,
      current_league: user.current_league,
      rank: user.rank,
    },
    energy,
    upgrades,
    active_boosts: activeBoosts,
    league,
    tap_value: tapValue * (turboActive ? turboMultiplier : 1),
    turbo_active: turboActive,
  });
});

router.post('/tap', (req, res) => {
  const userId = req.user.id;

  if (req.user.is_restricted) {
    return res.status(403).json({ error: 'Account restricted' });
  }

  let { taps } = req.body;
  taps = parseInt(taps, 10);
  if (!taps || taps < 1) {
    return res.status(400).json({ error: 'Invalid tap count' });
  }

  // Cap taps per request to prevent abuse
  if (taps > MAX_TAPS_PER_REQUEST) taps = MAX_TAPS_PER_REQUEST;

  // Rate limiting: enforce minimum interval between tap requests
  const now = Date.now();
  const lastTap = lastTapTimes.get(userId);
  if (lastTap && now - lastTap < MIN_TAP_INTERVAL_MS) {
    // Flag suspicious activity
    db.prepare('UPDATE users SET fraud_score = fraud_score + 1 WHERE id = ?').run(userId);

    const user = db.prepare('SELECT fraud_score FROM users WHERE id = ?').get(userId);
    if (user && user.fraud_score >= 50) {
      db.prepare('UPDATE users SET is_restricted = 1 WHERE id = ?').run(userId);
      db.prepare(
        "INSERT INTO fraud_flags (user_id, flag_type, details) VALUES (?, 'rate_abuse', ?)"
      ).run(userId, `Fraud score reached ${user.fraud_score}`);
    }

    return res.status(429).json({ error: 'Too many requests, slow down' });
  }
  lastTapTimes.set(userId, now);

  // Calculate energy
  const energyState = db.prepare('SELECT * FROM energy_state WHERE user_id = ?').get(userId);
  if (!energyState) return res.status(400).json({ error: 'Energy state not found' });

  const regenRate = parseInt(getSetting('energy_regen_rate') || '1', 10);
  const regenSpeedLevel = getUpgradeLevel(userId, 'regen_speed');
  const effectiveRegenRate = regenRate + regenSpeedLevel;

  const lastRegen = new Date(energyState.last_regen_at + 'Z').getTime();
  const elapsedSeconds = Math.floor((now - lastRegen) / 1000);
  const regenAmount = elapsedSeconds * effectiveRegenRate;
  const currentEnergy = Math.min(energyState.current_energy + regenAmount, energyState.max_energy);

  // Check energy
  const baseTap = parseInt(getSetting('base_tap_value') || '1', 10);
  const multitapLevel = getUpgradeLevel(userId, 'multitap');
  const tapValue = baseTap * (1 + multitapLevel);
  const turboActive = hasTurboActive(userId);
  const turboMultiplier = parseInt(getSetting('turbo_multiplier') || '5', 10);
  const reward = taps * tapValue * (turboActive ? turboMultiplier : 1);

  const energyCost = taps; // 1 energy per tap
  if (currentEnergy < energyCost) {
    return res.status(400).json({
      error: 'Insufficient energy',
      current_energy: currentEnergy,
      required: energyCost,
    });
  }

  const newEnergy = currentEnergy - energyCost;

  // Update energy
  db.prepare(
    "UPDATE energy_state SET current_energy = ?, last_regen_at = datetime('now') WHERE user_id = ?"
  ).run(newEnergy, userId);

  // Update balance
  db.prepare(
    "UPDATE users SET balance = balance + ?, total_earned = total_earned + ?, last_active_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
  ).run(reward, reward, userId);

  // Update league
  const user = db.prepare('SELECT total_earned FROM users WHERE id = ?').get(userId);
  const newLeague = getLeagueForScore(user.total_earned);
  db.prepare('UPDATE users SET current_league = ? WHERE id = ?').run(newLeague, userId);

  // Update squad contribution if in a squad
  const membership = db.prepare('SELECT squad_id FROM squad_memberships WHERE user_id = ?').get(userId);
  if (membership) {
    db.prepare('UPDATE squad_memberships SET contribution = contribution + ? WHERE user_id = ?')
      .run(reward, userId);
    db.prepare('UPDATE squads SET total_score = total_score + ? WHERE id = ?')
      .run(reward, membership.squad_id);
  }

  // Audit log
  db.prepare(
    "INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, 'tap', ?, ?)"
  ).run(userId, JSON.stringify({ taps, reward, energy_before: currentEnergy, energy_after: newEnergy }), req.ip);

  const updatedUser = db.prepare('SELECT balance, total_earned, current_league FROM users WHERE id = ?').get(userId);

  res.json({
    reward,
    balance: updatedUser.balance,
    total_earned: updatedUser.total_earned,
    current_league: updatedUser.current_league,
    energy: {
      current: newEnergy,
      max: energyState.max_energy,
    },
    turbo_active: turboActive,
  });
});

module.exports = router;
