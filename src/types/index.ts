export type Position =
  | 'GK'
  | 'CB'
  | 'LB'
  | 'RB'
  | 'CDM'
  | 'CM'
  | 'CAM'
  | 'LW'
  | 'RW'
  | 'ST'
  | 'CF';

export type PlayingStyle =
  | 'defensive'
  | 'balanced'
  | 'attacking'
  | 'possession'
  | 'counter-attack';

export interface SkillRatings {
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  goalkeeping?: number;
  stamina: number;
  archetype: string;
}

export interface Player {
  id: string;
  name: string;
  age: number;
  height: number;
  weight: number;
  position: Position;
  playingStyle: PlayingStyle;
  weeklyActivity: number;
  skillRatings: SkillRatings;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  goalkeeping?: number;
  stamina: number;
  archetype: string;
  overall: number;
  avatarUrl?: string | null;
  userId?: string | null;
  createdBy: string;
  createdAt: string;
  goals: number;
  assists: number;
  matchesPlayed: number;
  wins: number;
}

export interface Team {
  id: string;
  name: string;
  formation: string;
  playerIds: string[];
  isAiGenerated: boolean;
  createdBy: string;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'player';
}

export interface MatchScorer {
  id: string;
  matchId: string;
  team: 'A' | 'B';
  playerId: string;
  isGoal: boolean;
  minute: number | null;
  playerName: string;
}

export interface Match {
  id: string;
  title: string;
  matchDate: string;
  description: string;
  status: 'upcoming' | 'full' | 'cancelled' | 'completed';
  formation: string;
  winner: 'A' | 'B' | 'draw' | null;
  scoreA: number | null;
  scoreB: number | null;
  createdBy: string;
  createdAt: string;
  signupDeadline: string;
  signupClosed: boolean;
  signups: any[];
  signupCount: number;
  teamData: any;
  scorers: MatchScorer[];
  venueName: string;
  venueLink: string;
  reportingTime: string;
}

export interface TeamWithPlayers extends Team {
  players: (Player & { positionInTeam: string })[];
}

export type Formation = string;

export const FORMATION_PRESETS: Record<string, Position[]> = {
  '1-2-1 (5v5)': ['GK', 'CB', 'CB', 'CM', 'ST'],
  '1-1-2-1 (5v5)': ['GK', 'CB', 'CM', 'CM', 'ST'],

  '1-2-2-1 (6v6)': ['GK', 'CB', 'CB', 'CM', 'CM', 'ST'],
  '1-3-1-1 (6v6)': ['GK', 'CB', 'CB', 'CB', 'CM', 'ST'],
  '1-2-1-2 (6v6)': ['GK', 'CB', 'CB', 'CM', 'ST', 'ST'],

  '1-3-2-1 (7v7)': ['GK', 'CB', 'CB', 'CB', 'CM', 'CM', 'ST'],
  '1-2-3-1 (7v7)': ['GK', 'CB', 'CB', 'CM', 'CM', 'CM', 'ST'],
  '1-3-1-2 (7v7)': ['GK', 'CB', 'CB', 'CB', 'CM', 'ST', 'ST'],

  '1-3-3-1 (8v8)': ['GK', 'CB', 'CB', 'CB', 'CM', 'CM', 'CM', 'ST'],
  '1-4-2-1 (8v8)': ['GK', 'CB', 'CB', 'CB', 'CB', 'CM', 'CM', 'ST'],
  '1-3-2-2 (8v8)': ['GK', 'CB', 'CB', 'CB', 'CM', 'CM', 'ST', 'ST'],

  '1-4-3-1 (9v9)': ['GK', 'CB', 'CB', 'CB', 'CB', 'CM', 'CM', 'CM', 'ST'],
  '1-3-4-1 (9v9)': ['GK', 'CB', 'CB', 'CB', 'CM', 'CM', 'CM', 'CM', 'ST'],
  '1-4-2-2 (9v9)': ['GK', 'CB', 'CB', 'CB', 'CB', 'CM', 'CM', 'ST', 'ST'],

  '1-4-4-1 (10v10)': ['GK', 'CB', 'CB', 'CB', 'CB', 'CM', 'CM', 'CM', 'CM', 'ST'],
  '1-3-4-2 (10v10)': ['GK', 'CB', 'CB', 'CB', 'CM', 'CM', 'CM', 'CM', 'ST', 'ST'],

  '4-4-2 (11v11)': ['GK', 'LB', 'CB', 'CB', 'RB', 'LW', 'CM', 'CM', 'RW', 'ST', 'ST'],
  '4-3-3 (11v11)': ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CM', 'CM', 'LW', 'ST', 'RW'],
  '3-5-2 (11v11)': ['GK', 'CB', 'CB', 'CB', 'LW', 'CDM', 'CM', 'CDM', 'RW', 'ST', 'ST'],
  '4-2-3-1 (11v11)': ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CDM', 'LW', 'CAM', 'RW', 'ST'],
  '5-3-2 (11v11)': ['GK', 'LB', 'CB', 'CB', 'CB', 'RB', 'CM', 'CM', 'CM', 'ST', 'ST'],
};

export const POSITIONS: Position[] = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST', 'CF'];

export const PLAYING_STYLES: PlayingStyle[] = ['defensive', 'balanced', 'attacking', 'possession', 'counter-attack'];

export interface MatchMemory {
  id: string;
  matchId: string;
  matchTitle: string;
  matchDate: string;
  url: string;
  thumbnailUrl: string;
  type: 'image' | 'video';
  caption: string | null;
  uploadedBy: string;
  uploaderName: string;
  createdAt: string;
}
