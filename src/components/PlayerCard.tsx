import { useState } from 'react';
import type { Player, SkillRatings } from '../types';

interface EFootballCardProps {
  player: Partial<Player> & { skillRatings?: SkillRatings; pace?: number; shooting?: number; passing?: number; dribbling?: number; defending?: number; physical?: number; goalkeeping?: number; stamina?: number; archetype?: string };
  onClick?: () => void;
  selected?: boolean;
  compact?: boolean;
  size?: 'normal' | 'large';
}

function getSkillRatings(player: EFootballCardProps['player']): SkillRatings {
  if (player.skillRatings) return player.skillRatings;
  return {
    pace: player.pace ?? 50,
    shooting: player.shooting ?? 50,
    passing: player.passing ?? 50,
    dribbling: player.dribbling ?? 50,
    defending: player.defending ?? 50,
    physical: player.physical ?? 50,
    goalkeeping: player.goalkeeping,
    stamina: player.stamina ?? 50,
    archetype: player.archetype ?? 'All-Rounder',
  };
}

function getOverallColor(overall: number): string {
  if (overall >= 90) return '#ffd700';
  if (overall >= 85) return '#ff6b35';
  if (overall >= 80) return '#00e676';
  if (overall >= 75) return '#00bcd4';
  if (overall >= 70) return '#4caf50';
  if (overall >= 65) return '#8bc34a';
  if (overall >= 60) return '#9e9e9e';
  return '#f44336';
}

function getCardGradient(position: string): string {
  const gradients: Record<string, string> = {
    GK: 'from-amber-900 via-yellow-800 to-amber-950',
    CB: 'from-blue-900 via-indigo-800 to-blue-950',
    LB: 'from-cyan-900 via-teal-800 to-cyan-950',
    RB: 'from-cyan-900 via-teal-800 to-cyan-950',
    CDM: 'from-teal-900 via-emerald-800 to-teal-950',
    CM: 'from-emerald-900 via-green-800 to-emerald-950',
    CAM: 'from-purple-900 via-violet-800 to-purple-950',
    LW: 'from-pink-900 via-rose-800 to-pink-950',
    RW: 'from-pink-900 via-rose-800 to-pink-950',
    ST: 'from-red-900 via-orange-800 to-red-950',
    CF: 'from-orange-900 via-amber-800 to-orange-950',
  };
  return gradients[position] || 'from-gray-800 via-gray-700 to-gray-900';
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getRatingTier(overall: number): string {
  if (overall >= 90) return 'LEGENDARY';
  if (overall >= 85) return 'WORLD CLASS';
  if (overall >= 80) return 'ELITE';
  if (overall >= 75) return 'GREAT';
  if (overall >= 70) return 'GOOD';
  if (overall >= 65) return 'AVERAGE';
  return 'BEGINNER';
}

function StatHex({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? '#00e676' : value >= 65 ? '#ffc107' : value >= 50 ? '#ff9800' : '#f44336';
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="text-[10px] text-white/50 font-medium uppercase tracking-wider">{label}</div>
      <div className="relative w-10 h-10 flex items-center justify-center">
        <svg className="absolute inset-0" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
          <circle
            cx="18" cy="18" r="16" fill="none" stroke={color} strokeWidth="2.5"
            strokeDasharray={`${(value / 100) * 100.53} 100.53`}
            strokeDashoffset="0"
            transform="rotate(-90 18 18)"
            strokeLinecap="round"
          />
        </svg>
        <span className="text-xs font-black text-white relative z-10">{value}</span>
      </div>
    </div>
  );
}

function StatBar({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? 'bg-green-400' : value >= 65 ? 'bg-yellow-400' : value >= 50 ? 'bg-orange-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 text-[10px] text-white/50 font-medium uppercase">{label}</span>
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${value}%` }} />
      </div>
      <span className="w-5 text-right text-[10px] font-bold text-white/70">{value}</span>
    </div>
  );
}

export function PlayerCard({ player, onClick, selected, compact, size = 'normal' }: EFootballCardProps) {
  const sr = getSkillRatings(player);
  const overall = player.overall ?? 50;
  const position = player.position ?? 'CM';
  const name = player.name ?? 'Unknown';
  const archetype = player.archetype ?? 'All-Rounder';
  const [imgError, setImgError] = useState(false);
  const showAvatar = player.avatarUrl && !imgError;

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 p-2 rounded-lg border transition-all ${
          selected
            ? 'border-green-500 bg-green-500/10'
            : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
        }`}
      >
        {showAvatar ? (
          <img src={player.avatarUrl!} alt="" className="w-7 h-7 rounded-full object-cover border border-gray-600" onError={() => setImgError(true)} />
        ) : (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-[9px] font-bold text-white/70">
            {getInitials(name)}
          </div>
        )}
        <span className="bg-gray-700 text-[9px] font-bold px-1.5 py-0.5 rounded">{position}</span>
        <span className="flex-1 text-sm font-medium truncate">{name}</span>
        <span className="text-sm font-black" style={{ color: getOverallColor(overall) }}>{overall}</span>
      </button>
    );
  }

  const cardSize = size === 'large' ? 'w-72' : 'w-56';

  return (
    <div
      onClick={onClick}
      className={`${cardSize} rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-green-500/10 ${
        selected ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-gray-950' : ''
      }`}
    >
      <div className={`relative bg-gradient-to-br ${getCardGradient(position)} h-full`}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

        {/* Top bar: Position + Rating */}
        <div className="relative z-10 flex items-start justify-between p-3 pb-0">
          <div className="flex flex-col items-center">
            <span className="bg-black/40 backdrop-blur-sm text-white text-xs font-black px-3 py-1 rounded-lg border border-white/20">
              {position}
            </span>
            {player.playingStyle && (
              <span className="text-[9px] text-white/40 mt-1 capitalize">{player.playingStyle}</span>
            )}
          </div>
          <div className="text-right">
            <div className="text-4xl font-black leading-none" style={{ color: getOverallColor(overall), textShadow: `0 0 20px ${getOverallColor(overall)}40` }}>
              {overall}
            </div>
            <div className="text-[8px] text-white/40 font-bold tracking-wider">{getRatingTier(overall)}</div>
          </div>
        </div>

        {/* Avatar */}
        <div className="relative z-10 flex justify-center py-3">
          {showAvatar ? (
            <div className="relative">
              <img
                src={player.avatarUrl!}
                alt={name}
                className="w-24 h-24 rounded-full object-cover border-3 border-white/20 shadow-lg"
                onError={() => setImgError(true)}
              />
              <div className="absolute inset-0 w-24 h-24 rounded-full bg-gradient-to-br from-white/10 to-transparent" />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-white/20 to-white/5 border-3 border-white/20 flex items-center justify-center shadow-lg">
              <span className="text-2xl font-black text-white/60">{getInitials(name)}</span>
            </div>
          )}
        </div>

        {/* Name + Archetype */}
        <div className="relative z-10 text-center px-3">
          <h3 className="text-sm font-black text-white tracking-wide leading-tight">{name.toUpperCase()}</h3>
          <div className="text-[9px] text-white/50 mt-0.5 italic">{archetype}</div>
          {player.age && (
            <div className="flex items-center justify-center gap-2 mt-1 text-[10px] text-white/40">
              <span>{player.age} yrs</span>
              {player.height && <span>{player.height}cm</span>}
            </div>
          )}
        </div>

        {/* Stats hexagons */}
        <div className="relative z-10 grid grid-cols-3 gap-2 px-3 pt-3">
          <StatHex label="PAC" value={sr.pace} />
          <StatHex label="SHO" value={sr.shooting} />
          <StatHex label="PAS" value={sr.passing} />
          <StatHex label="DRI" value={sr.dribbling} />
          <StatHex label="DEF" value={sr.defending} />
          <StatHex label="PHY" value={sr.physical} />
          <StatHex label="STA" value={sr.stamina} />
        </div>

        {/* Bottom stats bars (shown in large mode) */}
        {size === 'large' && (
          <div className="relative z-10 px-3 pt-3 pb-1 space-y-1">
            <StatBar label="PAC" value={sr.pace} />
            <StatBar label="SHO" value={sr.shooting} />
            <StatBar label="PAS" value={sr.passing} />
            <StatBar label="DRI" value={sr.dribbling} />
            <StatBar label="DEF" value={sr.defending} />
            <StatBar label="PHY" value={sr.physical} />
            <StatBar label="STA" value={sr.stamina} />
          </div>
        )}

        <div className="h-3" />
      </div>
    </div>
  );
}
