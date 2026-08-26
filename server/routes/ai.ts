import { Router } from 'express';
import db, { uuidv4 } from '../db';
import { authMiddleware, AuthRequest } from '../auth';
import { generateOptimalTeam } from '../ai/teamBuilder';
import { FORMATIONS, Formation } from '../../src/types';

const router = Router();

router.post('/generate', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { formation, teamName, playerIds } = req.body;
    if (!formation || !teamName) {
      return res.status(400).json({ error: 'Formation and team name required' });
    }

    const formationKey = formation as Formation;
    if (!FORMATIONS[formationKey]) {
      return res.status(400).json({ error: 'Invalid formation' });
    }

    let players;
    if (playerIds && playerIds.length > 0) {
      const placeholders = playerIds.map(() => '?').join(',');
      players = db.prepare(`SELECT * FROM players WHERE id IN (${placeholders})`).all(...playerIds);
    } else {
      players = db.prepare('SELECT * FROM players WHERE createdBy = ?').all(req.user!.id);
    }

    if (players.length < 11) {
      return res.status(400).json({
        error: `Need at least 11 players to generate a team. You have ${players.length}.`,
      });
    }

    const playerInputs = players.map((p: any) => ({
      id: p.id,
      name: p.name,
      age: p.age,
      position: p.position,
      playingStyle: p.playingStyle,
      weeklyActivity: p.weeklyActivity,
      overall: p.overall,
      skillRatings: {
        pace: p.pace,
        shooting: p.shooting,
        passing: p.passing,
        dribbling: p.dribbling,
        defending: p.defending,
        physical: p.physical,
        goalkeeping: p.goalkeeping,
      },
    }));

    const formationSlots = FORMATIONS[formationKey];
    const result = generateOptimalTeam(playerInputs, formationSlots, teamName, 200);

    // Save the generated team
    const teamId = uuidv4();
    db.prepare('INSERT INTO teams (id, name, formation, isAiGenerated, createdBy) VALUES (?, ?, ?, ?, ?)').run(
      teamId, teamName, formation, 1, req.user!.id
    );
    const insert = db.prepare('INSERT INTO team_players (teamId, playerId, positionInTeam) VALUES (?, ?, ?)');
    for (const slot of result.slots) {
      if (slot.player) {
        insert.run(teamId, slot.player.id, slot.position);
      }
    }

    const savedTeam = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
    const teamPlayers = db.prepare(`
      SELECT p.*, tp.positionInTeam FROM team_players tp
      JOIN players p ON p.id = tp.playerId
      WHERE tp.teamId = ?
    `).all(teamId);

    res.json({
      team: { ...savedTeam, players: teamPlayers, playerIds: teamPlayers.map((p: any) => p.id) },
      score: Math.round(result.score),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
