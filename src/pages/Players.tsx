import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PlayerCard } from '../components/PlayerCard';
import { PlayerForm } from '../components/PlayerForm';

export function Players() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [players, setPlayers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterPos, setFilterPos] = useState('all');

  const load = () => api.getPlayers().then(setPlayers);
  useEffect(() => { load(); }, []);

  const filtered = players.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchPos = filterPos === 'all' || p.position === filterPos;
    return matchSearch && matchPos;
  });

  const [regenerating, setRegenerating] = useState<string | null>(null);

  const handleAdd = async (data: any) => {
    await api.createPlayer(data);
    setShowForm(false);
    load();
  };

  const handleEdit = async (data: any) => {
    await api.updatePlayer(editing.id, data);
    setEditing(null);
    load();
  };

  const handleRegenerateStats = async (playerId: string) => {
    setRegenerating(playerId);
    try {
      await api.generatePlayerStats(playerId);
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRegenerating(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this player?')) {
      await api.deletePlayer(id);
      if (selectedId === id) setSelectedId(null);
      load();
    }
  };

  const selectedPlayer = players.find((p) => p.id === selectedId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-black">Players</h1>
        {isAdmin && (
          <button
            onClick={() => { setShowForm(!showForm); setEditing(null); }}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            {showForm ? 'Cancel' : '+ Add Player'}
          </button>
        )}
      </div>

      {(showForm || editing) && (
        <PlayerForm initial={editing} onSubmit={editing ? handleEdit : handleAdd} onCancel={() => { setShowForm(false); setEditing(null); }} isAdmin={true} />
      )}

      <div className="flex flex-col md:flex-row gap-3">
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search players..."
          className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <select value={filterPos} onChange={(e) => setFilterPos(e.target.value)} className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
          <option value="all">All Positions</option>
          <option value="GK">GK</option>
          <option value="CB">CB</option>
          <option value="LB">LB</option>
          <option value="RB">RB</option>
          <option value="CDM">CDM</option>
          <option value="CM">CM</option>
          <option value="CAM">CAM</option>
          <option value="LW">LW</option>
          <option value="RW">RW</option>
          <option value="ST">ST</option>
          <option value="CF">CF</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((player) => (
          <div key={player.id} className="relative group">
            <PlayerCard
              player={player}
              onClick={() => setSelectedId(selectedId === player.id ? null : player.id)}
              selected={selectedId === player.id}
            />
            {isAdmin && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); handleRegenerateStats(player.id); }}
                  disabled={regenerating === player.id}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white text-xs px-2 py-1 rounded"
                  title="Regenerate stats via AI"
                >
                  {regenerating === player.id ? '...' : 'AI'}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setEditing(player); setShowForm(false); }}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(player.id); }}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded"
                >
                  Del
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center text-gray-500 py-12">
          No players found. {players.length === 0 && 'Add your first player!'}
        </div>
      )}

      {selectedPlayer && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setSelectedId(null)}>
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="bg-gray-700 text-xs font-bold px-2 py-0.5 rounded">{selectedPlayer.position}</span>
                <h2 className="text-2xl font-black mt-1">{selectedPlayer.name}</h2>
                <p className="text-gray-400 text-sm">{selectedPlayer.age} yrs · {selectedPlayer.height}cm · {selectedPlayer.weight}kg · {selectedPlayer.playingStyle}</p>
                {selectedPlayer.archetype && (
                  <p className="text-green-400 text-xs mt-1 italic">{selectedPlayer.archetype}</p>
                )}
              </div>
              <div className="text-4xl font-black text-green-400">{selectedPlayer.overall}</div>
            </div>
            <div className="space-y-2">
              {[
                ['Pace', selectedPlayer.pace],
                ['Shooting', selectedPlayer.shooting],
                ['Passing', selectedPlayer.passing],
                ['Dribbling', selectedPlayer.dribbling],
                ['Defending', selectedPlayer.defending],
                ['Physical', selectedPlayer.physical],
                ['Stamina', selectedPlayer.stamina],
                ...(selectedPlayer.position === 'GK' ? [['Goalkeeping', selectedPlayer.goalkeeping]] : []),
              ].filter(([, v]) => v != null).map(([label, val]) => (
                <div key={label as string} className="flex items-center gap-3">
                  <span className="w-20 text-xs text-gray-400">{label as string}</span>
                  <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${val}%` }} />
                  </div>
                  <span className="w-8 text-right text-sm font-mono">{val as number}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setSelectedId(null)} className="mt-4 w-full bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg text-sm">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
