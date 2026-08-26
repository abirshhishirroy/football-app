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
  overall: number;
  avatarUrl?: string | null;
  userId?: string | null;
  createdBy: string;
  createdAt: string;
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
  role: 'admin' | 'coach';
}

export interface TeamWithPlayers extends Team {
  players: (Player & { positionInTeam: string })[];
}

export type Formation = '4-4-2' | '4-3-3' | '3-5-2' | '4-2-3-1' | '5-3-2';

export const FORMATIONS: Record<Formation, Position[]> = {
  '4-4-2': ['GK', 'LB', 'CB', 'CB', 'RB', 'LW', 'CM', 'CM', 'RW', 'ST', 'ST'],
  '4-3-3': ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CM', 'CM', 'LW', 'ST', 'RW'],
  '3-5-2': ['GK', 'CB', 'CB', 'CB', 'LW', 'CDM', 'CM', 'CDM', 'RW', 'ST', 'ST'],
  '4-2-3-1': ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CDM', 'LW', 'CAM', 'RW', 'ST'],
  '5-3-2': ['GK', 'LB', 'CB', 'CB', 'CB', 'RB', 'CM', 'CM', 'CM', 'ST', 'ST'],
};

export const POSITIONS: Position[] = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST', 'CF'];

export const PLAYING_STYLES: PlayingStyle[] = ['defensive', 'balanced', 'attacking', 'possession', 'counter-attack'];
