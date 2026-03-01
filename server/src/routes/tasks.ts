import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../auth';
import { getDb } from '../database';

const router = Router();

// GET /api/tasks
router.get('/tasks', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const userId = req.userId!;

  const tasks = db.prepare(
    `SELECT td.id, td.category, td.title, td.description, td.reward, td.type, 
            td.target_value, td.icon, td.unlock_league,
            COALESCE(tp.progress, 0) as progress, 
            COALESCE(tp.status, 'available') as status,
            tp.claimed_at
     FROM task_definitions td
     LEFT JOIN task_progress tp ON td.id = tp.task_id AND tp.user_id = ?
     WHERE td.is_active = 1
     ORDER BY td.sort_order`
  ).all(userId);

  res.json({ tasks });
});

// POST /api/tasks/:id/claim
router.post('/tasks/:id/claim', requireAuth, (req: AuthRequest, res: Response): void => {
  const taskId = parseInt(req.params.id as string, 10);
  const userId = req.userId!;
  const db = getDb();

  const task = db.prepare('SELECT * FROM task_definitions WHERE id = ? AND is_active = 1').get(taskId) as {
    id: number;
    reward: number;
    target_value: number;
    type: string;
  } | undefined;

  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const progress = db.prepare(
    'SELECT progress, status FROM task_progress WHERE user_id = ? AND task_id = ?'
  ).get(userId, taskId) as { progress: number; status: string } | undefined;

  if (progress?.status === 'claimed') {
    res.status(400).json({ error: 'Task already claimed' });
    return;
  }

  if (!progress || progress.progress < task.target_value) {
    res.status(400).json({ error: 'Task not yet completed', progress: progress?.progress || 0, required: task.target_value });
    return;
  }

  db.prepare(
    `UPDATE task_progress SET status = 'claimed', claimed_at = datetime('now') WHERE user_id = ? AND task_id = ?`
  ).run(userId, taskId);

  db.prepare(
    `UPDATE users SET balance = balance + ?, total_earned = total_earned + ?, updated_at = datetime('now') WHERE id = ?`
  ).run(task.reward, task.reward, userId);

  const user = db.prepare('SELECT balance, total_earned FROM users WHERE id = ?').get(userId) as {
    balance: number;
    total_earned: number;
  };

  res.json({
    reward: task.reward,
    balance: user.balance,
    totalEarned: user.total_earned,
  });
});

// POST /api/tasks/:id/progress
router.post('/tasks/:id/progress', requireAuth, (req: AuthRequest, res: Response): void => {
  const taskId = parseInt(req.params.id as string, 10);
  const userId = req.userId!;
  const { progress: newProgress } = req.body;
  const db = getDb();

  const task = db.prepare('SELECT * FROM task_definitions WHERE id = ? AND is_active = 1').get(taskId) as {
    id: number;
    target_value: number;
  } | undefined;

  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  if (typeof newProgress !== 'number' || newProgress < 0) {
    res.status(400).json({ error: 'Invalid progress value' });
    return;
  }

  const existing = db.prepare(
    'SELECT progress, status FROM task_progress WHERE user_id = ? AND task_id = ?'
  ).get(userId, taskId) as { progress: number; status: string } | undefined;

  if (existing?.status === 'claimed') {
    res.status(400).json({ error: 'Task already claimed' });
    return;
  }

  const clampedProgress = Math.min(newProgress, task.target_value);
  const status = clampedProgress >= task.target_value ? 'completed' : 'in_progress';

  if (existing) {
    db.prepare(
      'UPDATE task_progress SET progress = ?, status = ? WHERE user_id = ? AND task_id = ?'
    ).run(clampedProgress, status, userId, taskId);
  } else {
    db.prepare(
      'INSERT INTO task_progress (user_id, task_id, progress, status) VALUES (?, ?, ?, ?)'
    ).run(userId, taskId, clampedProgress, status);
  }

  res.json({ taskId, progress: clampedProgress, status });
});

export default router;
