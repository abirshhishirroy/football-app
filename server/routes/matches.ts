import { Router } from 'express';
import db, { uuidv4 } from '../db';
import { authMiddleware, AuthRequest, adminMiddleware } from '../auth';
import { generateOptimalTeam } from '../ai/teamBuilder';

const router = Router();

const SIGNUP_DEADLINE_DAY_OFFSET = 1;
const SIGNUP_DEADLINE_HOUR = 14;

function signupDeadline(matchDate: string | Date): Date {
  const d = new Date(matchDate);
  d.setDate(d.getDate() - SIGNUP_DEADLINE_DAY_OFFSET);
  d.setHours(SIGNUP_DEADLINE_HOUR, 0, 0, 0);
  return d;
}

function isSignupClosed(matchDate: string | Date): boolean {
  return new Date() >= signupDeadline(matchDate);
}

function addMatchDetails(match: any, _includeTeams: boolean = true) {
  const signups = db.prepare(`
    SELECT ms.*, u.name, u.email,
      (SELECT p.overall FROM players p WHERE p.userId = ms.userId) as playerOverall,
      (SELECT p.position FROM players p WHERE p.userId = ms.userId) as playerPosition,
      (SELECT p.avatarUrl FROM players p WHERE p.userId = ms.userId) as playerAvatar
    FROM match_signups ms
    JOIN users u ON u.id = ms.userId
    WHERE ms.matchId = ?
  `).all(match.id);
  const teamData = db.prepare('SELECT * FROM match_teams WHERE matchId = ?').get(match.id) as any;
  const scorers = db.prepare(`
    SELECT gs.*, p.name as playerName FROM match_goal_scorers gs
    JOIN players p ON p.id = gs.playerId
    WHERE gs.matchId = ? ORDER BY gs.createdAt
  `).all(match.id);
  return {
    ...match,
    signups,
    signupCount: signups.length,
    teamData,
    scorers,
    signupDeadline: match.matchDate ? signupDeadline(match.matchDate).toISOString() : null,
    signupClosed: match.matchDate ? isSignupClosed(match.matchDate) : true,
  };
}

// Map a player's display name to their team ('A' | 'B') for a stored match lineup.
function teamForName(teamData: any, name: string): 'A' | 'B' | null {
  if (!teamData) return null;
  const inTeam = (lineup: string, _team: 'A' | 'B') =>
    lineup.split(',').filter(Boolean).some((entry) => entry.split(':').slice(1).join(':') === name);
  if (inTeam(teamData.teamA, 'A')) return 'A';
  if (inTeam(teamData.teamB, 'B')) return 'B';
  return null;
}

// Recompute a single player's cumulative stats from the database (idempotent).
function recomputeStatsForUser(userId: string): void {
  const profile = db.prepare('SELECT id, name FROM players WHERE userId = ?').get(userId) as any;
  if (!profile) return;

  const matchesPlayed = db.prepare(`
    SELECT COUNT(*) as n FROM match_signups ms
    JOIN matches m ON m.id = ms.matchId
    WHERE ms.userId = ? AND m.status = 'completed'
  `).get(userId) as any;

  const goals = db.prepare(`
    SELECT COUNT(*) as n FROM match_goal_scorers gs
    JOIN matches m ON m.id = gs.matchId
    WHERE gs.playerId = ? AND gs.isGoal = 1 AND m.status = 'completed'
  `).get(profile.id) as any;

  const assists = db.prepare(`
    SELECT COUNT(*) as n FROM match_goal_scorers gs
    JOIN matches m ON m.id = gs.matchId
    WHERE gs.playerId = ? AND gs.isGoal = 0 AND m.status = 'completed'
  `).get(profile.id) as any;

  // Wins: signed up, match completed, and their team was the winner.
  const signedMatches = db.prepare(`
    SELECT m.id, m.winner FROM match_signups ms
    JOIN matches m ON m.id = ms.matchId
    WHERE ms.userId = ? AND m.status = 'completed'
  `).all(userId) as any[];
  let wins = 0;
  for (const m of signedMatches) {
    if (!m.winner || m.winner === 'draw') continue;
    const teamData = db.prepare('SELECT teamA, teamB FROM match_teams WHERE matchId = ?').get(m.id) as any;
    const myTeam = teamForName(teamData, profile.name || '');
    if (myTeam === m.winner) wins += 1;
  }

  db.prepare('UPDATE players SET goals = ?, assists = ?, matchesPlayed = ?, wins = ? WHERE userId = ?')
    .run(goals?.n || 0, assists?.n || 0, matchesPlayed?.n || 0, wins, userId);
}

// Recompute stats for everyone signed up to the given match.
function recomputePlayerStats(matchId: string, _winner: string | null): void {
  const signups = db.prepare('SELECT userId FROM match_signups WHERE matchId = ?').all(matchId) as any[];
  for (const s of signups) {
    recomputeStatsForUser(s.userId);
  }
}

router.get('/', authMiddleware, (req: AuthRequest, res) => {
  const matches = db.prepare('SELECT * FROM matches ORDER BY matchDate DESC').all() as any[];
  const enriched = matches.map((m) => addMatchDetails(m));
  res.json(enriched);
});

router.get('/:id', authMiddleware, (req, res) => {
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id) as any;
  if (!match) return res.status(404).json({ error: 'Match not found' });
  res.json(addMatchDetails(match));
});

router.post('/', authMiddleware, adminMiddleware, (req: AuthRequest, res) => {
  try {
    const { title, matchDate, description, formation, venueName, venueLink, reportingTime } = req.body;
    if (!title || !matchDate) {
      return res.status(400).json({ error: 'Title and date required' });
    }
    const id = uuidv4();
    db.prepare('INSERT INTO matches (id, title, matchDate, description, formation, createdBy, venueName, venueLink, reportingTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      id, title, matchDate, description || '', formation || '4-4-2', req.user!.id,
      venueName || '', venueLink || '', reportingTime || ''
    );
    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(id);
    res.status(201).json(addMatchDetails(match));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/signup', authMiddleware, (req: AuthRequest, res) => {
  try {
    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id) as any;
    if (!match) return res.status(404).json({ error: 'Match not found' });
    if (match.status !== 'upcoming') return res.status(400).json({ error: 'Match is not accepting signups' });
    if (isSignupClosed(match.matchDate)) {
      return res.status(403).json({ error: 'Signup is closed. The deadline was 2:00 PM one day before the match.' });
    }

    const existing = db.prepare('SELECT id FROM match_signups WHERE matchId = ? AND userId = ?').get(req.params.id, req.user!.id);
    if (existing) {
      return res.status(400).json({ error: 'Already signed up' });
    }

    const id = uuidv4();
    db.prepare('INSERT INTO match_signups (id, matchId, userId) VALUES (?, ?, ?)').run(id, req.params.id, req.user!.id);

    const matchUpdated = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id) as any;
    res.json(addMatchDetails(matchUpdated));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Signups are locked once confirmed: players cannot unsign themselves.
router.post('/:id/leave', authMiddleware, (req: AuthRequest, res) => {
  res.status(403).json({ error: 'Signup is locked once confirmed. You can no longer leave this match.' });
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

    if (signups.length < 8) {
      return res.status(400).json({ error: 'Need at least 8 players to generate teams' });
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

    // Balance teams by player rating (overall), not randomly.
    // Always two teams: A and B. If an odd number of players, the extra goes to Team B.
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

    const countA = teamAPlayers.length;
    const countB = teamBPlayers.length;
    const slotsA = formationSlots.slice(0, Math.max(1, Math.min(countA, formationSlots.length)));
    const slotsB = formationSlots.slice(0, Math.max(1, Math.min(countB, formationSlots.length)));
    const resultA = generateOptimalTeam(teamAPlayers, slotsA, 'Team A', 50);
    const resultB = generateOptimalTeam(teamBPlayers, slotsB, 'Team B', 50);

    const teamA = resultA.slots.filter(s => s.player).map(s => `${s.position}:${s.player!.name}`).join(',');
    const teamB = resultB.slots.filter(s => s.player).map(s => `${s.position}:${s.player!.name}`).join(',');

    const existingTeam = db.prepare('SELECT id FROM match_teams WHERE matchId = ?').get(req.params.id);
    if (existingTeam) {
      db.prepare('UPDATE match_teams SET teamA = ?, teamB = ?, teamAName = ?, teamBName = ? WHERE matchId = ?').run(teamA, teamB, 'Team A', 'Team B', req.params.id);
    } else {
      db.prepare('INSERT INTO match_teams (id, matchId, teamA, teamB, teamAName, teamBName) VALUES (?, ?, ?, ?, ?, ?)').run(
        uuidv4(), req.params.id, teamA, teamB, 'Team A', 'Team B'
      );
    }

    db.prepare('UPDATE matches SET status = ? WHERE id = ?').run('full', req.params.id);

    const teamData = db.prepare('SELECT * FROM match_teams WHERE matchId = ?').get(req.params.id);
    res.json({ teamData, teamAScore: Math.round(resultA.score), teamBScore: Math.round(resultB.score) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: record a match result and update player statistics.
router.post('/:id/result', authMiddleware, adminMiddleware, (req: AuthRequest, res) => {
  try {
    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id) as any;
    if (!match) return res.status(404).json({ error: 'Match not found' });

    const { winner, scoreA, scoreB, scorers } = req.body || {};
    const winnerVal = ['A', 'B', 'draw'].includes(winner) ? winner : null;
    const safeScoreA = Number.isFinite(Number(scoreA)) ? Number(scoreA) : 0;
    const safeScoreB = Number.isFinite(Number(scoreB)) ? Number(scoreB) : 0;

    const now = new Date().toISOString();
    const tx = db.transaction(() => {
      // Clear previous result for this match (idempotent re-entry).
      db.prepare('DELETE FROM match_goal_scorers WHERE matchId = ?').run(req.params.id);

      // Record goals/assists.
      const insertScorer = db.prepare('INSERT INTO match_goal_scorers (id, matchId, team, playerId, isGoal, minute) VALUES (?, ?, ?, ?, ?, ?)');
      for (const s of Array.isArray(scorers) ? scorers : []) {
        if (!s?.playerId) continue;
        const team = s.team === 'B' ? 'B' : 'A';
        const isGoal = s.isGoal === false || s.isGoal === 0 ? 0 : 1;
        const minute = Number.isFinite(Number(s.minute)) ? Number(s.minute) : null;
        insertScorer.run(uuidv4(), req.params.id, team, s.playerId, isGoal, minute);
      }

      db.prepare('UPDATE matches SET status = ?, winner = ?, scoreA = ?, scoreB = ?, completedAt = ? WHERE id = ?')
        .run('completed', winnerVal, safeScoreA, safeScoreB, now, req.params.id);

      // Recompute player stats from completed matches + scorers.
      recomputePlayerStats(req.params.id, winnerVal);
    });
    tx();

    const updated = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id) as any;
    res.json(addMatchDetails(updated));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/teams/rename', authMiddleware, adminMiddleware, (req: AuthRequest, res) => {
  try {
    const { teamAName, teamBName } = req.body;
    const existing = db.prepare('SELECT id FROM match_teams WHERE matchId = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'No teams generated for this match yet' });
    }
    db.prepare('UPDATE match_teams SET teamAName = ?, teamBName = ? WHERE matchId = ?').run(
      teamAName || 'Team A', teamBName || 'Team B', req.params.id
    );
    const teamData = db.prepare('SELECT * FROM match_teams WHERE matchId = ?').get(req.params.id);
    res.json(teamData);
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
