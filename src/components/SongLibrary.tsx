import { useEffect, useState } from 'react';
import type { SavedSong } from '../types';
import { deleteSong, getSongAudio, getSongsMetadata } from '../lib/storage';
import { formatCost, formatDuration } from '../lib/pricing';
import { MODEL_PRICING } from '../lib/pricing';

interface SongLibraryProps {
  refreshKey: number;
}

export function SongLibrary({ refreshKey }: SongLibraryProps) {
  const [songs, setSongs] = useState<Omit<SavedSong, 'audioDataUrl'>[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    setSongs(getSongsMetadata());
  }, [refreshKey]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this song?')) return;
    await deleteSong(id);
    setSongs(getSongsMetadata());
    setAudioUrls((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!audioUrls[id]) {
      const audio = await getSongAudio(id);
      if (audio) setAudioUrls((prev) => ({ ...prev, [id]: audio }));
    }
  };

  if (songs.length === 0) {
    return (
      <div className="library-empty">
        <p>No songs yet. Create your first one above!</p>
      </div>
    );
  }

  return (
    <div className="song-library">
      <h2 className="section-title">Your Songs ({songs.length})</h2>
      <div className="song-list">
        {songs.map((song) => (
          <div key={song.id} className="song-card">
            <button
              className="song-card-header"
              onClick={() => handleExpand(song.id)}
              type="button"
            >
              <div className="song-card-info">
                <span className="song-card-title">
                  {song.title || 'Untitled Song'}
                </span>
                <span className="song-card-meta">
                  {song.options.genre} · {formatDuration(song.duration)} ·{' '}
                  {MODEL_PRICING[song.model].label}
                </span>
              </div>
              <span className="song-card-chevron">
                {expandedId === song.id ? '▾' : '▸'}
              </span>
            </button>

            {expandedId === song.id && (
              <div className="song-card-body">
                {audioUrls[song.id] && (
                  <audio
                    controls
                    src={audioUrls[song.id]}
                    className="song-player"
                    preload="metadata"
                  />
                )}
                {song.transcript && (
                  <p className="song-transcript">{song.transcript}</p>
                )}
                <p className="song-prompt">{song.prompt}</p>
                <div className="song-card-actions">
                  <span className="song-cost">{formatCost(song.cost)}</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDelete(song.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
