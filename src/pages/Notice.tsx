import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export function Notice() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getMatches();
      setMatches(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
  const nextFriday = new Date(today);
  nextFriday.setDate(today.getDate() + daysUntilFriday);
  const fridayStr = nextFriday.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Notice Board</h1>
          <p className="text-gray-400 mt-1">Weekly Friday football matches — sign up to play!</p>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            {showForm ? 'Cancel' : '+ Create Match'}
          </button>
        )}
      </div>

      <div className="bg-green-600/10 border border-green-500/30 rounded-xl p-5 flex items-center gap-4">
        <div className="text-4xl">📅</div>
        <div>
          <h3 className="font-bold text-green-400">Next Match Day</h3>
          <p className="text-gray-300">{fridayStr}</p>
        </div>
      </div>

      {showForm && <CreateMatchForm onCreated={() => { setShowForm(false); load(); }} onCancel={() => setShowForm(false)} />}

      {error && <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-2 rounded-lg text-sm">{error}</div>}

      {loading ? (
        <div className="text-center text-gray-500 py-12">Loading matches...</div>
      ) : matches.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          <div className="text-5xl mb-4">⚽</div>
          <p className="text-lg">No matches scheduled yet</p>
          <p className="text-sm mt-1">Ask your admin to create a match!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} currentUser={user} onRefresh={load} />
          ))}
        </div>
      )}
    </div>
  );
}

function CreateMatchForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState('Friday Football Match');
  const [matchDate, setMatchDate] = useState(() => {
    const d = new Date();
    const dayOfWeek = d.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    d.setDate(d.getDate() + daysUntilFriday);
    return d.toISOString().slice(0, 16);
  });
  const [description, setDescription] = useState('');
  const [formation, setFormation] = useState('4-4-2');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.createMatch({ title, matchDate, description, formation });
      onCreated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent';

  return (
    <form onSubmit={handleSubmit} className="bg-gray-900 rounded-xl border border-gray-700 p-6 space-y-4">
      <h2 className="text-lg font-bold">Create New Match</h2>
      {error && <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-2 rounded-lg text-sm">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Match Date & Time</label>
          <input type="datetime-local" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} required className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Formation</label>
          <select value={formation} onChange={(e) => setFormation(e.target.value)} className={inputClass}>
            <option value="4-4-2">4-4-2</option>
            <option value="4-3-3">4-3-3</option>
            <option value="3-5-2">3-5-2</option>
            <option value="4-2-3-1">4-2-3-1</option>
            <option value="5-3-2">5-3-2</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Description (optional)</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. friendly match at the park" className={inputClass} />
        </div>
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white font-semibold px-6 py-2 rounded-lg transition-colors">
          {loading ? 'Creating...' : 'Create Match'}
        </button>
        <button type="button" onClick={onCancel} className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-6 py-2 rounded-lg transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

function MatchCard({ match, currentUser, onRefresh }: { match: any; currentUser: any; onRefresh: () => void }) {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const isSignedUp = match.signups?.some((s: any) => s.userId === currentUser?.id);
  const matchDate = new Date(match.matchDate);
  const isPast = matchDate < new Date();
  const isAdmin = currentUser?.role === 'admin';

  const handleSignup = async () => {
    setLoading(true);
    setError('');
    try {
      await api.signupMatch(match.id);
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    setLoading(true);
    setError('');
    try {
      await api.leaveMatch(match.id);
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      await api.generateMatchTeams(match.id);
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this match?')) return;
    setLoading(true);
    try {
      await api.deleteMatch(match.id);
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const statusColors: Record<string, string> = {
    upcoming: 'bg-green-500/20 text-green-400',
    full: 'bg-yellow-500/20 text-yellow-400',
    cancelled: 'bg-red-500/20 text-red-400',
    completed: 'bg-blue-500/20 text-blue-400',
  };

  const parsedTeams = match.teamData ? parseTeams(match.teamData.teamA, match.teamData.teamB) : null;

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">{match.title}</h2>
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusColors[match.status] || ''}`}>
                {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              📅 {matchDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              {' at '}
              {matchDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
            {match.description && <p className="text-sm text-gray-500 mt-1">{match.description}</p>}
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-green-400">{match.signupCount}</div>
            <p className="text-xs text-gray-400">players joined</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3 text-xs text-gray-400">
          <span>Formation: <strong className="text-gray-300">{match.formation}</strong></span>
          <span>·</span>
          <span>{match.signups?.length || 0} signed up</span>
        </div>

        {match.signups && match.signups.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {match.signups.map((s: any) => (
              <span key={s.userId} className="bg-gray-800 text-gray-300 text-xs px-2.5 py-1 rounded-full border border-gray-700">
                {s.name}
              </span>
            ))}
          </div>
        )}

        {error && <div className="bg-red-500/10 border border-red-500 text-red-400 px-3 py-1.5 rounded-lg text-xs mb-3">{error}</div>}

        <div className="flex flex-wrap gap-2">
          {match.status === 'upcoming' && !isPast && (
            <>
              {!isSignedUp ? (
                <button onClick={handleSignup} disabled={loading}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
                  {loading ? 'Joining...' : '✅ Yes, I\'ll Play!'}
                </button>
              ) : (
                <button onClick={handleLeave} disabled={loading}
                  className="bg-red-600/20 hover:bg-red-600 text-red-400 font-semibold px-4 py-2 rounded-lg text-sm transition-colors border border-red-500/30">
                  {loading ? 'Leaving...' : '❌ Leave Match'}
                </button>
              )}
              {isAdmin && (
                <button onClick={handleGenerate} disabled={generating || match.signupCount < 2}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
                  {generating ? 'Generating...' : '🤖 Generate Teams'}
                </button>
              )}
            </>
          )}
          {isAdmin && (
            <button onClick={handleDelete} disabled={loading}
              className="bg-gray-800 hover:bg-gray-700 text-gray-400 px-4 py-2 rounded-lg text-sm transition-colors ml-auto">
              Delete
            </button>
          )}
        </div>
      </div>

      {parsedTeams && (
        <div className="border-t border-gray-700 p-5 bg-gray-800/50">
          <h3 className="text-sm font-bold text-purple-400 mb-3">🤖 AI Generated Teams</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-bold text-blue-400 mb-2 uppercase tracking-wide">Team A</h4>
              <div className="space-y-1">
                {parsedTeams.teamA.map((p: string, i: number) => {
                  const [pos, ...nameParts] = p.split(':');
                  const name = nameParts.join(':');
                  return (
                    <div key={i} className="flex items-center gap-2 p-1.5 bg-gray-900/50 rounded text-sm">
                      <span className="bg-blue-500/20 text-blue-400 text-[10px] font-bold px-1.5 py-0.5 rounded">{pos}</span>
                      <span>{name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold text-orange-400 mb-2 uppercase tracking-wide">Team B</h4>
              <div className="space-y-1">
                {parsedTeams.teamB.map((p: string, i: number) => {
                  const [pos, ...nameParts] = p.split(':');
                  const name = nameParts.join(':');
                  return (
                    <div key={i} className="flex items-center gap-2 p-1.5 bg-gray-900/50 rounded text-sm">
                      <span className="bg-orange-500/20 text-orange-400 text-[10px] font-bold px-1.5 py-0.5 rounded">{pos}</span>
                      <span>{name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function parseTeams(teamA: string, teamB: string) {
  const parse = (s: string) => s.split(',').filter(Boolean);
  return { teamA: parse(teamA), teamB: parse(teamB) };
}
