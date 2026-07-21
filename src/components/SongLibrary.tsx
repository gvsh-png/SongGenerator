import { useEffect, useState } from 'react';
import { deleteSong, getSongAudio, getSongsMetadata } from '../lib/storage';
import { downloadAudio } from '../lib/download';
import { formatCost, formatDuration } from '../lib/pricing';
import { MODEL_PRICING } from '../lib/pricing';

interface SongLibraryProps {
  refreshKey: number;
}

export function SongLibrary({ refreshKey }: SongLibraryProps) {
  const [songs, setSongs] = useState(getSongsMetadata());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    setSongs(getSongsMetadata());
  }, [refreshKey]);

  const ensureAudio = async (id: string): Promise<string | null> => {
    if (audioUrls[id]) return audioUrls[id];
    const audio = await getSongAudio(id);
    if (audio) setAudioUrls((prev) => ({ ...prev, [id]: audio }));
    return audio;
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this song?')) return;
    await deleteSong(id);
    setSongs(getSongsMetadata());
    setAudioUrls((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (expandedId === id) setExpandedId(null);
  };

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    await ensureAudio(id);
  };

  const handleDownload = async (id: string, title: string) => {
    setDownloadingId(id);
    try {
      const audio = await ensureAudio(id);
      if (!audio) return;
      downloadAudio(audio, title);
    } finally {
      setDownloadingId(null);
    }
  };

  if (songs.length === 0) {
    return (
      <div className="library-empty">
        <p>No songs yet. Create your first one in the Create tab.</p>
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
              <span className="song-card-chevron" aria-hidden="true">
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
                  <div className="song-card-buttons">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleDownload(song.id, song.title)}
                      disabled={downloadingId === song.id}
                    >
                      {downloadingId === song.id ? 'Saving…' : 'Download MP3'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleDelete(song.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
