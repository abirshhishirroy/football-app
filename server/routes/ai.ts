import { Router } from 'express';
import db, { uuidv4 } from '../db';
import { authMiddleware, adminMiddleware, AuthRequest } from '../auth';
import { generateOptimalTeam } from '../ai/teamBuilder';
import { FORMATION_PRESETS, Position } from '../types';

const router = Router();

router.post('/generate', authMiddleware, adminMiddleware, (req: AuthRequest, res) => {
  try {
    const { formation, teamName, playerIds } = req.body;
    if (!formation || !teamName) {
      return res.status(400).json({ error: 'Formation and team name required' });
    }

    const formationSlots: Position[] = Array.isArray(formation)
      ? formation
      : FORMATION_PRESETS[formation as string];
    if (!formationSlots || formationSlots.length === 0) {
      return res.status(400).json({ error: 'Invalid formation' });
    }

    let players;
    if (playerIds && playerIds.length > 0) {
      const placeholders = playerIds.map(() => '?').join(',');
      players = db.prepare(`SELECT * FROM players WHERE id IN (${placeholders})`).all(...playerIds);
    } else {
      players = db.prepare('SELECT * FROM players WHERE createdBy = ?').all(req.user!.id);
    }

    if (players.length < formationSlots.length) {
      return res.status(400).json({
        error: `Need at least ${formationSlots.length} players to generate a team. You have ${players.length}.`,
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

    const result = generateOptimalTeam(playerInputs, formationSlots, teamName, 200);

    const teamId = uuidv4();
    db.prepare('INSERT INTO teams (id, name, formation, isAiGenerated, createdBy) VALUES (?, ?, ?, ?, ?)').run(
      teamId, teamName, JSON.stringify(formationSlots), 1, req.user!.id
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

router.post('/generate-both-teams', authMiddleware, adminMiddleware, (req: AuthRequest, res) => {
  try {
    const { formation, playerIds, teamAName, teamBName } = req.body;
    if (!formation) {
      return res.status(400).json({ error: 'Formation required' });
    }

    const formationSlots: Position[] = Array.isArray(formation)
      ? formation
      : FORMATION_PRESETS[formation as string];
    if (!formationSlots || formationSlots.length === 0) {
      return res.status(400).json({ error: 'Invalid formation' });
    }

    let players;
    if (playerIds && playerIds.length > 0) {
      const placeholders = playerIds.map(() => '?').join(',');
      players = db.prepare(`SELECT * FROM players WHERE id IN (${placeholders})`).all(...playerIds);
    } else {
      players = db.prepare('SELECT * FROM players WHERE createdBy = ?').all(req.user!.id);
    }

    const minPlayers = formationSlots.length * 2;
    if (players.length < minPlayers) {
      return res.status(400).json({
        error: `Need at least ${minPlayers} players (${formationSlots.length} per team). You have ${players.length}.`,
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

    const sortedByRating = [...playerInputs].sort((a, b) => b.overall - a.overall);
    const teamAPlayers: typeof playerInputs = [];
    const teamBPlayers: typeof playerInputs = [];
    let sumA = 0;
    let sumB = 0;
    for (const p of sortedByRating) {
      if (sumA <= sumB) {
        teamAPlayers.push(p);
        sumA += p.overall;
      } else {
        teamBPlayers.push(p);
        sumB += p.overall;
      }
    }
    if (teamAPlayers.length > teamBPlayers.length) {
      const weakest = teamAPlayers.reduce((min, p) => (p.overall < min.overall ? p : min), teamAPlayers[0]);
      teamAPlayers.splice(teamAPlayers.indexOf(weakest), 1);
      teamBPlayers.push(weakest);
    }

    const resultA = generateOptimalTeam(teamAPlayers, formationSlots, teamAName || 'Team A', 100);
    const resultB = generateOptimalTeam(teamBPlayers, formationSlots, teamBName || 'Team B', 100);

    res.json({
      teamA: {
        name: teamAName || 'Team A',
        slots: resultA.slots,
        score: Math.round(resultA.score),
        players: resultA.slots.filter(s => s.player).map(s => ({ ...s.player, positionInTeam: s.position })),
      },
      teamB: {
        name: teamBName || 'Team B',
        slots: resultB.slots,
        score: Math.round(resultB.score),
        players: resultB.slots.filter(s => s.player).map(s => ({ ...s.player, positionInTeam: s.position })),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/update-team-positions', authMiddleware, adminMiddleware, (req: AuthRequest, res) => {
  try {
    const { teamA, teamB, formation } = req.body;
    if (!Array.isArray(teamA) || !Array.isArray(teamB)) {
      return res.status(400).json({ error: 'teamA and teamB arrays required' });
    }

    const formationSlots: Position[] = Array.isArray(formation)
      ? formation
      : FORMATION_PRESETS[formation as string] || ['GK', 'CB', 'CB', 'CM', 'CM', 'ST'];

    const allPlayerIds = [...teamA, ...teamB].map((a: any) => a.playerId).filter(Boolean);
    if (allPlayerIds.length === 0) {
      return res.status(400).json({ error: 'No player assignments provided' });
    }

    const placeholders = allPlayerIds.map(() => '?').join(',');
    const players = db.prepare(`SELECT * FROM players WHERE id IN (${placeholders})`).all(...allPlayerIds) as any[];
    const playerMap = new Map(players.map(p => [p.id, p]));

    function buildResult(assignments: { position: string; playerId: string }[], teamName: string) {
      const slots = formationSlots.map(pos => {
        const assignment = assignments.find(a => a.position === pos);
        const player = assignment ? playerMap.get(assignment.playerId) : null;
        return { position: pos, player: player || null };
      });

      const assignedPlayers = slots.filter(s => s.player).map(s => ({
        ...s.player,
        positionInTeam: s.position,
      }));

      const fakeTeam = slots.map(s => ({
        id: s.player?.id || '',
        name: s.player?.name || '',
        age: s.player?.age || 25,
        position: s.position as Position,
        playingStyle: (s.player?.playingStyle || 'balanced') as any,
        weeklyActivity: s.player?.weeklyActivity || 10,
        overall: s.player?.overall || 50,
        skillRatings: {
          pace: s.player?.pace || 50,
          shooting: s.player?.shooting || 50,
          passing: s.player?.passing || 50,
          dribbling: s.player?.dribbling || 50,
          defending: s.player?.defending || 50,
          physical: s.player?.physical || 50,
          goalkeeping: s.player?.goalkeeping,
        },
      }));

      const result = generateOptimalTeam(fakeTeam, formationSlots, teamName, 50);
      return { name: teamName, slots, score: Math.round(result.score), players: assignedPlayers };
    }

    const resultA = buildResult(teamA, req.body.teamAName || 'Team A');
    const resultB = buildResult(teamB, req.body.teamBName || 'Team B');

    res.json({ teamA: resultA, teamB: resultB });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/swap-players', authMiddleware, adminMiddleware, (req: AuthRequest, res) => {
  try {
    const { teamASlots, teamBSlots, formation } = req.body;
    if (!Array.isArray(teamASlots) || !Array.isArray(teamBSlots)) {
      return res.status(400).json({ error: 'teamASlots and teamBSlots arrays required' });
    }

    const formationSlots: Position[] = Array.isArray(formation)
      ? formation
      : FORMATION_PRESETS[formation as string] || ['GK', 'CB', 'CB', 'CM', 'CM', 'ST'];

    const allPlayerIds = [...teamASlots, ...teamBSlots]
      .map((a: any) => a.playerId)
      .filter(Boolean);
    const placeholders = allPlayerIds.map(() => '?').join(',');
    const players = placeholders
      ? (db.prepare(`SELECT * FROM players WHERE id IN (${placeholders})`).all(...allPlayerIds) as any[])
      : [];
    const playerMap = new Map(players.map(p => [p.id, p]));

    function buildResult(assignments: { position: string; playerId: string }[], teamName: string) {
      const slots = formationSlots.map(pos => {
        const assignment = assignments.find(a => a.position === pos);
        const player = assignment ? playerMap.get(assignment.playerId) : null;
        return { position: pos, player: player || null };
      });

      const assignedPlayers = slots.filter(s => s.player).map(s => ({
        ...s.player,
        positionInTeam: s.position,
      }));

      const fakeTeam = slots.map(s => ({
        id: s.player?.id || '',
        name: s.player?.name || '',
        age: s.player?.age || 25,
        position: s.position as Position,
        playingStyle: (s.player?.playingStyle || 'balanced') as any,
        weeklyActivity: s.player?.weeklyActivity || 10,
        overall: s.player?.overall || 50,
        skillRatings: {
          pace: s.player?.pace || 50,
          shooting: s.player?.shooting || 50,
          passing: s.player?.passing || 50,
          dribbling: s.player?.dribbling || 50,
          defending: s.player?.defending || 50,
          physical: s.player?.physical || 50,
          goalkeeping: s.player?.goalkeeping,
        },
      }));

      const result = generateOptimalTeam(fakeTeam, formationSlots, teamName, 50);
      return { name: teamName, slots, score: Math.round(result.score), players: assignedPlayers };
    }

    const resultA = buildResult(teamASlots, req.body.teamAName || 'Team A');
    const resultB = buildResult(teamBSlots, req.body.teamBName || 'Team B');

    res.json({ teamA: resultA, teamB: resultB });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
