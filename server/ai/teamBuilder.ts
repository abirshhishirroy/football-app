import { Position, PlayingStyle, SkillRatings } from '../types';

interface PlayerInput {
  id: string;
  name: string;
  age: number;
  position: Position;
  playingStyle: PlayingStyle;
  weeklyActivity: number;
  overall: number;
  skillRatings: SkillRatings;
}

interface TeamSlot {
  position: Position;
  player: PlayerInput | null;
}

interface TeamResult {
  slots: TeamSlot[];
  score: number;
  formation: string;
}

const POSITION_COMPATIBILITY: Record<Position, Position[]> = {
  GK: ['GK'],
  CB: ['CB', 'CDM'],
  LB: ['LB', 'CB', 'LW', 'CM'],
  RB: ['RB', 'CB', 'RW', 'CM'],
  CDM: ['CDM', 'CB', 'CM'],
  CM: ['CM', 'CDM', 'CAM', 'LB', 'RB'],
  CAM: ['CAM', 'CM', 'LW', 'RW', 'ST'],
  LW: ['LW', 'LM', 'LB', 'CAM', 'ST'],
  RW: ['RW', 'RM', 'RB', 'CAM', 'ST'],
  ST: ['ST', 'CF', 'CAM', 'LW', 'RW'],
  CF: ['CF', 'ST', 'CAM'],
};

const STYLE_SYNERGY: Record<PlayingStyle, Record<PlayingStyle, number>> = {
  defensive: { defensive: 1.1, balanced: 1.0, attacking: 0.8, possession: 1.05, 'counter-attack': 0.9 },
  balanced: { defensive: 1.0, balanced: 1.1, attacking: 1.0, possession: 1.0, 'counter-attack': 1.0 },
  attacking: { defensive: 0.8, balanced: 1.0, attacking: 1.15, possession: 0.95, 'counter-attack': 1.05 },
  possession: { defensive: 1.05, balanced: 1.0, attacking: 0.95, possession: 1.15, 'counter-attack': 0.85 },
  'counter-attack': { defensive: 0.9, balanced: 1.0, attacking: 1.05, possession: 0.85, 'counter-attack': 1.15 },
};

function skillBonus(player: PlayerInput, position: Position): number {
  const sr = player.skillRatings;
  const bonuses: Record<Position, number> = {
    GK: sr.goalkeeping ? sr.goalkeeping * 0.004 : 0,
    CB: (sr.defending * 0.003 + sr.physical * 0.001 + sr.pace * 0.001),
    LB: (sr.pace * 0.002 + sr.defending * 0.002 + sr.passing * 0.001),
    RB: (sr.pace * 0.002 + sr.defending * 0.002 + sr.passing * 0.001),
    CDM: (sr.defending * 0.003 + sr.passing * 0.001 + sr.physical * 0.001),
    CM: (sr.passing * 0.002 + sr.dribbling * 0.001 + sr.defending * 0.001 + sr.shooting * 0.001),
    CAM: (sr.passing * 0.002 + sr.dribbling * 0.002 + sr.shooting * 0.001),
    LW: (sr.pace * 0.002 + sr.dribbling * 0.002 + sr.shooting * 0.001),
    RW: (sr.pace * 0.002 + sr.dribbling * 0.002 + sr.shooting * 0.001),
    ST: (sr.shooting * 0.003 + sr.pace * 0.001 + sr.physical * 0.001),
    CF: (sr.shooting * 0.002 + sr.passing * 0.001 + sr.dribbling * 0.001 + sr.pace * 0.001),
  };
  return bonuses[position] || 0;
}

function gradePlayerForPosition(player: PlayerInput, position: Position): number {
  const isNatural = player.position === position;
  const compatible = POSITION_COMPATIBILITY[player.position] || [player.position];
  const isCompatible = compatible.includes(position);
  const positionFit = isNatural ? 1.0 : isCompatible ? 0.75 : 0.45;
  const skill = skillBonus(player, position);
  return (player.overall * 0.7 + player.overall * skill) * positionFit;
}

function calculateTeamScore(slots: TeamSlot[]): number {
  let totalScore = 0;
  let synergyBonus = 0;
  const assignedPlayers = slots.filter((s) => s.player).map((s) => s.player!);

  for (const slot of slots) {
    if (!slot.player) continue;
    totalScore += gradePlayerForPosition(slot.player, slot.position);
  }

  if (assignedPlayers.length >= 2) {
    const styles = assignedPlayers.map((p) => p.playingStyle);
    const dominantStyle = styles.sort(
      (a, b) => styles.filter((s) => s === b).length - styles.filter((s) => s === a).length
    )[0];
    for (const style of styles) {
      synergyBonus += (STYLE_SYNERGY[dominantStyle]?.[style] || 1.0) - 1.0;
    }
  }

  const ageSpread = assignedPlayers.length > 1
    ? Math.max(...assignedPlayers.map((p) => p.age)) - Math.min(...assignedPlayers.map((p) => p.age))
    : 0;
  const ageBonus = ageSpread >= 3 && ageSpread <= 8 ? 1.02 : 1.0;

  return (totalScore * (1 + synergyBonus * 0.1)) * ageBonus;
}

export function generateTeam(
  players: PlayerInput[],
  formationSlots: Position[],
  teamName: string
): TeamResult {
  const result: TeamSlot[] = formationSlots.map((pos) => ({ position: pos, player: null }));
  const used = new Set<string>();

  for (let i = 0; i < result.length; i++) {
    const position = result[i].position;
    const candidates = players
      .filter((p) => !used.has(p.id))
      .map((p) => ({ player: p, score: gradePlayerForPosition(p, position) }))
      .sort((a, b) => b.score - a.score);

    if (candidates.length > 0) {
      result[i].player = candidates[0].player;
      used.add(candidates[0].player.id);
    }
  }

  const filledCount = result.filter((s) => s.player).length;
  const totalCount = result.length;

  return {
    slots: result,
    score: calculateTeamScore(result) * (filledCount / totalCount),
    formation: teamName,
  };
}

export function generateOptimalTeam(
  players: PlayerInput[],
  formationSlots: Position[],
  teamName: string,
  iterations: number = 100
): TeamResult {
  let best: TeamResult = { slots: [], score: 0, formation: teamName };

  for (let iter = 0; iter < iterations; iter++) {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const candidate = generateTeam(shuffled, formationSlots, teamName);
    if (candidate.score > best.score) {
      best = candidate;
    }
  }

  return best;
}
