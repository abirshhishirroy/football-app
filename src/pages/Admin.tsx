import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export function Admin() {
  const { user } = useAuth();
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [tab, setTab] = useState<'players' | 'teams'>('players');

  useEffect(() => {
    api.getPlayers().then(setPlayers);
    api.getTeams().then(setTeams);
  }, []);

  if (user?.role !== 'admin') return <Navigate to="/" />;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black">Admin Panel</h1>
      <p className="text-gray-400">Manage all data in the system</p>

      <div className="flex gap-2">
        <button onClick={() => setTab('players')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'players' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
          Players ({players.length})
        </button>
        <button onClick={() => setTab('teams')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'teams' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
          Teams ({teams.length})
        </button>
      </div>

      {tab === 'players' && (
        <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 text-left text-sm text-gray-400">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3">Age</th>
                <th className="px-4 py-3">Overall</th>
                <th className="px-4 py-3">Style</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id} className="border-b border-gray-800 hover:bg-gray-800/50 text-sm">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3"><span className="bg-gray-700 text-xs px-2 py-0.5 rounded">{p.position}</span></td>
                  <td className="px-4 py-3 text-gray-400">{p.age}</td>
                  <td className="px-4 py-3 font-bold text-green-400">{p.overall}</td>
                  <td className="px-4 py-3 text-gray-400 capitalize">{p.playingStyle}</td>
                  <td className="px-4 py-3">
                    <button onClick={async () => { if (confirm('Delete?')) { await api.deletePlayer(p.id); api.getPlayers().then(setPlayers); } }}
                      className="text-red-400 hover:text-red-300 text-xs">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {players.length === 0 && <p className="text-center text-gray-500 py-8">No players</p>}
        </div>
      )}

      {tab === 'teams' && (
        <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 text-left text-sm text-gray-400">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Formation</th>
                <th className="px-4 py-3">Players</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t: any) => (
                <tr key={t.id} className="border-b border-gray-800 hover:bg-gray-800/50 text-sm">
                  <td className="px-4 py-3 font-medium">{t.name}</td>
                  <td className="px-4 py-3 text-gray-400">{t.formation}</td>
                  <td className="px-4 py-3 text-gray-400">{t.players?.length || 0}</td>
                  <td className="px-4 py-3">
                    {t.isAiGenerated
                      ? <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">AI</span>
                      : <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">Manual</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={async () => { if (confirm('Delete?')) { await api.deleteTeam(t.id); api.getTeams().then(setTeams); } }}
                      className="text-red-400 hover:text-red-300 text-xs">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {teams.length === 0 && <p className="text-center text-gray-500 py-8">No teams</p>}
        </div>
      )}
    </div>
  );
}
