import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export function Matches() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getMatches();
      setMatches(data.filter((m: any) => m.status === 'completed'));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading matches...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Match Statistics</h1>
        <p className="text-gray-400 mt-1">View all completed matches and their statistics</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {matches.length === 0 ? (
        <div className="bg-gray-900 rounded-xl border border-gray-700 p-12 flex flex-col items-center justify-center text-center">
          <div className="text-6xl mb-4">⚽</div>
          <h3 className="text-xl font-bold text-gray-300">No completed matches yet</h3>
          <p className="text-gray-500 mt-2 max-w-md">
            Completed matches with scores and statistics will appear here.
          </p>
        </div>
      ) : (
        <div className="max-h-[calc(100vh-200px)] overflow-y-auto space-y-6 pr-2">
          {matches.map((match) => (
            <CompletedMatchCard key={match.id} match={match} user={user} onRefresh={load} />
          ))}
        </div>
      )}
    </div>
  );
}

function CompletedMatchCard({ match, user, onRefresh }: { match: any; user: any; onRefresh: () => void }) {
  const [showResultForm, setShowResultForm] = useState(false);
  const [resultWinner, setResultWinner] = useState<'A' | 'B' | 'draw'>('A');
  const [resultScoreA, setResultScoreA] = useState(match.scoreA || 0);
  const [resultScoreB, setResultScoreB] = useState(match.scoreB || 0);
  const [resultScorers, setResultScorers] = useState<any[]>(match.scorers || []);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const matchDate = new Date(match.matchDate);
  const isAdmin = user?.role === 'admin';
  const hasResult = match.scoreA != null && match.scoreB != null;

  const openResultForm = () => {
    api.getPlayers().then(setPlayers);
    setShowResultForm(true);
  };

  const handleResult = async () => {
    setLoading(true);
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
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const parseTeams = (teamA: string, teamB: string) => {
    const parse = (s: string) => s.split(',').filter(Boolean);
    return { teamA: parse(teamA), teamB: parse(teamB) };
  };

  const parsedTeams = match.teamData ? parseTeams(match.teamData.teamA, match.teamData.teamB) : null;

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">{match.title}</h2>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                Completed
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              📅 {matchDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              {' at '}
              {matchDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
            {match.venueName && (
              <p className="text-sm text-gray-400 mt-1">
                📍 {match.venueLink ? (
                  <a href={match.venueLink} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 underline">
                    {match.venueName}
                  </a>
                ) : match.venueName}
              </p>
            )}
          </div>
          {hasResult && (
            <div className="text-right">
              <div className="text-2xl font-black text-green-400">
                {match.scoreA} - {match.scoreB}
              </div>
              <p className="text-xs text-gray-400">
                {match.winner === 'draw' ? 'Draw' : match.winner ? `Team ${match.winner} won` : ''}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mb-3 text-xs text-gray-400">
          <span>Formation: <strong className="text-gray-300">{match.formation}</strong></span>
        </div>

        {match.scorers && match.scorers.length > 0 && (
          <div className="bg-gray-800/50 rounded-lg p-3 mb-4 space-y-1">
            <div className="text-xs font-bold text-gray-400 mb-2">Goal Scorers</div>
            {match.scorers.map((s: any) => (
              <div key={s.id} className="text-sm text-gray-300">
                {s.isGoal ? '⚽' : '🅰️'} {s.playerName} {s.minute != null && `(${s.minute}')`} — Team {s.team}
              </div>
            ))}
          </div>
        )}

        {isAdmin && !hasResult && (
          <button onClick={openResultForm}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
            📝 Enter Result
          </button>
        )}
      </div>

      {parsedTeams && (
        <div className="border-t border-gray-700 p-5 bg-gray-800/50">
          <div className="text-xs font-bold text-purple-400 mb-3">🤖 AI Generated Teams</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PitchView
              teamName={match.teamData.teamAName || 'Team A'}
              teamData={parsedTeams.teamA}
              color="blue"
            />
            <PitchView
              teamName={match.teamData.teamBName || 'Team B'}
              teamData={parsedTeams.teamB}
              color="orange"
            />
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
                <select value={resultWinner} onChange={(e) => setResultWinner(e.target.value as 'A' | 'B' | 'draw')}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-sm">
                  <option value="A">Team A</option>
                  <option value="B">Team B</option>
                  <option value="draw">Draw</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Team A Score</label>
                <input type="number" value={resultScoreA} onChange={(e) => setResultScoreA(+e.target.value)} min={0}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Team B Score</label>
                <input type="number" value={resultScoreB} onChange={(e) => setResultScoreB(+e.target.value)} min={0}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-sm" />
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

function PitchView({ teamName, teamData, color }: { teamName: string; teamData: string[]; color: 'blue' | 'orange' }) {
  const colorClasses = color === 'blue'
    ? { border: 'border-blue-500/50', text: 'text-blue-400', bg: 'bg-blue-500/10' }
    : { border: 'border-orange-500/50', text: 'text-orange-400', bg: 'bg-orange-500/10' };

  const slotGroups: { label: string; positions: string[] }[] = [];
  let current: string[] = [];

  for (const entry of teamData) {
    const pos = entry.split(':')[0];
    if (pos === 'GK') {
      if (current.length) slotGroups.push({ label: color === 'blue' ? 'DEF' : 'DEF', positions: [...current] });
      current = [];
      slotGroups.push({ label: 'GK', positions: [entry] });
    } else if (['CB', 'LB', 'RB'].includes(pos)) {
      current.push(entry);
    } else if (['CDM', 'CM', 'CAM', 'LW', 'RW'].includes(pos)) {
      if (current.length && current[0].split(':')[0] !== 'GK' && !['CDM', 'CM', 'CAM', 'LW', 'RW'].includes(current[0].split(':')[0])) {
        slotGroups.push({ label: 'DEF', positions: [...current] });
        current = [];
      }
      current.push(entry);
    } else {
      if (current.length) {
        slotGroups.push({ label: 'MID', positions: [...current] });
        current = [];
      }
      current.push(entry);
    }
  }
  if (current.length) {
    const lastPos = current[0].split(':')[0];
    const label = ['ST', 'CF'].includes(lastPos) ? 'FWD' : ['CDM', 'CM', 'CAM', 'LW', 'RW'].includes(lastPos) ? 'MID' : 'DEF';
    slotGroups.push({ label, positions: [...current] });
  }

  return (
    <div className={`rounded-xl border ${colorClasses.border} p-4`}>
      <div className={`text-xs font-bold ${colorClasses.text} mb-3`}>{teamName}</div>
      <div className="space-y-3">
        {slotGroups.map((group, gi) => (
          <div key={gi}>
            <div className={`text-[10px] ${colorClasses.text} mb-1 uppercase tracking-wide`}>{group.label}</div>
            <div className="flex flex-wrap gap-2">
              {group.positions.map((entry, pi) => {
                const [pos, ...nameParts] = entry.split(':');
                const name = nameParts.join(':');
                return (
                  <div key={pi} className={`${colorClasses.bg} rounded-lg p-2 min-w-[100px] text-center`}>
                    <div className="text-[10px] text-gray-400">{pos}</div>
                    <div className="text-xs font-bold truncate">{name}</div>
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
