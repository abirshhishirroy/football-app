import { useState } from 'react';
import { POSITIONS, PLAYING_STYLES, type Position, type PlayingStyle } from '../types';

interface PlayerFormProps {
  initial?: any;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isAdmin?: boolean;
}

export function PlayerForm({ initial, onSubmit, onCancel, isAdmin = false }: PlayerFormProps) {
  const [name, setName] = useState(initial?.name || '');
  const [age, setAge] = useState(initial?.age || 22);
  const [height, setHeight] = useState(initial?.height || 175);
  const [weight, setWeight] = useState(initial?.weight || 70);
  const [position, setPosition] = useState<Position>(initial?.position || 'CM');
  const [playingStyle, setPlayingStyle] = useState<PlayingStyle>(initial?.playingStyle || 'balanced');
  const [weeklyActivity, setWeeklyActivity] = useState(initial?.weeklyActivity || 10);
  const [avatarUrl, setAvatarUrl] = useState(initial?.avatarUrl || '');
  const [pace, setPace] = useState(initial?.skillRatings?.pace ?? initial?.pace ?? 50);
  const [shooting, setShooting] = useState(initial?.skillRatings?.shooting ?? initial?.shooting ?? 50);
  const [passing, setPassing] = useState(initial?.skillRatings?.passing ?? initial?.passing ?? 50);
  const [dribbling, setDribbling] = useState(initial?.skillRatings?.dribbling ?? initial?.dribbling ?? 50);
  const [defending, setDefending] = useState(initial?.skillRatings?.defending ?? initial?.defending ?? 50);
  const [physical, setPhysical] = useState(initial?.skillRatings?.physical ?? initial?.physical ?? 50);
  const [goalkeeping, setGoalkeeping] = useState(initial?.skillRatings?.goalkeeping ?? initial?.goalkeeping ?? 50);
  const [stamina, setStamina] = useState(initial?.skillRatings?.stamina ?? initial?.stamina ?? 50);
  const [archetype, setArchetype] = useState(initial?.skillRatings?.archetype ?? initial?.archetype ?? '');
  const [overall, setOverall] = useState(initial?.overall ?? 50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [avatarError, setAvatarError] = useState('');

  const validateAvatarUrl = (url: string): boolean => {
    if (!url) return true;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAvatarError('');
    if (avatarUrl && !validateAvatarUrl(avatarUrl)) {
      setAvatarError('Please enter a valid URL starting with http:// or https://');
      return;
    }
    setLoading(true);
    try {
      const payload: any = {
        name, age, height, weight, position, playingStyle, weeklyActivity,
        avatarUrl: avatarUrl || undefined,
      };
      if (isAdmin) {
        payload.skillRatings = { pace, shooting, passing, dribbling, defending, physical, goalkeeping, stamina, archetype };
        payload.overall = overall;
        payload.archetype = archetype;
      }
      await onSubmit(payload);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-900 rounded-xl border border-gray-700 p-6 space-y-4">
      <h2 className="text-lg font-bold">{initial ? 'Edit Player' : 'Add New Player'}</h2>
      {error && <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-2 rounded-lg text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
        </Field>
        <Field label="Age">
          <input type="number" value={age} onChange={(e) => setAge(+e.target.value)} min={15} max={45} className={inputClass} />
        </Field>
        <Field label="Height (cm)">
          <input type="number" value={height} onChange={(e) => setHeight(+e.target.value)} min={140} max={220} className={inputClass} />
        </Field>
        <Field label="Weight (kg)">
          <input type="number" value={weight} onChange={(e) => setWeight(+e.target.value)} min={40} max={130} className={inputClass} />
        </Field>
        <Field label="Position">
          <select value={position} onChange={(e) => setPosition(e.target.value as Position)} className={inputClass}>
            {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Playing Style">
          <select value={playingStyle} onChange={(e) => setPlayingStyle(e.target.value as PlayingStyle)} className={inputClass}>
            {PLAYING_STYLES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </Field>
        <Field label="Weekly Activity (hrs)">
          <input type="number" value={weeklyActivity} onChange={(e) => setWeeklyActivity(+e.target.value)} min={0} max={30} step={0.5} className={inputClass} />
        </Field>
        <Field label="Photo URL (optional)">
          <input
            value={avatarUrl}
            onChange={(e) => { setAvatarUrl(e.target.value); setAvatarError(''); }}
            className={`${inputClass} ${avatarError ? 'border-red-500' : ''}`}
            placeholder="https://example.com/photo.jpg"
          />
          {avatarError && <p className="text-[11px] text-red-400 mt-1">{avatarError}</p>}
        </Field>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-3">
          {isAdmin ? 'Skill Ratings (editable)' : 'Skill Ratings (auto-generated)'}
        </h3>
        {isAdmin ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Slider label="Pace" value={pace} onChange={setPace} />
            <Slider label="Shooting" value={shooting} onChange={setShooting} />
            <Slider label="Passing" value={passing} onChange={setPassing} />
            <Slider label="Dribbling" value={dribbling} onChange={setDribbling} />
            <Slider label="Defending" value={defending} onChange={setDefending} />
            <Slider label="Physical" value={physical} onChange={setPhysical} />
            <Slider label="Stamina" value={stamina} onChange={setStamina} />
            {position === 'GK' && <Slider label="Goalkeeping" value={goalkeeping} onChange={setGoalkeeping} />}
            <Slider label="Overall" value={overall} onChange={setOverall} />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ReadOnlyStat label="Pace" value={pace} />
            <ReadOnlyStat label="Shooting" value={shooting} />
            <ReadOnlyStat label="Passing" value={passing} />
            <ReadOnlyStat label="Dribbling" value={dribbling} />
            <ReadOnlyStat label="Defending" value={defending} />
            <ReadOnlyStat label="Physical" value={physical} />
            <ReadOnlyStat label="Stamina" value={stamina} />
            {position === 'GK' && <ReadOnlyStat label="Goalkeeping" value={goalkeeping} />}
          </div>
        )}
      </div>

      {isAdmin && (
        <div>
          <Field label="Archetype (player style description)">
            <input
              value={archetype}
              onChange={(e) => setArchetype(e.target.value)}
              placeholder="e.g., Box-to-Box Engine, Clinical Finisher..."
              className={inputClass}
            />
          </Field>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white font-semibold px-6 py-2 rounded-lg transition-colors">
          {loading ? 'Saving...' : initial ? 'Update' : 'Add Player'}
        </button>
        <button type="button" onClick={onCancel} className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-6 py-2 rounded-lg transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const color = value >= 80 ? 'text-green-400' : value >= 60 ? 'text-yellow-400' : 'text-red-400';
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400">{label}</span>
        <span className={`text-xs font-bold ${color}`}>{value}</span>
      </div>
      <input
        type="range" min={1} max={99} value={value} onChange={(e) => onChange(+e.target.value)}
        className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-green-500"
      />
    </div>
  );
}

function ReadOnlyStat({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? 'text-green-400' : value >= 60 ? 'text-yellow-400' : 'text-red-400';
  return (
    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
      <div className={`text-lg font-black ${color}`}>{value}</div>
      <div className="text-[9px] text-gray-500 uppercase">{label}</div>
    </div>
  );
}

const inputClass = 'w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent';
