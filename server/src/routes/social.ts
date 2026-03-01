import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../auth';
import { getDb } from '../database';

const router = Router();

// GET /api/referral/info
router.get('/referral/info', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const user = db.prepare('SELECT referral_code, is_premium FROM users WHERE id = ?').get(req.userId) as {
    referral_code: string;
    is_premium: number;
  };

  const botUsername = process.env.BOT_USERNAME || 'TapRealmBot';
  const inviteLink = `https://t.me/${botUsername}?start=${user.referral_code}`;

  const referralCount = db.prepare(
    'SELECT COUNT(*) as count FROM referrals WHERE inviter_id = ?'
  ).get(req.userId) as { count: number };

  const totalRewardsEarned = db.prepare(
    'SELECT COALESCE(SUM(reward_amount), 0) as total FROM referrals WHERE inviter_id = ? AND reward_claimed = 1'
  ).get(req.userId) as { total: number };

  res.json({
    referralCode: user.referral_code,
    inviteLink,
    totalReferrals: referralCount.count,
    totalRewardsEarned: totalRewardsEarned.total,
    rewardPerRegular: 500,
    rewardPerPremium: 2500,
  });
});

// GET /api/referral/friends
router.get('/referral/friends', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const friends = db.prepare(
    `SELECT r.id as referral_id, r.reward_claimed, r.reward_amount, r.created_at,
            u.username, u.first_name, u.is_premium, u.total_earned
     FROM referrals r
     JOIN users u ON r.invitee_id = u.id
     WHERE r.inviter_id = ?
     ORDER BY r.created_at DESC`
  ).all(req.userId);

  res.json({ friends });
});

// POST /api/referral/claim
router.post('/referral/claim', requireAuth, (req: AuthRequest, res: Response): void => {
  const { referralId } = req.body;
  const db = getDb();

  const referral = db.prepare(
    'SELECT * FROM referrals WHERE id = ? AND inviter_id = ?'
  ).get(referralId, req.userId) as {
    id: number;
    inviter_id: number;
    invitee_id: number;
    reward_claimed: number;
    reward_amount: number;
  } | undefined;

  if (!referral) {
    res.status(404).json({ error: 'Referral not found' });
    return;
  }

  if (referral.reward_claimed) {
    res.status(400).json({ error: 'Reward already claimed' });
    return;
  }

  const reward = referral.reward_amount || 500;

  db.prepare('UPDATE referrals SET reward_claimed = 1 WHERE id = ?').run(referralId);
  db.prepare(
    `UPDATE users SET balance = balance + ?, total_earned = total_earned + ?, updated_at = datetime('now') WHERE id = ?`
  ).run(reward, reward, req.userId);

  const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.userId) as { balance: number };

  res.json({ reward, balance: user.balance });
});

// POST /api/squad/create
router.post('/squad/create', requireAuth, (req: AuthRequest, res: Response): void => {
  const { name, description, emblem } = req.body;
  const userId = req.userId!;
  const db = getDb();

  if (!name || name.length < 3 || name.length > 30) {
    res.status(400).json({ error: 'Squad name must be 3-30 characters' });
    return;
  }

  // Check if user already in a squad
  const existingMembership = db.prepare(
    'SELECT id FROM squad_memberships WHERE user_id = ?'
  ).get(userId);

  if (existingMembership) {
    res.status(400).json({ error: 'You must leave your current squad first' });
    return;
  }

  try {
    const result = db.prepare(
      'INSERT INTO squads (name, description, emblem, leader_id, member_count) VALUES (?, ?, ?, ?, 1)'
    ).run(name, description || null, emblem || '🛡️', userId);

    const squadId = result.lastInsertRowid as number;

    db.prepare(
      'INSERT INTO squad_memberships (squad_id, user_id, role) VALUES (?, ?, ?)'
    ).run(squadId, userId, 'leader');

    db.prepare('UPDATE users SET squad_id = ? WHERE id = ?').run(squadId, userId);

    const squad = db.prepare('SELECT * FROM squads WHERE id = ?').get(squadId);
    res.json({ squad });
  } catch (err: unknown) {
    const error = err as { message?: string };
    if (error.message?.includes('UNIQUE')) {
      res.status(400).json({ error: 'Squad name already taken' });
    } else {
      res.status(500).json({ error: 'Failed to create squad' });
    }
  }
});

// POST /api/squad/join/:id
router.post('/squad/join/:id', requireAuth, (req: AuthRequest, res: Response): void => {
  const squadId = parseInt(req.params.id as string, 10);
  const userId = req.userId!;
  const db = getDb();

  const squad = db.prepare('SELECT * FROM squads WHERE id = ?').get(squadId) as { id: number; name: string } | undefined;
  if (!squad) {
    res.status(404).json({ error: 'Squad not found' });
    return;
  }

  const existingMembership = db.prepare(
    'SELECT id FROM squad_memberships WHERE user_id = ?'
  ).get(userId);

  if (existingMembership) {
    res.status(400).json({ error: 'You must leave your current squad first' });
    return;
  }

  db.prepare(
    'INSERT INTO squad_memberships (squad_id, user_id, role) VALUES (?, ?, ?)'
  ).run(squadId, userId, 'member');

  db.prepare('UPDATE squads SET member_count = member_count + 1 WHERE id = ?').run(squadId);
  db.prepare('UPDATE users SET squad_id = ? WHERE id = ?').run(squadId, userId);

  res.json({ message: 'Joined squad successfully', squadId });
});

// POST /api/squad/leave
router.post('/squad/leave', requireAuth, (req: AuthRequest, res: Response): void => {
  const userId = req.userId!;
  const db = getDb();

  const membership = db.prepare(
    'SELECT squad_id, role FROM squad_memberships WHERE user_id = ?'
  ).get(userId) as { squad_id: number; role: string } | undefined;

  if (!membership) {
    res.status(400).json({ error: 'Not in a squad' });
    return;
  }

  if (membership.role === 'leader') {
    // Transfer leadership or disband
    const nextMember = db.prepare(
      'SELECT user_id FROM squad_memberships WHERE squad_id = ? AND user_id != ? LIMIT 1'
    ).get(membership.squad_id, userId) as { user_id: number } | undefined;

    if (nextMember) {
      db.prepare('UPDATE squad_memberships SET role = ? WHERE user_id = ?').run('leader', nextMember.user_id);
      db.prepare('UPDATE squads SET leader_id = ? WHERE id = ?').run(nextMember.user_id, membership.squad_id);
    } else {
      // Disband squad
      db.prepare('DELETE FROM squads WHERE id = ?').run(membership.squad_id);
    }
  }

  db.prepare('DELETE FROM squad_memberships WHERE user_id = ?').run(userId);
  db.prepare('UPDATE squads SET member_count = member_count - 1 WHERE id = ?').run(membership.squad_id);
  db.prepare('UPDATE users SET squad_id = NULL WHERE id = ?').run(userId);

  res.json({ message: 'Left squad successfully' });
});

// GET /api/squad/:id
router.get('/squad/:id', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const squad = db.prepare(
    `SELECT s.*, u.username as leader_username, u.first_name as leader_first_name
     FROM squads s
     JOIN users u ON s.leader_id = u.id
     WHERE s.id = ?`
  ).get(parseInt(req.params.id as string, 10));

  if (!squad) {
    res.status(404).json({ error: 'Squad not found' });
    return;
  }

  res.json({ squad });
});

// GET /api/squad/:id/members
router.get('/squad/:id/members', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const members = db.prepare(
    `SELECT sm.role, sm.contribution, sm.joined_at,
            u.id, u.username, u.first_name, u.total_earned, u.league
     FROM squad_memberships sm
     JOIN users u ON sm.user_id = u.id
     WHERE sm.squad_id = ?
     ORDER BY sm.contribution DESC`
  ).all(parseInt(req.params.id as string, 10));

  res.json({ members });
});

// GET /api/leaderboard/global
router.get('/leaderboard/global', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const leaderboard = db.prepare(
    `SELECT id, username, first_name, total_earned, league
     FROM users
     WHERE is_banned = 0
     ORDER BY total_earned DESC
     LIMIT 100`
  ).all();

  // Get requesting user's rank
  const userRank = db.prepare(
    `SELECT COUNT(*) + 1 as rank FROM users 
     WHERE total_earned > (SELECT total_earned FROM users WHERE id = ?) AND is_banned = 0`
  ).get(req.userId) as { rank: number };

  res.json({ leaderboard, userRank: userRank.rank });
});

// GET /api/leaderboard/league/:league
router.get('/leaderboard/league/:league', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const { league } = req.params;

  const leaderboard = db.prepare(
    `SELECT id, username, first_name, total_earned, league
     FROM users
     WHERE league = ? AND is_banned = 0
     ORDER BY total_earned DESC
     LIMIT 100`
  ).all(league);

  res.json({ leaderboard, league });
});

// GET /api/leaderboard/squad
router.get('/leaderboard/squad', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const leaderboard = db.prepare(
    `SELECT s.id, s.name, s.emblem, s.total_score, s.member_count, s.league,
            u.username as leader_username
     FROM squads s
     JOIN users u ON s.leader_id = u.id
     ORDER BY s.total_score DESC
     LIMIT 100`
  ).all();

  res.json({ leaderboard });
});

export default router;
