import { Router } from 'express';
import db, { uuidv4 } from '../db';
import { authMiddleware, AuthRequest } from '../auth';

const router = Router();

router.get('/', authMiddleware, (req: AuthRequest, res) => {
  const teams = db.prepare('SELECT * FROM teams WHERE createdBy = ? ORDER BY createdAt DESC').all(req.user!.id);
  const result = teams.map((team: any) => {
    const players = db.prepare(`
      SELECT p.*, tp.positionInTeam FROM team_players tp
      JOIN players p ON p.id = tp.playerId
      WHERE tp.teamId = ?
    `).all(team.id);
    return { ...team, players, playerIds: players.map((p: any) => p.id) };
  });
  res.json(result);
});

router.get('/:id', authMiddleware, (req, res) => {
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(req.params.id) as any;
  if (!team) return res.status(404).json({ error: 'Team not found' });
  const players = db.prepare(`
    SELECT p.*, tp.positionInTeam FROM team_players tp
    JOIN players p ON p.id = tp.playerId
    WHERE tp.teamId = ?
  `).all(team.id);
  res.json({ ...team, players, playerIds: players.map((p: any) => p.id) });
});

router.post('/', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { name, formation, playerAssignments } = req.body;
    if (!name || !formation || !playerAssignments) {
      return res.status(400).json({ error: 'Name, formation, and player assignments required' });
    }
    const id = uuidv4();
    db.prepare('INSERT INTO teams (id, name, formation, isAiGenerated, createdBy) VALUES (?, ?, ?, ?, ?)').run(
      id, name, formation, 0, req.user!.id
    );
    const insert = db.prepare('INSERT INTO team_players (teamId, playerId, positionInTeam) VALUES (?, ?, ?)');
    for (const assignment of playerAssignments) {
      insert.run(id, assignment.playerId, assignment.positionInTeam);
    }
    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(id);
    res.status(201).json(team);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM teams WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Team not found' });
  res.json({ success: true });
});

export default router;
