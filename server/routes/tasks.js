const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const userId = req.user.id;
  const user = db.prepare('SELECT current_league FROM users WHERE id = ?').get(userId);
  const userLeague = db.prepare('SELECT sort_order FROM leagues WHERE name = ?').get(user.current_league);
  const userLeagueOrder = userLeague ? userLeague.sort_order : 0;

  const tasks = db.prepare(
    `SELECT td.*, tp.status, tp.progress, tp.max_progress, tp.claimed_at
     FROM task_definitions td
     LEFT JOIN task_progress tp ON tp.task_id = td.id AND tp.user_id = ?
     WHERE td.is_active = 1
     ORDER BY td.category, td.sort_order`
  ).all(userId);

  const result = tasks.map((task) => {
    let status = task.status || 'locked';
    // Check league requirement
    if (task.required_league) {
      const reqLeague = db.prepare('SELECT sort_order FROM leagues WHERE name = ?').get(task.required_league);
      if (reqLeague && userLeagueOrder < reqLeague.sort_order) {
        status = 'locked';
      }
    }

    return {
      id: task.id,
      category: task.category,
      title: task.title,
      description: task.description,
      reward: task.reward,
      icon: task.icon,
      action_type: task.action_type,
      action_url: task.action_url,
      required_league: task.required_league,
      status,
      progress: task.progress || 0,
      max_progress: task.max_progress || 1,
    };
  });

  res.json({ tasks: result });
});

router.post('/claim', (req, res) => {
  const userId = req.user.id;
  const { task_id } = req.body;

  if (!task_id) {
    return res.status(400).json({ error: 'Missing task_id' });
  }

  const task = db.prepare('SELECT * FROM task_definitions WHERE id = ? AND is_active = 1').get(task_id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  // Check league requirement
  if (task.required_league) {
    const user = db.prepare('SELECT current_league FROM users WHERE id = ?').get(userId);
    const reqLeague = db.prepare('SELECT sort_order FROM leagues WHERE name = ?').get(task.required_league);
    const userLeague = db.prepare('SELECT sort_order FROM leagues WHERE name = ?').get(user.current_league);
    if (reqLeague && userLeague && userLeague.sort_order < reqLeague.sort_order) {
      return res.status(400).json({ error: `Requires ${task.required_league} league` });
    }
  }

  let progress = db.prepare(
    'SELECT * FROM task_progress WHERE user_id = ? AND task_id = ?'
  ).get(userId, task_id);

  if (!progress) {
    // Create progress entry as claimable (assume external validation)
    db.prepare(
      "INSERT INTO task_progress (user_id, task_id, status, progress, max_progress) VALUES (?, ?, 'claimable', 1, 1)"
    ).run(userId, task_id);
    progress = db.prepare('SELECT * FROM task_progress WHERE user_id = ? AND task_id = ?').get(userId, task_id);
  }

  if (progress.status === 'completed') {
    return res.status(400).json({ error: 'Task already completed' });
  }

  if (progress.status === 'locked') {
    return res.status(400).json({ error: 'Task is locked' });
  }

  // Mark as completed and award
  db.prepare(
    "UPDATE task_progress SET status = 'completed', claimed_at = datetime('now') WHERE id = ?"
  ).run(progress.id);

  db.prepare(
    "UPDATE users SET balance = balance + ?, total_earned = total_earned + ?, updated_at = datetime('now') WHERE id = ?"
  ).run(task.reward, task.reward, userId);

  // Update league
  const updatedUser = db.prepare('SELECT balance, total_earned, current_league FROM users WHERE id = ?').get(userId);
  const league = db.prepare(
    'SELECT name FROM leagues WHERE min_score <= ? AND max_score >= ? ORDER BY sort_order DESC LIMIT 1'
  ).get(updatedUser.total_earned, updatedUser.total_earned);
  if (league) {
    db.prepare('UPDATE users SET current_league = ? WHERE id = ?').run(league.name, userId);
  }

  res.json({
    task_id,
    reward: task.reward,
    balance: updatedUser.balance,
    total_earned: updatedUser.total_earned,
  });
});

module.exports = router;
