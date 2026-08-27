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
  const [confirming, setConfirming] = useState(false);
  const [showResultForm, setShowResultForm] = useState(false);
  const [resultWinner, setResultWinner] = useState<'A' | 'B' | 'draw'>('A');
  const [resultScoreA, setResultScoreA] = useState(0);
  const [resultScoreB, setResultScoreB] = useState(0);
  const [resultScorers, setResultScorers] = useState<{ playerId: string; team: 'A' | 'B'; isGoal: boolean; minute: number | null }[]>([]);
  const [players, setPlayers] = useState<any[]>([]);

  const isSignedUp = match.signups?.some((s: any) => s.userId === currentUser?.id);
  const matchDate = new Date(match.matchDate);
  const isPast = matchDate < new Date();
  const isAdmin = currentUser?.role === 'admin';
  const closed = match.signupClosed || match.status !== 'upcoming' || isPast;

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

  const handleResult = async () => {
    setLoading(true);
    setError('');
    try {
      await api.submitMatchResult(match.id, {
        winner: resultWinner === 'draw' ? null : resultWinner,
        scoreA: resultScoreA,
        scoreB: resultScoreB,
        scorers: resultScorers,
      });
      setShowResultForm(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openResultForm = () => {
    api.getPlayers().then(setPlayers);
    setShowResultForm(true);
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
            {match.status === 'completed' && match.scoreA != null && match.scoreB != null ? (
              <div className="text-2xl font-black text-green-400">{match.scoreA} - {match.scoreB}</div>
            ) : (
              <div className="text-2xl font-black text-green-400">{match.signupCount}</div>
            )}
            <p className="text-xs text-gray-400">{match.status === 'completed' ? (match.winner === 'draw' ? 'Draw' : match.winner ? `Team ${match.winner} won` : 'completed') : 'players joined'}</p>
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

        {match.scorers && match.scorers.length > 0 && (
          <div className="bg-gray-800/50 rounded-lg p-2 mb-3 space-y-0.5">
            {match.scorers.map((s: any) => (
              <div key={s.id} className="text-xs text-gray-300">
                {s.isGoal ? '⚽' : '🅰️'} {s.playerName} {s.minute != null && `(${s.minute}')`} — Team {s.team}
              </div>
            ))}
          </div>
        )}

        {error && <div className="bg-red-500/10 border border-red-500 text-red-400 px-3 py-1.5 rounded-lg text-xs mb-3">{error}</div>}

        <div className="flex flex-wrap gap-2">
          {match.status === 'upcoming' && !isPast && (
            <>
              {!isSignedUp ? (
                confirming ? (
                  <div className="flex gap-1">
                    <button onClick={() => { handleSignup(); setConfirming(false); }} disabled={loading}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
                      {loading ? 'Joining...' : 'Yes, I\'m Playing!'}
                    </button>
                    <button onClick={() => setConfirming(false)}
                      className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-4 py-2 rounded-lg text-sm transition-colors">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirming(true)} disabled={closed}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
                    {closed ? 'Signup Closed' : '✅ Yes, I\'ll Play!'}
                  </button>
                )
              ) : (
                <span className="text-green-400 text-sm font-bold">✓ Playing</span>
              )}
              {isAdmin && (
                <button onClick={handleGenerate} disabled={generating || match.signupCount < 2}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
                  {generating ? 'Generating...' : '🤖 Generate Teams'}
                </button>
              )}
            </>
          )}
          {isAdmin && match.status === 'full' && (
            <button onClick={openResultForm}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
              📝 Enter Result
            </button>
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

      {showResultForm && (
        <div className="border-t border-gray-700 p-5 bg-gray-800/30">
          <h3 className="text-sm font-bold text-blue-400 mb-3">📝 Enter Match Result</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Winner</label>
                <select value={resultWinner} onChange={(e) => setResultWinner(e.target.value as 'A' | 'B' | 'draw')} className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-sm">
                  <option value="A">Team A</option>
                  <option value="B">Team B</option>
                  <option value="draw">Draw</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Team A Score</label>
                <input type="number" value={resultScoreA} onChange={(e) => setResultScoreA(+e.target.value)} min={0} className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Team B Score</label>
                <input type="number" value={resultScoreB} onChange={(e) => setResultScoreB(+e.target.value)} min={0} className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Goals & Assists</label>
              {resultScorers.map((s, i) => (
                <div key={i} className="flex gap-2 mb-1">
                  <select value={s.playerId} onChange={(e) => {
                    const next = [...resultScorers]; next[i] = { ...next[i], playerId: e.target.value }; setResultScorers(next);
                  }} className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs">
                    <option value="">Select player</option>
                    {players.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <select value={s.team} onChange={(e) => {
                    const next = [...resultScorers]; next[i] = { ...next[i], team: e.target.value as 'A' | 'B' }; setResultScorers(next);
                  }} className="w-16 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs">
                    <option value="A">Team A</option>
                    <option value="B">Team B</option>
                  </select>
                  <select value={s.isGoal ? 'goal' : 'assist'} onChange={(e) => {
                    const next = [...resultScorers]; next[i] = { ...next[i], isGoal: e.target.value === 'goal' }; setResultScorers(next);
                  }} className="w-20 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs">
                    <option value="goal">Goal</option>
                    <option value="assist">Assist</option>
                  </select>
                  <input type="number" value={s.minute ?? ''} onChange={(e) => {
                    const next = [...resultScorers]; next[i] = { ...next[i], minute: e.target.value ? +e.target.value : null }; setResultScorers(next);
                  }} placeholder="min" className="w-14 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs" />
                  <button onClick={() => setResultScorers(resultScorers.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                </div>
              ))}
              <button onClick={() => setResultScorers([...resultScorers, { playerId: '', team: 'A', isGoal: true, minute: null }])}
                className="text-xs text-green-400 hover:text-green-300 mt-1">+ Add entry</button>
            </div>

            <div className="flex gap-2">
              <button onClick={handleResult} disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold px-4 py-1.5 rounded text-sm transition-colors">
                {loading ? 'Saving...' : 'Save Result'}
              </button>
              <button onClick={() => setShowResultForm(false)}
                className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-4 py-1.5 rounded text-sm transition-colors">
                Cancel
              </button>
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
