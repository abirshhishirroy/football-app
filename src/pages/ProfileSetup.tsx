import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { POSITIONS, PLAYING_STYLES, type Position, type PlayingStyle } from '../types';

export function ProfileSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || '');
  const [age, setAge] = useState(22);
  const [height, setHeight] = useState(175);
  const [weight, setWeight] = useState(70);
  const [position, setPosition] = useState<Position>('CM');
  const [playingStyle, setPlayingStyle] = useState<PlayingStyle>('balanced');
  const [weeklyActivity, setWeeklyActivity] = useState(10);
  const [avatarUrl, setAvatarUrl] = useState('');
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
    setLoading(true);
    setError('');
    setAvatarError('');
    if (avatarUrl && !validateAvatarUrl(avatarUrl)) {
      setAvatarError('Please enter a valid URL starting with http:// or https://');
      setLoading(false);
      return;
    }
    try {
      await api.createPlayer({
        name, age, height, weight, position, playingStyle, weeklyActivity,
        avatarUrl: avatarUrl || undefined,
        userId: user?.id,
      });
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full bg-input border border-border-input rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent';

  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⚽</div>
          <h1 className="text-3xl font-black text-white">Create Your Player Profile</h1>
          <p className="text-muted mt-2">Fill in your details to get your player card</p>
          <p className="text-dim text-xs mt-1">Your skill ratings will be auto-generated based on your information</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border-card p-8 space-y-6">
          {error && <div className="bg-danger/10 border border-danger text-danger px-4 py-2 rounded-lg text-sm">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Player Name">
              <input value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} placeholder="Your display name" />
            </Field>
            <Field label="Photo URL (optional)">
              <input
                value={avatarUrl}
                onChange={(e) => { setAvatarUrl(e.target.value); setAvatarError(''); }}
                className={`${inputClass} ${avatarError ? 'border-danger focus:ring-danger' : ''}`}
                placeholder="https://example.com/photo.jpg"
              />
              <p className="text-[11px] text-dim mt-1">Paste a direct link to an image (JPG, PNG, etc.)</p>
              {avatarError && <p className="text-[11px] text-danger mt-1">{avatarError}</p>}
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
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-brand hover:bg-brand-hover disabled:bg-brand-dim text-white font-bold py-3 rounded-xl transition-colors text-lg">
            {loading ? 'Creating Profile...' : 'Create My Player Card'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-secondary mb-1">{label}</label>
      {children}
    </div>
  );
}
