import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { FORMATIONS, type Formation, type Position } from '../types';
import { PlayerCard } from '../components/PlayerCard';

export function TeamBuilder() {
  const [players, setPlayers] = useState<any[]>([]);
  const [formation, setFormation] = useState<Formation>('4-4-2');
  const [teamName, setTeamName] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { api.getPlayers().then(setPlayers); }, []);

  const togglePlayer = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleGenerate = async () => {
    if (!teamName.trim()) { setError('Team name required'); return; }
    setError('');
    setLoading(true);
    try {
      const data = await api.generateTeam({
        formation,
        teamName: teamName.trim(),
        playerIds: selectedIds.size > 0 ? Array.from(selectedIds) : undefined,
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formationSlots = FORMATIONS[formation];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black">AI Team Builder</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 space-y-4">
            <h2 className="text-lg font-bold">Configuration</h2>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Team Name</label>
              <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g. Dream Team"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Formation</label>
              <select value={formation} onChange={(e) => setFormation(e.target.value as Formation)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                {Object.keys(FORMATIONS).map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="text-xs text-gray-400">
              Formation slots: {formationSlots.join(' - ')}
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-700 p-6">
            <h2 className="text-lg font-bold mb-3">Select Players ({selectedIds.size})</h2>
            <p className="text-xs text-gray-400 mb-3">Optional: select specific players. Leave empty to use all.</p>
            <div className="max-h-96 overflow-y-auto space-y-1">
              {players.map((p) => (
                <PlayerCard key={p.id} player={p} compact onClick={() => togglePlayer(p.id)} selected={selectedIds.has(p.id)} />
              ))}
            </div>
            {players.length === 0 && <p className="text-sm text-gray-500">No players available</p>}
          </div>

          {error && <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-2 rounded-lg text-sm">{error}</div>}

          <button onClick={handleGenerate} disabled={loading || players.length < 11}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors text-lg">
            {loading ? 'Generating...' : '🤖 Generate Team'}
          </button>
          {players.length < 11 && <p className="text-xs text-red-400">Need at least 11 players ({players.length}/11)</p>}
        </div>

        <div className="lg:col-span-2">
          {result ? (
            <div className="space-y-4">
              <div className="bg-gray-900 rounded-xl border border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-black">{result.team.name}</h2>
                    <p className="text-gray-400">{result.team.formation} · AI Generated</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-yellow-400">{result.score}</div>
                    <p className="text-xs text-gray-400">Team Score</p>
                  </div>
                </div>
              </div>

              <Pitch formation={formation} slots={formationSlots} teamPlayers={result.team.players} />
            </div>
          ) : (
            <div className="bg-gray-900 rounded-xl border border-gray-700 p-12 flex flex-col items-center justify-center text-center">
              <div className="text-6xl mb-4">⚽</div>
              <h3 className="text-xl font-bold text-gray-300">No team generated yet</h3>
              <p className="text-gray-500 mt-2 max-w-md">
                Configure your team settings and click "Generate Team" to let AI build the optimal lineup.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Pitch({ slots, teamPlayers }: { formation: string; slots: Position[]; teamPlayers: any[] }) {
  const posMap = new Map<string, any>();
  teamPlayers.forEach((tp) => posMap.set(tp.positionInTeam, tp));

  const slotGroups: { label: string; positions: string[] }[] = [];
  let current: string[] = [];

  for (let i = 0; i < slots.length; i++) {
    if (slots[i] === 'GK') {
      if (current.length) slotGroups.push({ label: '', positions: [...current] });
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
  if (current.length) slotGroups.push({ label: 'FWD', positions: [...current] });

  return (
    <div className="bg-green-800/30 border border-green-700/50 rounded-xl p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-white" />
        <div className="absolute left-1/2 top-[25%] -translate-x-1/2 w-24 h-24 border border-white rounded-full" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full" />
      </div>
      <div className="relative space-y-6">
        {slotGroups.map((group, gi) => (
          <div key={gi}>
            <div className={`flex justify-center gap-3 flex-wrap ${group.label === 'GK' ? 'mb-4' : ''}`}>
              {group.positions.map((pos, pi) => {
                const player = posMap.get(pos);
                return (
                  <div key={pi} className="bg-gray-900/90 border border-gray-600 rounded-lg p-3 min-w-[120px] text-center">
                    <div className="text-[10px] text-gray-400 mb-1">{pos}</div>
                    {player ? (
                      <>
                        <div className="text-sm font-bold truncate">{player.name}</div>
                        <div className="text-xs text-green-400 font-bold">{player.overall}</div>
                      </>
                    ) : (
                      <div className="text-xs text-gray-500">Empty</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
