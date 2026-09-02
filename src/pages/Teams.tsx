import { useEffect, useState } from 'react';
import { api } from '../api/client';

export function Teams() {
  const [teams, setTeams] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = () => api.getTeams().then(setTeams);
  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (confirm('Delete this team?')) {
      await api.deleteTeam(id);
      if (expanded === id) setExpanded(null);
      load();
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black">Teams</h1>

      {teams.length === 0 ? (
        <div className="text-center text-dim py-12">
          <p className="text-4xl mb-4">👕</p>
          <p>No teams yet. Use the AI Team Builder to create one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map((team) => (
            <div key={team.id} className="bg-card rounded-xl border border-border-card overflow-hidden">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold">{team.name}</h3>
                    {team.isAiGenerated ? (
                      <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">AI</span>
                    ) : (
                      <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">Manual</span>
                    )}
                  </div>
                  <p className="text-sm text-muted mt-0.5">{team.formation} · {team.players?.length || 0} players</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setExpanded(expanded === team.id ? null : team.id)}
                    className="text-sm bg-input hover:bg-active text-secondary px-3 py-1 rounded transition-colors"
                  >
                    {expanded === team.id ? 'Hide' : 'View'}
                  </button>
                  <button
                    onClick={() => handleDelete(team.id)}
                    className="text-sm bg-red-600/20 hover:bg-red-600 text-red-400 px-3 py-1 rounded transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {expanded === team.id && team.players && (
                <div className="border-t border-border-card p-4 bg-input/50">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {team.players.map((p: any) => (
                      <div key={p.id} className="flex items-center gap-2 p-2 bg-card/50 rounded-lg">
                        <span className="bg-active text-[10px] font-bold px-1.5 py-0.5 rounded">{p.positionInTeam || p.position}</span>
                        <span className="text-sm truncate">{p.name}</span>
                        <span className="text-xs text-brand font-bold ml-auto">{p.overall}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
