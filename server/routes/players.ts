import { Router } from 'express';
import db, { uuidv4 } from '../db';
import { authMiddleware, adminMiddleware, AuthRequest } from '../auth';

const router = Router();

function isValidAvatarUrl(url: string | undefined | null): boolean {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    return true;
  } catch {
    return false;
  }
}

function calcOverall(row: any): number {
  const weights: Record<string, number> = {
    GK: { pace: 0, shooting: 0.05, passing: 0.15, dribbling: 0.05, defending: 0.05, physical: 0.1, goalkeeping: 0.6 },
    CB: { pace: 0.1, shooting: 0.05, passing: 0.1, dribbling: 0.05, defending: 0.4, physical: 0.3 },
    LB: { pace: 0.2, shooting: 0.05, passing: 0.15, dribbling: 0.15, defending: 0.25, physical: 0.2 },
    RB: { pace: 0.2, shooting: 0.05, passing: 0.15, dribbling: 0.15, defending: 0.25, physical: 0.2 },
    CDM: { pace: 0.1, shooting: 0.05, passing: 0.2, dribbling: 0.1, defending: 0.35, physical: 0.2 },
    CM: { pace: 0.1, shooting: 0.15, passing: 0.25, dribbling: 0.2, defending: 0.15, physical: 0.15 },
    CAM: { pace: 0.15, shooting: 0.2, passing: 0.25, dribbling: 0.25, defending: 0.05, physical: 0.1 },
    LW: { pace: 0.25, shooting: 0.15, passing: 0.15, dribbling: 0.25, defending: 0.05, physical: 0.15 },
    RW: { pace: 0.25, shooting: 0.15, passing: 0.15, dribbling: 0.25, defending: 0.05, physical: 0.15 },
    ST: { pace: 0.2, shooting: 0.3, passing: 0.1, dribbling: 0.2, defending: 0, physical: 0.2 },
    CF: { pace: 0.15, shooting: 0.25, passing: 0.15, dribbling: 0.2, defending: 0.05, physical: 0.2 },
  };
  const w = weights[row.position] || weights.CM;
  let overall: number;
  if (row.position === 'GK') {
    overall = (row.goalkeeping || 50) * 0.6 + row.physical * 0.15 + row.pace * 0.1 + row.passing * 0.15;
  } else {
    overall =
      row.pace * w.pace +
      row.shooting * w.shooting +
      row.passing * w.passing +
      row.dribbling * w.dribbling +
      row.defending * w.defending +
      row.physical * w.physical;
  }
  const ageFactor = row.age <= 24 ? 1.02 : row.age <= 29 ? 1.0 : row.age <= 32 ? 0.97 : 0.93;
  const activityFactor = 0.85 + (row.weeklyActivity / 20) * 0.15;
  overall = Math.round(overall * ageFactor * activityFactor);
  return Math.min(99, Math.max(1, overall));
}

router.get('/me', authMiddleware, (req: AuthRequest, res) => {
  const player = db.prepare('SELECT * FROM players WHERE userId = ?').get(req.user!.id);
  if (!player) return res.json(null);
  res.json(player);
});

router.get('/', authMiddleware, (_req, res) => {
  const players = db.prepare('SELECT * FROM players ORDER BY createdAt DESC').all();
  res.json(players);
});

router.get('/:id', authMiddleware, (req, res) => {
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });
  res.json(player);
});

router.post('/', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { name, age, height, weight, position, playingStyle, weeklyActivity, skillRatings, avatarUrl, userId } = req.body;
    if (!name || !age || !height || !weight || !position || !playingStyle) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }
    if (!isValidAvatarUrl(avatarUrl)) {
      return res.status(400).json({ error: 'Invalid photo URL. Must start with http:// or https://' });
    }
    const row = {
      pace: skillRatings?.pace || 50,
      shooting: skillRatings?.shooting || 50,
      passing: skillRatings?.passing || 50,
      dribbling: skillRatings?.dribbling || 50,
      defending: skillRatings?.defending || 50,
      physical: skillRatings?.physical || 50,
      goalkeeping: skillRatings?.goalkeeping,
      position,
      age,
      weeklyActivity: weeklyActivity || 0,
    };
    const overall = calcOverall(row);
    const id = uuidv4();
    const ownerId = req.user!.role === 'admin' ? (userId || null) : req.user!.id;
    db.prepare(`
      INSERT INTO players (id, name, age, height, weight, position, playingStyle, weeklyActivity,
        pace, shooting, passing, dribbling, defending, physical, goalkeeping, overall, avatarUrl, userId, createdBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, age, height, weight, position, playingStyle, weeklyActivity || 0,
      row.pace, row.shooting, row.passing, row.dribbling, row.defending, row.physical, row.goalkeeping,
      overall, avatarUrl || null, ownerId, req.user!.id);
    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(id);
    res.status(201).json(player);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed: players.userId')) {
      return res.status(400).json({ error: 'You already have a player profile' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authMiddleware, (req: AuthRequest, res) => {
  try {
    const existing = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id) as any;
    if (!existing) return res.status(404).json({ error: 'Player not found' });

    if (req.user!.role !== 'admin' && existing.userId !== req.user!.id) {
      return res.status(403).json({ error: 'You can only edit your own profile' });
    }

    const { name, age, height, weight, position, playingStyle, weeklyActivity, skillRatings, avatarUrl } = req.body;
    if (avatarUrl !== undefined && !isValidAvatarUrl(avatarUrl)) {
      return res.status(400).json({ error: 'Invalid photo URL. Must start with http:// or https://' });
    }
    const row = {
      pace: skillRatings?.pace ?? existing.pace,
      shooting: skillRatings?.shooting ?? existing.shooting,
      passing: skillRatings?.passing ?? existing.passing,
      dribbling: skillRatings?.dribbling ?? existing.dribbling,
      defending: skillRatings?.defending ?? existing.defending,
      physical: skillRatings?.physical ?? existing.physical,
      goalkeeping: skillRatings?.goalkeeping ?? existing.goalkeeping,
      position: position || existing.position,
      age: age ?? existing.age,
      weeklyActivity: weeklyActivity ?? existing.weeklyActivity,
    };
    const overall = calcOverall(row);

    db.prepare(`
      UPDATE players SET name=?, age=?, height=?, weight=?, position=?, playingStyle=?,
        weeklyActivity=?, pace=?, shooting=?, passing=?, dribbling=?, defending=?, physical=?,
        goalkeeping=?, overall=?, avatarUrl=?
      WHERE id=?
    `).run(
      name || existing.name, age ?? existing.age, height ?? existing.height,
      weight ?? existing.weight, position || existing.position,
      playingStyle || existing.playingStyle, weeklyActivity ?? existing.weeklyActivity,
      row.pace, row.shooting, row.passing, row.dribbling, row.defending, row.physical,
      row.goalkeeping, overall, avatarUrl !== undefined ? avatarUrl : existing.avatarUrl, req.params.id
    );
    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
    res.json(player);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM players WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Player not found' });
  res.json({ success: true });
});

export default router;
