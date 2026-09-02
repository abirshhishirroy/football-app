import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { FORMATION_PRESETS, POSITIONS, type Position } from '../types';

type TeamSide = 'A' | 'B';

interface SlotAssignment {
  position: string;
  playerId: string;
}

interface TeamResult {
  name: string;
  slots: { position: string; player: any | null }[];
  score: number;
  players: any[];
}

export function TeamBuilder() {
  const [players, setPlayers] = useState<any[]>([]);
  const [formationMode, setFormationMode] = useState<'preset' | 'custom'>('preset');
  const [presetName, setPresetName] = useState('1-2-2-1 (6v6)');
  const [customSlots, setCustomSlots] = useState<Position[]>(['GK', 'CB', 'CB', 'CM', 'CM', 'ST']);
  const [teamAName, setTeamAName] = useState('Team A');
  const [teamBName, setTeamBName] = useState('Team B');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [teamA, setTeamA] = useState<TeamResult | null>(null);
  const [teamB, setTeamB] = useState<TeamResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingTeam, setEditingTeam] = useState<TeamSide | null>(null);
  const [editSlotsA, setEditSlotsA] = useState<SlotAssignment[]>([]);
  const [editSlotsB, setEditSlotsB] = useState<SlotAssignment[]>([]);

  useEffect(() => { api.getPlayers().then(setPlayers); }, []);

  const getFormationSlots = (): Position[] => {
    if (formationMode === 'preset') {
      return FORMATION_PRESETS[presetName] || ['GK', 'CB', 'CB', 'CM', 'CM', 'ST'];
    }
    return customSlots;
  };

  const formationSlots = getFormationSlots();
  const minPlayers = formationSlots.length * 2;

  const togglePlayer = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleGenerate = async () => {
    if (teamAName.trim() === '' || teamBName.trim() === '') {
      setError('Team names required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await api.generateBothTeams({
        formation: formationSlots,
        playerIds: selectedIds.size > 0 ? Array.from(selectedIds) : [],
        teamAName: teamAName.trim(),
        teamBName: teamBName.trim(),
      });
      setTeamA(data.teamA);
      setTeamB(data.teamB);
      setEditingTeam(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (side: TeamSide) => {
    const team = side === 'A' ? teamA : teamB;
    if (!team) return;
    const slots = team.slots.map(s => ({
      position: s.position,
      playerId: s.player?.id || '',
    }));
    if (side === 'A') {
      setEditSlotsA(slots);
    } else {
      setEditSlotsB(slots);
    }
    setEditingTeam(side);
  };

  const updateEditSlot = (side: TeamSide, index: number, playerId: string) => {
    if (side === 'A') {
      const next = [...editSlotsA];
      next[index] = { ...next[index], playerId };
      setEditSlotsA(next);
    } else {
      const next = [...editSlotsB];
      next[index] = { ...next[index], playerId };
      setEditSlotsB(next);
    }
  };

  const addEditSlot = (side: TeamSide, position: Position) => {
    if (side === 'A') {
      setEditSlotsA([...editSlotsA, { position, playerId: '' }]);
    } else {
      setEditSlotsB([...editSlotsB, { position, playerId: '' }]);
    }
  };

  const removeEditSlot = (side: TeamSide, index: number) => {
    if (side === 'A') {
      setEditSlotsA(editSlotsA.filter((_, i) => i !== index));
    } else {
      setEditSlotsB(editSlotsB.filter((_, i) => i !== index));
    }
  };

  const swapPlayerBetweenTeams = (fromSide: TeamSide, fromIndex: number) => {
    const fromSlots = fromSide === 'A' ? editSlotsA : editSlotsB;
    const toSlots = fromSide === 'A' ? editSlotsB : editSlotsA;
    const fromSlot = fromSlots[fromIndex];
    if (!fromSlot.playerId) return;

    const toIndex = toSlots.findIndex(s => s.playerId === fromSlot.playerId);
    if (toIndex !== -1) {
      const toPlayerId = toSlots[toIndex].playerId;
      const fromPlayerId = fromSlot.playerId;
      if (fromSide === 'A') {
        const nextA = [...editSlotsA];
        const nextB = [...editSlotsB];
        nextA[fromIndex] = { ...nextA[fromIndex], playerId: toPlayerId };
        nextB[toIndex] = { ...nextB[toIndex], playerId: fromPlayerId };
        setEditSlotsA(nextA);
        setEditSlotsB(nextB);
      } else {
        const nextA = [...editSlotsA];
        const nextB = [...editSlotsB];
        nextB[fromIndex] = { ...nextB[fromIndex], playerId: toPlayerId };
        nextA[toIndex] = { ...nextA[toIndex], playerId: fromPlayerId };
        setEditSlotsA(nextA);
        setEditSlotsB(nextB);
      }
    } else {
      if (fromSide === 'A') {
        const nextA = [...editSlotsA];
        const nextB = [...editSlotsB];
        nextA[fromIndex] = { ...nextA[fromIndex], playerId: '' };
        nextB.push({ position: fromSlot.position, playerId: fromSlot.playerId });
        setEditSlotsA(nextA);
        setEditSlotsB(nextB);
      } else {
        const nextA = [...editSlotsA];
        const nextB = [...editSlotsB];
        nextB[fromIndex] = { ...nextB[fromIndex], playerId: '' };
        nextA.push({ position: fromSlot.position, playerId: fromSlot.playerId });
        setEditSlotsA(nextA);
        setEditSlotsB(nextB);
      }
    }
  };

  const savePositions = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.swapPlayers({
        teamASlots: editSlotsA,
        teamBSlots: editSlotsB,
        formation: formationSlots,
        teamAName: teamAName.trim(),
        teamBName: teamBName.trim(),
      });
      setTeamA(data.teamA);
      setTeamB(data.teamB);
      setEditingTeam(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelEditing = () => {
    setEditingTeam(null);
    setEditSlotsA([]);
    setEditSlotsB([]);
  };

  const allPlayerIds = new Set([
    ...(teamA?.players || []).map((p: any) => p.id),
    ...(teamB?.players || []).map((p: any) => p.id),
  ]);

  const groupedFormations = Object.keys(FORMATION_PRESETS).reduce((acc, key) => {
    const match = key.match(/\((.+)\)/);
    const size = match ? match[1] : 'Other';
    if (!acc[size]) acc[size] = [];
    acc[size].push(key);
    return acc;
  }, {} as Record<string, string[]>);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black">AI Team Builder</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-card rounded-xl border border-border-card p-6 space-y-4">
            <h2 className="text-lg font-bold">Configuration</h2>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Team A Name</label>
              <input value={teamAName} onChange={(e) => setTeamAName(e.target.value)} placeholder="e.g. Dream Team"
                className="w-full bg-input border border-border-input rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Team B Name</label>
              <input value={teamBName} onChange={(e) => setTeamBName(e.target.value)} placeholder="e.g. All Stars"
                className="w-full bg-input border border-border-input rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-2">Formation Mode</label>
              <div className="flex gap-2 mb-3">
                <button onClick={() => setFormationMode('preset')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${formationMode === 'preset' ? 'bg-brand text-white' : 'bg-input text-muted hover:bg-active'}`}>
                  Presets
                </button>
                <button onClick={() => setFormationMode('custom')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${formationMode === 'custom' ? 'bg-brand text-white' : 'bg-input text-muted hover:bg-active'}`}>
                  Custom
                </button>
              </div>

              {formationMode === 'preset' ? (
                <select value={presetName} onChange={(e) => setPresetName(e.target.value)}
                  className="w-full bg-input border border-border-input rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                  {Object.entries(groupedFormations).map(([size, formations]) => (
                    <optgroup key={size} label={size}>
                      {formations.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {POSITIONS.map((pos) => (
                      <button key={pos} onClick={() => setCustomSlots([...customSlots, pos])}
                        className="px-2 py-1 bg-input hover:bg-active text-secondary text-xs rounded transition-colors">
                        + {pos}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {customSlots.map((slot, i) => (
                      <span key={i} className="flex items-center gap-1 px-2 py-1 bg-input text-secondary text-xs rounded">
                        {slot}
                        <button onClick={() => setCustomSlots(customSlots.filter((_, j) => j !== i))}
                          className="text-red-400 hover:text-red-300 ml-1">×</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="text-xs text-muted">
              Formation slots ({formationSlots.length} per team): {formationSlots.join(' - ')}
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border-card p-6">
            <h2 className="text-lg font-bold mb-3">Select Players ({selectedIds.size})</h2>
            <p className="text-xs text-muted mb-3">Optional: select specific players. Leave empty to use all.</p>
            <div className="max-h-96 overflow-y-auto space-y-1">
              {players.map((p) => (
                <button key={p.id} onClick={() => togglePlayer(p.id)}
                  className={`w-full text-left p-2 rounded-lg text-sm transition-colors ${selectedIds.has(p.id) ? 'bg-brand/20 border border-brand/50' : 'bg-input hover:bg-active border border-transparent'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-xs text-muted">{p.overall} OVR</span>
                  </div>
                  <div className="text-xs text-dim">{p.position}</div>
                </button>
              ))}
            </div>
            {players.length === 0 && <p className="text-sm text-dim">No players available</p>}
          </div>

          {error && <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-2 rounded-lg text-sm">{error}</div>}

          <button onClick={handleGenerate} disabled={loading || players.length < minPlayers}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors text-lg">
            {loading ? 'Generating...' : '🤖 Generate Teams'}
          </button>
          {players.length < minPlayers && (
            <p className="text-xs text-red-400">Need at least {minPlayers} players ({players.length}/{minPlayers})</p>
          )}
        </div>

        <div className="lg:col-span-2">
          {teamA && teamB ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card rounded-xl border border-border-card p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-blue-400">{teamA.name}</h3>
                    <span className="text-2xl font-black text-yellow-400">{teamA.score}</span>
                  </div>
                </div>
                <div className="bg-card rounded-xl border border-border-card p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-orange-400">{teamB.name}</h3>
                    <span className="text-2xl font-black text-yellow-400">{teamB.score}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Pitch
                  teamName={teamA.name}
                  slots={formationSlots}
                  teamPlayers={teamA.players}
                  color="blue"
                />
                <Pitch
                  teamName={teamB.name}
                  slots={formationSlots}
                  teamPlayers={teamB.players}
                  color="orange"
                />
              </div>

              {editingTeam ? (
                <div className="bg-card rounded-xl border border-border-card p-6 space-y-4">
                  <h3 className="text-lg font-bold">Edit Positions</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <EditTeamPanel
                      side="A"
                      name={teamAName}
                      slots={editSlotsA}
                      players={players}
                      allPlayerIds={allPlayerIds}
                      onUpdate={updateEditSlot}
                      onAdd={addEditSlot}
                      onRemove={removeEditSlot}
                      onSwap={swapPlayerBetweenTeams}
                      formationSlots={formationSlots}
                    />
                    <EditTeamPanel
                      side="B"
                      name={teamBName}
                      slots={editSlotsB}
                      players={players}
                      allPlayerIds={allPlayerIds}
                      onUpdate={updateEditSlot}
                      onAdd={addEditSlot}
                      onRemove={removeEditSlot}
                      onSwap={swapPlayerBetweenTeams}
                      formationSlots={formationSlots}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={savePositions} disabled={loading}
                      className="bg-brand hover:bg-brand-hover disabled:bg-brand-dim text-white font-semibold px-6 py-2 rounded-lg transition-colors">
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button onClick={cancelEditing}
                      className="bg-active hover:bg-active text-secondary px-6 py-2 rounded-lg transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => startEditing('A')}
                    className="bg-input hover:bg-active text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm">
                    ✏️ Edit Team A
                  </button>
                  <button onClick={() => startEditing('B')}
                    className="bg-input hover:bg-active text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm">
                    ✏️ Edit Team B
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border-card p-12 flex flex-col items-center justify-center text-center">
              <div className="text-6xl mb-4">⚽</div>
              <h3 className="text-xl font-bold text-secondary">No teams generated yet</h3>
              <p className="text-dim mt-2 max-w-md">
                Configure your team settings and click "Generate Teams" to let AI build balanced lineups.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EditTeamPanel({ side, name, slots, players, allPlayerIds, onUpdate, onAdd, onRemove, onSwap, formationSlots }: {
  side: TeamSide;
  name: string;
  slots: SlotAssignment[];
  players: any[];
  allPlayerIds: Set<string>;
  onUpdate: (side: TeamSide, index: number, playerId: string) => void;
  onAdd: (side: TeamSide, position: Position) => void;
  onRemove: (side: TeamSide, index: number) => void;
  onSwap: (side: TeamSide, fromIndex: number) => void;
  formationSlots: Position[];
}) {
  const color = side === 'A' ? 'blue' : 'orange';

  return (
    <div className={`bg-input rounded-lg p-4 border-${color}-500/30`}>
      <div className={`text-sm font-bold text-${color}-400 mb-3`}>{name}</div>
      <div className="space-y-2">
        {slots.map((slot, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[10px] text-muted w-8">{slot.position}</span>
            <select value={slot.playerId} onChange={(e) => onUpdate(side, i, e.target.value)}
              className="flex-1 bg-card border border-border-input rounded px-2 py-1 text-white text-xs">
              <option value="">Empty</option>
              {players.filter(p => !allPlayerIds.has(p.id) || p.id === slot.playerId).map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.overall})</option>
              ))}
            </select>
            <button onClick={() => onSwap(side, i)} title="Swap with other team"
              className="text-yellow-400 hover:text-yellow-300 text-xs">⇄</button>
            <button onClick={() => onRemove(side, i)}
              className="text-red-400 hover:text-red-300 text-xs">×</button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1 mt-3">
        {formationSlots.map((pos, i) => (
          <button key={i} onClick={() => onAdd(side, pos)}
            className="px-2 py-1 bg-active hover:bg-active text-secondary text-[10px] rounded">
            + {pos}
          </button>
        ))}
      </div>
    </div>
  );
}

function Pitch({ teamName, slots, teamPlayers, color }: { teamName: string; slots: Position[]; teamPlayers: any[]; color: 'blue' | 'orange' }) {
  const posMap = new Map<string, any>();
  teamPlayers.forEach((tp: any) => posMap.set(tp.positionInTeam, tp));

  const slotGroups: { label: string; positions: Position[] }[] = [];
  let current: Position[] = [];

  for (let i = 0; i < slots.length; i++) {
    if (slots[i] === 'GK') {
      if (current.length) slotGroups.push({ label: 'DEF', positions: [...current] });
      current = [];
      slotGroups.push({ label: 'GK', positions: [slots[i]] });
    } else if (['CB', 'LB', 'RB'].includes(slots[i])) {
      current.push(slots[i]);
    } else if (['CDM', 'CM', 'CAM', 'LW', 'RW'].includes(slots[i])) {
      if (current.length && ['CB', 'LB', 'RB'].includes(current[0])) {
        slotGroups.push({ label: 'DEF', positions: [...current] });
        current = [];
      }
      current.push(slots[i]);
    } else {
      if (current.length) {
        slotGroups.push({ label: 'MID', positions: [...current] });
        current = [];
      }
      current.push(slots[i]);
    }
  }
  if (current.length) {
    const lastPos = current[0];
    const label = ['ST', 'CF'].includes(lastPos) ? 'FWD' : 'MID';
    slotGroups.push({ label, positions: [...current] });
  }

  const colorClasses = color === 'blue'
    ? { border: 'border-blue-500/50', text: 'text-blue-400', bg: 'bg-blue-500/10' }
    : { border: 'border-orange-500/50', text: 'text-orange-400', bg: 'bg-orange-500/10' };

  return (
    <div className={`bg-green-800/30 border ${colorClasses.border} rounded-xl p-4 relative overflow-hidden`}>
      <div className="absolute inset-0 opacity-10">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-white" />
        <div className="absolute left-1/2 top-[25%] -translate-x-1/2 w-16 h-16 border border-white rounded-full" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full" />
      </div>
      <div className="relative">
        <div className={`text-xs font-bold ${colorClasses.text} mb-3`}>{teamName}</div>
        <div className="space-y-3">
          {slotGroups.map((group, gi) => (
            <div key={gi}>
              <div className={`text-[10px] ${colorClasses.text} mb-1 uppercase tracking-wide`}>{group.label}</div>
              <div className="flex justify-center gap-2 flex-wrap">
                {group.positions.map((pos, pi) => {
                  const player = posMap.get(pos);
                  return (
                    <div key={pi} className={`${colorClasses.bg} border ${colorClasses.border} rounded-lg p-2 min-w-[90px] text-center`}>
                      <div className="text-[10px] text-muted mb-1">{pos}</div>
                      {player ? (
                        <>
                          <div className="text-xs font-bold truncate">{player.name}</div>
                          <div className="text-[10px] text-green-400 font-bold">{player.overall}</div>
                        </>
                      ) : (
                        <div className="text-[10px] text-dim">Empty</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
