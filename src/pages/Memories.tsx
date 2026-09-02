import { useEffect, useState, useRef } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface Memory {
  id: string;
  matchId: string;
  matchTitle: string;
  matchDate: string;
  url: string;
  thumbnailUrl: string;
  type: 'image' | 'video';
  caption: string | null;
  uploadedBy: string;
  uploaderName: string;
  createdAt: string;
}

interface MatchGroup {
  matchId: string;
  matchTitle: string;
  matchDate: string;
  memories: Memory[];
}

export function Memories() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const [lightbox, setLightbox] = useState<{ memory: Memory; index: number } | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [memoriesData, matchesData] = await Promise.all([
        api.getMemories(),
        api.getMatches(),
      ]);
      setMemories(memoriesData);
      setMatches(matchesData.filter((m: any) => m.status === 'completed'));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const grouped = memories.reduce((acc, memory) => {
    const existing = acc.find(g => g.matchId === memory.matchId);
    if (existing) {
      existing.memories.push(memory);
    } else {
      acc.push({
        matchId: memory.matchId,
        matchTitle: memory.matchTitle,
        matchDate: memory.matchDate,
        memories: [memory],
      });
    }
    return acc;
  }, [] as MatchGroup[]);

  const handleUpload = async (file: File, matchId: string, caption: string) => {
    if (file.size > 25 * 1024 * 1024) {
      alert('File size must be less than 25MB');
      return;
    }
    setUploading(true);
    try {
      await api.uploadMemory(matchId, file, caption);
      setShowUpload(false);
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this memory?')) return;
    try {
      await api.deleteMemory(id);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openLightbox = (memory: Memory, groupMemories: Memory[]) => {
    const index = groupMemories.findIndex(m => m.id === memory.id);
    setLightbox({ memory, index });
  };

  const closeLightbox = () => setLightbox(null);

  const navigateLightbox = (direction: 'prev' | 'next') => {
    if (!lightbox) return;
    const group = grouped.find(g => g.memories.some(m => m.id === lightbox.memory.id));
    if (!group) return;
    const newIndex = direction === 'next'
      ? Math.min(lightbox.index + 1, group.memories.length - 1)
      : Math.max(lightbox.index - 1, 0);
    setLightbox({ memory: group.memories[newIndex], index: newIndex });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading memories...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Match Memories</h1>
          <p className="text-gray-400 mt-1">Photos and videos from past matches</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            {showUpload ? 'Cancel' : '+ Upload Memory'}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {showUpload && (
        <UploadForm
          matches={matches}
          onUpload={handleUpload}
          onCancel={() => setShowUpload(false)}
          uploading={uploading}
        />
      )}

      {grouped.length === 0 ? (
        <div className="bg-gray-900 rounded-xl border border-gray-700 p-12 flex flex-col items-center justify-center text-center">
          <div className="text-6xl mb-4">📸</div>
          <h3 className="text-xl font-bold text-gray-300">No memories yet</h3>
          <p className="text-gray-500 mt-2 max-w-md">
            {isAdmin ? 'Upload photos and videos from matches to create memories.' : 'No memories have been uploaded yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map((group) => (
            <MatchGroupCard
              key={group.matchId}
              group={group}
              isAdmin={isAdmin}
              onViewMemory={(memory) => openLightbox(memory, group.memories)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {lightbox && (
        <Lightbox
          memory={lightbox.memory}
          onClose={closeLightbox}
          onPrev={() => navigateLightbox('prev')}
          onNext={() => navigateLightbox('next')}
          hasPrev={lightbox.index > 0}
          hasNext={lightbox.index < (grouped.find(g => g.memories.some(m => m.id === lightbox.memory.id))?.memories.length || 1) - 1}
        />
      )}
    </div>
  );
}

function MatchGroupCard({ group, isAdmin, onViewMemory, onDelete }: {
  group: MatchGroup;
  isAdmin: boolean;
  onViewMemory: (memory: Memory) => void;
  onDelete: (id: string) => void;
}) {
  const matchDate = new Date(group.matchDate);
  const imageCount = group.memories.filter(m => m.type === 'image').length;
  const videoCount = group.memories.filter(m => m.type === 'video').length;

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
      <div className="p-5 border-b border-gray-700">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">{group.matchTitle}</h2>
            <p className="text-sm text-gray-400 mt-1">
              📅 {matchDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="text-right text-sm text-gray-400">
            {imageCount > 0 && <span>{imageCount} photo{imageCount !== 1 ? 's' : ''}</span>}
            {imageCount > 0 && videoCount > 0 && <span> · </span>}
            {videoCount > 0 && <span>{videoCount} video{videoCount !== 1 ? 's' : ''}</span>}
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {group.memories.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              onView={() => onViewMemory(memory)}
              onDelete={isAdmin ? () => onDelete(memory.id) : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MemoryCard({ memory, onView, onDelete }: {
  memory: Memory;
  onView: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="relative group cursor-pointer" onClick={onView}>
      <div className="aspect-square rounded-lg overflow-hidden bg-gray-800">
        {memory.type === 'image' ? (
          <img
            src={memory.thumbnailUrl}
            alt={memory.caption || 'Match memory'}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="relative w-full h-full">
            <img
              src={memory.thumbnailUrl}
              alt={memory.caption || 'Match memory'}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center">
                <span className="text-white text-xl">▶</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {memory.caption && (
        <p className="text-xs text-gray-400 mt-1 truncate">{memory.caption}</p>
      )}

      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded transition-opacity"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function Lightbox({ memory, onClose, onPrev, onNext, hasPrev, hasNext }: {
  memory: Memory;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev();
      if (e.key === 'ArrowRight' && hasNext) onNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white text-2xl hover:text-gray-300"
        >
          ✕
        </button>

        {hasPrev && (
          <button
            onClick={onPrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 text-white text-3xl hover:text-gray-300"
          >
            ‹
          </button>
        )}

        {hasNext && (
          <button
            onClick={onNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 text-white text-3xl hover:text-gray-300"
          >
            ›
          </button>
        )}

        {memory.type === 'image' ? (
          <img
            src={memory.url}
            alt={memory.caption || 'Match memory'}
            className="max-h-[80vh] mx-auto rounded-lg"
          />
        ) : (
          <video
            src={memory.url}
            controls
            autoPlay
            className="max-h-[80vh] mx-auto rounded-lg"
          />
        )}

        {memory.caption && (
          <div className="text-center mt-4 text-white">{memory.caption}</div>
        )}

        <div className="text-center mt-2 text-gray-400 text-sm">
          Uploaded by {memory.uploaderName}
        </div>
      </div>
    </div>
  );
}

function UploadForm({ matches, onUpload, onCancel, uploading }: {
  matches: any[];
  onUpload: (file: File, matchId: string, caption: string) => void;
  onCancel: () => void;
  uploading: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [matchId, setMatchId] = useState('');
  const [caption, setCaption] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (selectedFile: File) => {
    if (selectedFile.size > 25 * 1024 * 1024) {
      alert('File size must be less than 25MB');
      return;
    }
    setFile(selectedFile);
    const url = URL.createObjectURL(selectedFile);
    setPreview(url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = () => {
    if (!file || !matchId) {
      alert('Please select a file and a match');
      return;
    }
    onUpload(file, matchId, caption);
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 space-y-4">
      <h2 className="text-lg font-bold">Upload Memory</h2>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Select Match</label>
        <select
          value={matchId}
          onChange={(e) => setMatchId(e.target.value)}
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
        >
          <option value="">Choose a completed match...</option>
          {matches.map((m: any) => (
            <option key={m.id} value={m.id}>{m.title} - {new Date(m.matchDate).toLocaleDateString()}</option>
          ))}
        </select>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? 'border-green-500 bg-green-500/10' : 'border-gray-600 hover:border-gray-500'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
        />
        {preview ? (
          <div className="space-y-2">
            {file?.type.startsWith('image/') ? (
              <img src={preview} alt="Preview" className="max-h-40 mx-auto rounded-lg" />
            ) : (
              <video src={preview} className="max-h-40 mx-auto rounded-lg" />
            )}
            <p className="text-sm text-gray-400">{file?.name}</p>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); }}
              className="text-red-400 hover:text-red-300 text-sm"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-4xl">📁</div>
            <p className="text-gray-400">Drag & drop or click to select</p>
            <p className="text-xs text-gray-500">Images (JPG, PNG, GIF, WebP) or Videos (MP4, MOV, WebM) up to 25MB</p>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Caption (optional)</label>
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="e.g., Goal celebration, Great save..."
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={uploading || !file || !matchId}
          className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
        <button
          onClick={onCancel}
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-6 py-2 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
