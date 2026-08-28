import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PlayerCard } from '../components/PlayerCard';

export function Dashboard() {
  const { user } = useAuth();
  const [myPlayer, setMyPlayer] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchAction, setMatchAction] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [player, matchData] = await Promise.all([
        api.getMyPlayer(),
        api.getMatches(),
      ]);
      setMyPlayer(player);
      setMatches(matchData);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSignup = async (matchId: string) => {
    setMatchAction(matchId);
    try {
      await api.signupMatch(matchId);
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setMatchAction(null);
    }
  };

  const upcomingMatches = matches.filter(m => m.status === 'upcoming' && new Date(m.matchDate) >= new Date());
  const recentMatches = matches.filter(m => m.status !== 'upcoming' || new Date(m.matchDate) < new Date());

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>;
  }

  if (!myPlayer) {
    return (
      <div className="space-y-6">
        <div className="text-center py-16">
          <div className="text-6xl mb-4">⚽</div>
          <h1 className="text-3xl font-black mb-2">Welcome, {user?.name}!</h1>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Create your player profile to get your personalized player card and join matches.
          </p>
          <Link
            to="/profile-setup"
            className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-3 rounded-xl transition-colors text-lg"
          >
            Create My Player Card
          </Link>
        </div>

        {upcomingMatches.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4">📢 Upcoming Matches</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingMatches.map((match) => (
                <MatchNoticeCard
                  key={match.id}
                  match={match}
                  userId={user?.id}
                  onSignup={() => handleSignup(match.id)}
                  loading={matchAction === match.id}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const isSignedUp = (match: any) => match.signups?.some((s: any) => s.userId === user?.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black">My Home</h1>
        <p className="text-gray-400 mt-1">Welcome back, {myPlayer.name}!</p>
      </div>

      {/* Player Card + Quick Stats */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <PlayerCard player={myPlayer} size="large" />

        <div className="flex-1 space-y-4 w-full">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatBox label="Overall" value={myPlayer.overall} color="green" />
            <StatBox label="Position" value={myPlayer.position} color="blue" />
            <StatBox label="Age" value={myPlayer.age} color="purple" />
            <StatBox label="Style" value={myPlayer.playingStyle} color="orange" />
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-700 p-4">
            <h3 className="text-sm font-bold text-gray-300 mb-3">Quick Stats</h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              <MiniStat label="PAC" value={myPlayer.pace} />
              <MiniStat label="SHO" value={myPlayer.shooting} />
              <MiniStat label="PAS" value={myPlayer.passing} />
              <MiniStat label="DRI" value={myPlayer.dribbling} />
              <MiniStat label="DEF" value={myPlayer.defending} />
              <MiniStat label="PHY" value={myPlayer.physical} />
            </div>
          </div>

          <div className="flex gap-3">
            <Link to="/players" className="bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              Edit Profile
            </Link>
            <Link to="/team-builder" className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 text-sm font-medium px-4 py-2 rounded-lg transition-colors border border-purple-500/30">
              AI Team Builder
            </Link>
          </div>
        </div>
      </div>

      {/* Upcoming Matches */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black">Upcoming Matches</h2>
          <Link to="/notice" className="text-sm text-green-400 hover:text-green-300">View all →</Link>
        </div>
        {upcomingMatches.length === 0 ? (
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-8 text-center">
            <div className="text-4xl mb-3">📅</div>
            <p className="text-gray-400">No upcoming matches</p>
            <p className="text-sm text-gray-500 mt-1">Check back later or ask admin to create one</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingMatches.map((match) => (
              <MatchNoticeCard
                key={match.id}
                match={match}
                userId={user?.id}
                isSignedUp={isSignedUp(match)}
                onSignup={() => handleSignup(match.id)}
                loading={matchAction === match.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recent Matches */}
      {recentMatches.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4 text-gray-400">Past Matches</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentMatches.slice(0, 4).map((match) => (
              <div key={match.id} className="bg-gray-900/50 rounded-lg border border-gray-800 p-3">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="text-sm font-medium">{match.title}</span>
                    <span className="text-xs text-gray-500 ml-2">{new Date(match.matchDate).toLocaleDateString()}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${match.status === 'completed' ? 'bg-blue-500/20 text-blue-400' : match.status === 'full' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-700 text-gray-400'}`}>
                    {match.status}
                  </span>
                </div>
                {match.status === 'completed' && match.scoreA != null && match.scoreB != null && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-bold text-green-400">{match.scoreA} - {match.scoreB}</span>
                    <span className="text-[10px] text-gray-500">
                      {match.winner === 'draw' ? 'Draw' : match.winner ? `Team ${match.winner} won` : ''}
                    </span>
                  </div>
                )}
                {match.scorers && match.scorers.length > 0 && (
                  <div className="mt-1 text-[10px] text-gray-400">
                    {match.scorers.filter((s: any) => s.isGoal).map((s: any) => `⚽ ${s.playerName}`).join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MatchNoticeCard({ match, userId, isSignedUp, onSignup, loading }: {
  match: any;
  userId?: string;
  isSignedUp?: boolean;
  onSignup: () => void;
  loading: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const matchDate = new Date(match.matchDate);
  const isSignedUpVal = isSignedUp ?? match.signups?.some((s: any) => s.userId === userId);
  const closed = match.signupClosed || match.status !== 'upcoming' || matchDate < new Date();
  const canSignup = !isSignedUpVal && !closed;

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 p-4 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold">{match.title}</h3>
          <p className="text-sm text-gray-400 mt-0.5">
            {matchDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            {' at '}
            {matchDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="text-right">
          {match.status === 'completed' && match.scoreA != null && match.scoreB != null ? (
            <div className="text-lg font-black text-green-400">{match.scoreA} - {match.scoreB}</div>
          ) : (
            <div className="text-lg font-black text-green-400">{match.signupCount}</div>
          )}
          <div className="text-[10px] text-gray-500">{match.status === 'completed' ? (match.winner === 'draw' ? 'Draw' : match.winner ? `Team ${match.winner} won` : 'completed') : 'joined'}</div>
        </div>
      </div>

      {match.description && <p className="text-xs text-gray-500 mb-3 whitespace-pre-line">{match.description}</p>}

      {match.venueName && (
        <p className="text-xs text-gray-400 mb-1">
          📍 {match.venueLink ? (
            <a href={match.venueLink} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 underline">{match.venueName}</a>
          ) : match.venueName}</p>
      )}
      {match.reportingTime && (
        <p className="text-xs text-gray-400 mb-3">⏰ Reporting at {match.reportingTime}</p>
      )}

      {match.signups && match.signups.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {match.signups.slice(0, 8).map((s: any) => (
            <div key={s.userId} className="flex items-center gap-1 bg-gray-800 text-gray-300 text-[10px] px-2 py-0.5 rounded-full">
              {s.playerAvatar ? (
                <img src={s.playerAvatar} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
              ) : null}
              {s.name}
              {s.playerOverall && <span className="text-green-400 font-bold">{s.playerOverall}</span>}
            </div>
          ))}
          {match.signups.length > 8 && (
            <span className="text-[10px] text-gray-500 px-1">+{match.signups.length - 8} more</span>
          )}
        </div>
      )}

      {match.scorers && match.scorers.length > 0 && (
        <div className="bg-gray-800/50 rounded-lg p-2 mb-3 space-y-0.5">
          {match.scorers.map((s: any) => (
            <div key={s.id} className="text-[10px] text-gray-300">
              {s.isGoal ? '⚽' : '🅰️'} {s.playerName} {s.minute != null && `(${s.minute}')`} — Team {s.team}
            </div>
          ))}
        </div>
      )}

      {match.teamData && (() => {
        const parse = (s: string) => s.split(',').filter(Boolean);
        const teamA = parse(match.teamData.teamA);
        const teamB = parse(match.teamData.teamB);
        if (teamA.length === 0 && teamB.length === 0) return null;
        return (
          <div className="bg-gray-800/50 rounded-lg p-2 mb-3 space-y-2">
            <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wide">Generated Teams</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[10px] font-bold text-blue-400 mb-1">{match.teamData.teamAName || 'Team A'}</div>
                {teamA.map((p: string, i: number) => {
                  const [pos, ...nameParts] = p.split(':');
                  return (
                    <div key={i} className="text-[10px] text-gray-300 flex items-center gap-1">
                      <span className="text-blue-400 font-bold">{pos}</span>
                      <span>{nameParts.join(':')}</span>
                    </div>
                  );
                })}
              </div>
              <div>
                <div className="text-[10px] font-bold text-orange-400 mb-1">{match.teamData.teamBName || 'Team B'}</div>
                {teamB.map((p: string, i: number) => {
                  const [pos, ...nameParts] = p.split(':');
                  return (
                    <div key={i} className="text-[10px] text-gray-300 flex items-center gap-1">
                      <span className="text-orange-400 font-bold">{pos}</span>
                      <span>{nameParts.join(':')}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">{match.formation}</span>
        {isSignedUpVal ? (
          <span className="text-[10px] text-green-400 font-bold">✓ Playing</span>
        ) : confirming ? (
          <div className="flex gap-1">
            <button onClick={() => { onSignup(); setConfirming(false); }} disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold px-2 py-1 rounded transition-colors disabled:opacity-50">
              {loading ? '...' : 'Yes!'}
            </button>
            <button onClick={() => setConfirming(false)}
              className="bg-gray-700 hover:bg-gray-600 text-gray-300 text-[10px] font-bold px-2 py-1 rounded transition-colors">
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)} disabled={!canSignup || loading}
            className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:bg-gray-700 disabled:text-gray-500">
            {closed ? (isSignedUpVal ? '✓ Playing' : 'Locked') : "I'm Playing!"}
          </button>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    green: 'bg-green-500/10 border-green-500/30 text-green-400',
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    purple: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
    orange: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
  };
  return (
    <div className={`rounded-xl border p-3 ${colors[color]}`}>
      <div className="text-lg font-black">{value}</div>
      <div className="text-[10px] text-gray-400 uppercase">{label}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? 'text-green-400' : value >= 65 ? 'text-yellow-400' : 'text-red-400';
  return (
    <div className="text-center">
      <div className={`text-lg font-black ${color}`}>{value}</div>
      <div className="text-[9px] text-gray-500 uppercase">{label}</div>
    </div>
  );
}
