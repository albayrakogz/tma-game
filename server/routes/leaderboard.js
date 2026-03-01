const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const { type = 'global', period = 'alltime', page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const limitNum = Math.min(parseInt(limit, 10), 100);

  if (type === 'global') {
    const users = db.prepare(
      `SELECT id, username, first_name, total_earned, current_league
       FROM users
       WHERE is_restricted = 0
       ORDER BY total_earned DESC
       LIMIT ? OFFSET ?`
    ).all(limitNum, offset);

    const total = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE is_restricted = 0').get();

    res.json({
      type: 'global',
      period,
      leaderboard: users.map((u, i) => ({
        rank: offset + i + 1,
        user_id: u.id,
        username: u.username,
        first_name: u.first_name,
        score: u.total_earned,
        league: u.current_league,
      })),
      total: total.cnt,
      page: parseInt(page, 10),
    });
  } else if (type === 'squad') {
    const squads = db.prepare(
      `SELECT id, name, emblem, total_score, member_count, league
       FROM squads
       ORDER BY total_score DESC
       LIMIT ? OFFSET ?`
    ).all(limitNum, offset);

    const total = db.prepare('SELECT COUNT(*) as cnt FROM squads').get();

    res.json({
      type: 'squad',
      leaderboard: squads.map((s, i) => ({
        rank: offset + i + 1,
        squad_id: s.id,
        name: s.name,
        emblem: s.emblem,
        score: s.total_score,
        member_count: s.member_count,
        league: s.league,
      })),
      total: total.cnt,
      page: parseInt(page, 10),
    });
  } else if (type === 'friends') {
    const userId = req.user.id;

    // Friends = users referred by the current user + users who referred the current user
    const friends = db.prepare(
      `SELECT u.id, u.username, u.first_name, u.total_earned, u.current_league
       FROM users u
       WHERE u.id IN (
         SELECT invitee_id FROM referrals WHERE inviter_id = ?
         UNION
         SELECT inviter_id FROM referrals WHERE invitee_id = ?
       )
       AND u.is_restricted = 0
       ORDER BY u.total_earned DESC
       LIMIT ? OFFSET ?`
    ).all(userId, userId, limitNum, offset);

    res.json({
      type: 'friends',
      leaderboard: friends.map((u, i) => ({
        rank: offset + i + 1,
        user_id: u.id,
        username: u.username,
        first_name: u.first_name,
        score: u.total_earned,
        league: u.current_league,
      })),
      page: parseInt(page, 10),
    });
  } else {
    return res.status(400).json({ error: 'Invalid leaderboard type. Use: global, squad, friends' });
  }
});

module.exports = router;
