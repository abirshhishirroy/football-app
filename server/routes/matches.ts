import { Router } from 'express';
import db, { uuidv4 } from '../db';
import { authMiddleware, AuthRequest, adminMiddleware } from '../auth';
import { generateOptimalTeam } from '../ai/teamBuilder';

const router = Router();

router.get('/', authMiddleware, (req: AuthRequest, res) => {
  const matches = db.prepare('SELECT * FROM matches ORDER BY matchDate DESC').all() as any[];
  const enriched = matches.map((m) => {
    const signups = db.prepare(`
      SELECT ms.*, u.name, u.email,
        (SELECT p.overall FROM players p WHERE p.userId = ms.userId) as playerOverall,
        (SELECT p.position FROM players p WHERE p.userId = ms.userId) as playerPosition,
        (SELECT p.avatarUrl FROM players p WHERE p.userId = ms.userId) as playerAvatar
      FROM match_signups ms
      JOIN users u ON u.id = ms.userId
      WHERE ms.matchId = ?
    `).all(m.id);
    const teamData = db.prepare('SELECT * FROM match_teams WHERE matchId = ?').get(m.id) as any;
    return { ...m, signups, signupCount: signups.length, teamData };
  });
  res.json(enriched);
});

router.get('/:id', authMiddleware, (req, res) => {
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id) as any;
  if (!match) return res.status(404).json({ error: 'Match not found' });
  const signups = db.prepare(`
    SELECT ms.*, u.name, u.email FROM match_signups ms
    JOIN users u ON u.id = ms.userId
    WHERE ms.matchId = ?
  `).all(match.id);
  const teamData = db.prepare('SELECT * FROM match_teams WHERE matchId = ?').get(match.id);
  res.json({ ...match, signups, signupCount: signups.length, teamData });
});

router.post('/', authMiddleware, adminMiddleware, (req: AuthRequest, res) => {
  try {
    const { title, matchDate, description, formation } = req.body;
    if (!title || !matchDate) {
      return res.status(400).json({ error: 'Title and date required' });
    }
    const id = uuidv4();
    db.prepare('INSERT INTO matches (id, title, matchDate, description, formation, createdBy) VALUES (?, ?, ?, ?, ?, ?)').run(
      id, title, matchDate, description || '', formation || '4-4-2', req.user!.id
    );
    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(id);
    res.status(201).json({ ...match, signups: [], signupCount: 0, teamData: null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/signup', authMiddleware, (req: AuthRequest, res) => {
  try {
    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id) as any;
    if (!match) return res.status(404).json({ error: 'Match not found' });
    if (match.status !== 'upcoming') return res.status(400).json({ error: 'Match is not accepting signups' });

    const existing = db.prepare('SELECT id FROM match_signups WHERE matchId = ? AND userId = ?').get(req.params.id, req.user!.id);
    if (existing) {
      return res.status(400).json({ error: 'Already signed up' });
    }

    const id = uuidv4();
    db.prepare('INSERT INTO match_signups (id, matchId, userId) VALUES (?, ?, ?)').run(id, req.params.id, req.user!.id);

    const matchUpdated = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id) as any;
    const signups = db.prepare('SELECT ms.*, u.name, u.email FROM match_signups ms JOIN users u ON u.id = ms.userId WHERE ms.matchId = ?').all(req.params.id);
    res.json({ ...matchUpdated, signups, signupCount: signups.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/leave', authMiddleware, (req: AuthRequest, res) => {
  try {
    db.prepare('DELETE FROM match_signups WHERE matchId = ? AND userId = ?').run(req.params.id, req.user!.id);
    const matchUpdated = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id) as any;
    const signups = db.prepare('SELECT ms.*, u.name, u.email FROM match_signups ms JOIN users u ON u.id = ms.userId WHERE ms.matchId = ?').all(req.params.id);
    res.json({ ...matchUpdated, signups, signupCount: signups.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/generate-teams', authMiddleware, adminMiddleware, (req: AuthRequest, res) => {
  try {
    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id) as any;
    if (!match) return res.status(404).json({ error: 'Match not found' });

    const signups = db.prepare(`
      SELECT ms.userId, u.name FROM match_signups ms
      JOIN users u ON u.id = ms.userId
      WHERE ms.matchId = ?
    `).all(req.params.id);

    if (signups.length < 2) {
      return res.status(400).json({ error: 'Need at least 2 players to generate teams' });
    }

    const formations: Record<string, string[]> = {
      '4-4-2': ['GK', 'LB', 'CB', 'CB', 'RB', 'LW', 'CM', 'CM', 'RW', 'ST', 'ST'],
      '4-3-3': ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CM', 'CM', 'LW', 'ST', 'RW'],
      '3-5-2': ['GK', 'CB', 'CB', 'CB', 'LW', 'CDM', 'CM', 'CDM', 'RW', 'ST', 'ST'],
      '4-2-3-1': ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CDM', 'LW', 'CAM', 'RW', 'ST'],
      '5-3-2': ['GK', 'LB', 'CB', 'CB', 'CB', 'RB', 'CM', 'CM', 'CM', 'ST', 'ST'],
    };
    const formationSlots = formations[match.formation] || formations['4-4-2'];

    const playerInputs = signups.map((s: any, i: number) => {
      const profile = db.prepare('SELECT * FROM players WHERE userId = ?').get(s.userId) as any;
      if (profile) {
        return {
          id: profile.id,
          name: profile.name,
          age: profile.age,
          position: profile.position,
          playingStyle: profile.playingStyle,
          weeklyActivity: profile.weeklyActivity,
          overall: profile.overall,
          skillRatings: {
            pace: profile.pace,
            shooting: profile.shooting,
            passing: profile.passing,
            dribbling: profile.dribbling,
            defending: profile.defending,
            physical: profile.physical,
            goalkeeping: profile.goalkeeping,
          },
        };
      }
      return {
        id: `match-player-${i}`,
        name: s.name,
        age: 20 + Math.floor(Math.random() * 15),
        position: formationSlots[i % formationSlots.length] as any,
        playingStyle: (['balanced', 'attacking', 'defensive', 'possession', 'counter-attack'] as const)[Math.floor(Math.random() * 5)],
        weeklyActivity: 10 + Math.floor(Math.random() * 10),
        overall: 55 + Math.floor(Math.random() * 35),
        skillRatings: {
          pace: 50 + Math.floor(Math.random() * 45),
          shooting: 50 + Math.floor(Math.random() * 45),
          passing: 50 + Math.floor(Math.random() * 45),
          dribbling: 50 + Math.floor(Math.random() * 45),
          defending: 40 + Math.floor(Math.random() * 50),
          physical: 50 + Math.floor(Math.random() * 45),
        },
      };
    });

    const shuffled = [...playerInputs].sort(() => Math.random() - 0.5);
    const half = Math.ceil(shuffled.length / 2);
    const teamAPlayers = shuffled.slice(0, half);
    const teamBPlayers = shuffled.slice(half);

    const resultA = generateOptimalTeam(teamAPlayers, formationSlots.slice(0, Math.min(half, formationSlots.length)), 'Team A', 50);
    const resultB = generateOptimalTeam(teamBPlayers, formationSlots.slice(0, Math.min(teamBPlayers.length, formationSlots.length)), 'Team B', 50);

    const teamA = resultA.slots.filter(s => s.player).map(s => `${s.position}:${s.player!.name}`).join(',');
    const teamB = resultB.slots.filter(s => s.player).map(s => `${s.position}:${s.player!.name}`).join(',');

    const existingTeam = db.prepare('SELECT id FROM match_teams WHERE matchId = ?').get(req.params.id);
    if (existingTeam) {
      db.prepare('UPDATE match_teams SET teamA = ?, teamB = ? WHERE matchId = ?').run(teamA, teamB, req.params.id);
    } else {
      db.prepare('INSERT INTO match_teams (id, matchId, teamA, teamB) VALUES (?, ?, ?, ?)').run(
        uuidv4(), req.params.id, teamA, teamB
      );
    }

    db.prepare('UPDATE matches SET status = ? WHERE id = ?').run('full', req.params.id);

    const teamData = db.prepare('SELECT * FROM match_teams WHERE matchId = ?').get(req.params.id);
    res.json({ teamData, teamAScore: Math.round(resultA.score), teamBScore: Math.round(resultB.score) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM matches WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Match not found' });
  res.json({ success: true });
});

export default router;
