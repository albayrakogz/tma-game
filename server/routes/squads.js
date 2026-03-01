const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// List squads
router.get('/', (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  let query = 'SELECT * FROM squads';
  const params = [];

  if (search) {
    query += ' WHERE name LIKE ?';
    params.push(`%${search}%`);
  }

  query += ' ORDER BY total_score DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit, 10), offset);

  const squads = db.prepare(query).all(...params);

  res.json({ squads });
});

// Get single squad
router.get('/:id', (req, res) => {
  const squad = db.prepare('SELECT * FROM squads WHERE id = ?').get(req.params.id);
  if (!squad) return res.status(404).json({ error: 'Squad not found' });

  const members = db.prepare(
    `SELECT sm.*, u.username, u.first_name, u.total_earned, u.current_league
     FROM squad_memberships sm
     JOIN users u ON sm.user_id = u.id
     WHERE sm.squad_id = ?
     ORDER BY sm.contribution DESC`
  ).all(squad.id);

  res.json({ squad, members });
});

// Create squad
router.post('/', (req, res) => {
  const userId = req.user.id;
  const { name, emblem, description } = req.body;

  if (!name || name.trim().length < 2) {
    return res.status(400).json({ error: 'Squad name must be at least 2 characters' });
  }

  // Check if user already in a squad
  const existing = db.prepare('SELECT squad_id FROM users WHERE id = ?').get(userId);
  if (existing && existing.squad_id) {
    return res.status(400).json({ error: 'You are already in a squad. Leave first.' });
  }

  const result = db.prepare(
    'INSERT INTO squads (name, emblem, description, creator_id, member_count) VALUES (?, ?, ?, ?, 1)'
  ).run(name.trim(), emblem || '⛏️', description || '', userId);

  const squadId = result.lastInsertRowid;

  db.prepare(
    'INSERT INTO squad_memberships (user_id, squad_id) VALUES (?, ?)'
  ).run(userId, squadId);

  db.prepare('UPDATE users SET squad_id = ? WHERE id = ?').run(squadId, userId);

  const squad = db.prepare('SELECT * FROM squads WHERE id = ?').get(squadId);
  res.status(201).json({ squad });
});

// Join squad
router.post('/:id/join', (req, res) => {
  const userId = req.user.id;
  const squadId = parseInt(req.params.id, 10);

  const squad = db.prepare('SELECT * FROM squads WHERE id = ?').get(squadId);
  if (!squad) return res.status(404).json({ error: 'Squad not found' });

  const user = db.prepare('SELECT squad_id FROM users WHERE id = ?').get(userId);
  if (user && user.squad_id) {
    return res.status(400).json({ error: 'Already in a squad. Leave first.' });
  }

  const existingMembership = db.prepare(
    'SELECT id FROM squad_memberships WHERE user_id = ? AND squad_id = ?'
  ).get(userId, squadId);
  if (existingMembership) {
    return res.status(400).json({ error: 'Already a member of this squad' });
  }

  db.prepare('INSERT INTO squad_memberships (user_id, squad_id) VALUES (?, ?)').run(userId, squadId);
  db.prepare('UPDATE squads SET member_count = member_count + 1 WHERE id = ?').run(squadId);
  db.prepare('UPDATE users SET squad_id = ? WHERE id = ?').run(squadId, userId);

  res.json({ message: 'Joined squad successfully' });
});

// Leave squad
router.post('/:id/leave', (req, res) => {
  const userId = req.user.id;
  const squadId = parseInt(req.params.id, 10);

  const membership = db.prepare(
    'SELECT id FROM squad_memberships WHERE user_id = ? AND squad_id = ?'
  ).get(userId, squadId);

  if (!membership) {
    return res.status(400).json({ error: 'Not a member of this squad' });
  }

  // Don't allow creator to leave (they must transfer or delete)
  const squad = db.prepare('SELECT creator_id FROM squads WHERE id = ?').get(squadId);
  if (squad && squad.creator_id === userId) {
    return res.status(400).json({ error: 'Squad creator cannot leave. Delete the squad instead.' });
  }

  db.prepare('DELETE FROM squad_memberships WHERE user_id = ? AND squad_id = ?').run(userId, squadId);
  db.prepare('UPDATE squads SET member_count = member_count - 1 WHERE id = ?').run(squadId);
  db.prepare('UPDATE users SET squad_id = NULL WHERE id = ?').run(userId);

  res.json({ message: 'Left squad successfully' });
});

// Delete squad (creator only)
router.delete('/:id', (req, res) => {
  const userId = req.user.id;
  const squadId = parseInt(req.params.id, 10);

  const squad = db.prepare('SELECT * FROM squads WHERE id = ?').get(squadId);
  if (!squad) return res.status(404).json({ error: 'Squad not found' });
  if (squad.creator_id !== userId) return res.status(403).json({ error: 'Only creator can delete' });

  // Remove all memberships
  db.prepare('UPDATE users SET squad_id = NULL WHERE squad_id = ?').run(squadId);
  db.prepare('DELETE FROM squad_memberships WHERE squad_id = ?').run(squadId);
  db.prepare('DELETE FROM squads WHERE id = ?').run(squadId);

  res.json({ message: 'Squad deleted' });
});

module.exports = router;
