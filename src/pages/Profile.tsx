import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PlayerCard } from '../components/PlayerCard';
import { PlayerForm } from '../components/PlayerForm';

export function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [player, setPlayer] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getMyPlayer();
      if (!data) {
        navigate('/profile-setup');
        return;
      }
      setPlayer(data);
    } catch {
      navigate('/profile-setup');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleEdit = async (data: any) => {
    await api.updatePlayer(player.id, data);
    setEditing(false);
    load();
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>;
  if (!player) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black">My Profile</h1>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <PlayerCard player={player} size="large" />

        <div className="flex-1 space-y-4 w-full">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatBox label="Overall" value={player.overall} color="green" />
            <StatBox label="Position" value={player.position} color="blue" />
            <StatBox label="Matches" value={player.matchesPlayed ?? 0} color="purple" />
            <StatBox label="Wins" value={player.wins ?? 0} color="orange" />
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-700 p-4">
            <h3 className="text-sm font-bold text-gray-300 mb-3">Match Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MiniStat label="Goals" value={player.goals ?? 0} />
              <MiniStat label="Assists" value={player.assists ?? 0} />
              <MiniStat label="Played" value={player.matchesPlayed ?? 0} />
              <MiniStat label="Wins" value={player.wins ?? 0} />
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-700 p-4">
            <h3 className="text-sm font-bold text-gray-300 mb-3">Skill Ratings</h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              <MiniStat label="PAC" value={player.pace} />
              <MiniStat label="SHO" value={player.shooting} />
              <MiniStat label="PAS" value={player.passing} />
              <MiniStat label="DRI" value={player.dribbling} />
              <MiniStat label="DEF" value={player.defending} />
              <MiniStat label="PHY" value={player.physical} />
            </div>
          </div>

          <button
            onClick={() => setEditing(!editing)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            {editing ? 'Cancel Edit' : 'Edit Profile'}
          </button>
        </div>
      </div>

      {editing && (
        <PlayerForm initial={player} onSubmit={handleEdit} onCancel={() => setEditing(false)} isAdmin={user?.role === 'admin'} />
      )}
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
