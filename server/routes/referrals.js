const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const userId = req.user.id;

  const referrals = db.prepare(
    `SELECT r.*, u.username, u.first_name, u.last_name
     FROM referrals r
     JOIN users u ON r.invitee_id = u.id
     WHERE r.inviter_id = ?
     ORDER BY r.created_at DESC`
  ).all(userId);

  const user = db.prepare('SELECT referral_code FROM users WHERE id = ?').get(userId);
  const totalRewards = db.prepare(
    'SELECT COALESCE(SUM(inviter_reward), 0) as total FROM referrals WHERE inviter_id = ?'
  ).get(userId);

  res.json({
    referral_code: user.referral_code,
    total_referrals: referrals.length,
    total_rewards: totalRewards.total,
    referrals: referrals.map((r) => ({
      id: r.id,
      username: r.username,
      first_name: r.first_name,
      last_name: r.last_name,
      reward: r.inviter_reward,
      created_at: r.created_at,
    })),
  });
});

router.post('/invite', (req, res) => {
  const userId = req.user.id;
  const user = db.prepare('SELECT referral_code FROM users WHERE id = ?').get(userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const botUsername = process.env.BOT_USERNAME || 'MinerKingdomBot';
  const inviteLink = `https://t.me/${botUsername}?start=${user.referral_code}`;

  res.json({
    referral_code: user.referral_code,
    invite_link: inviteLink,
  });
});

module.exports = router;
