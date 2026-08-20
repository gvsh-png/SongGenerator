import { useCallback, useEffect, useRef, useState } from 'react';
import type { GenerationProgress } from '../types';
import {
  deleteSong,
  getApiKey,
  getSongAudio,
  getSongVideo,
  getSongsMetadata,
  saveSongVideo,
  updateSongMetadata,
} from '../lib/storage';
import { downloadAudio, downloadVideo } from '../lib/download';
import { formatCost, formatDuration } from '../lib/pricing';
import { MODEL_PRICING } from '../lib/pricing';
import {
  VIDEO_MODEL,
  VIDEO_PRICING,
  buildMusicVideoPrompt,
  estimateMusicVideoCost,
} from '../lib/musicVideo';
import { getLyricsForSong } from '../lib/lyrics';
import { generateMusicVideo } from '../lib/videoGeneration';
import { MusicVideoConfirm } from './MusicVideoConfirm';
import { GenerationLoader } from './GenerationLoader';
import { supportsMusicVideo } from '../lib/config';

interface SongLibraryProps {
  refreshKey: number;
}

export function SongLibrary({ refreshKey }: SongLibraryProps) {
  const [songs, setSongs] = useState(getSongsMetadata());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({});
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadingVideoId, setDownloadingVideoId] = useState<string | null>(null);
  const [confirmVideoSongId, setConfirmVideoSongId] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState<GenerationProgress | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setSongs(getSongsMetadata());
  }, [refreshKey]);

  useEffect(() => {
    return () => {
      Object.values(videoUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [videoUrls]);

  const ensureAudio = async (id: string): Promise<string | null> => {
    if (audioUrls[id]) return audioUrls[id];
    const audio = await getSongAudio(id);
    if (audio) setAudioUrls((prev) => ({ ...prev, [id]: audio }));
    return audio;
  };

  const ensureVideo = async (id: string): Promise<string | null> => {
    if (videoUrls[id]) return videoUrls[id];
    const blob = await getSongVideo(id);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    setVideoUrls((prev) => ({ ...prev, [id]: url }));
    return url;
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
    if (videoUrls[id]) URL.revokeObjectURL(videoUrls[id]);
    setVideoUrls((prev) => {
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
    setVideoError(null);
    await ensureAudio(id);
    const song = songs.find((s) => s.id === id);
    if (song?.musicVideo) await ensureVideo(id);
  };

  const handleDownloadSong = async (id: string, title: string) => {
    setDownloadingId(id);
    try {
      const audio = await ensureAudio(id);
      if (!audio) return;
      downloadAudio(audio, title);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadVideo = async (id: string, title: string) => {
    setDownloadingVideoId(id);
    try {
      const blob = await getSongVideo(id);
      if (!blob) return;
      downloadVideo(blob, `${title}-music-video`);
    } finally {
      setDownloadingVideoId(null);
    }
  };

  const handleConfirmMusicVideo = useCallback(async (videoPrompt: string) => {
    const songId = confirmVideoSongId;
    if (!songId || !videoPrompt.trim()) return;

    const apiKey = getApiKey();
    if (!apiKey) return;

    const songMeta = songs.find((s) => s.id === songId);
    if (!songMeta) return;

    const audioDataUrl = await getSongAudio(songId);
    if (!audioDataUrl) {
      setVideoError('Could not load song audio.');
      return;
    }

    const song = { ...songMeta, audioDataUrl };

    setVideoError(null);
    setIsGeneratingVideo(true);
    abortRef.current = new AbortController();

    try {
      const result = await generateMusicVideo(
        apiKey,
        song,
        { onProgress: setVideoProgress },
        abortRef.current.signal,
        videoPrompt,
      );

      await saveSongVideo(songId, result.videoBlob);
      updateSongMetadata(songId, {
        musicVideo: {
          duration: result.duration,
          cost: result.cost,
          createdAt: Date.now(),
          resolution: VIDEO_PRICING.resolution,
          model: VIDEO_MODEL,
          clipCount: result.clipCount,
          hasLyrics: result.hasLyrics,
        },
      });

      setSongs(getSongsMetadata());
      if (videoUrls[songId]) URL.revokeObjectURL(videoUrls[songId]);
      const url = URL.createObjectURL(result.videoBlob);
      setVideoUrls((prev) => ({ ...prev, [songId]: url }));
      setConfirmVideoSongId(null);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setVideoError('Music video generation cancelled.');
      } else {
        setVideoError(err instanceof Error ? err.message : 'Music video generation failed.');
      }
    } finally {
      setIsGeneratingVideo(false);
      setVideoProgress(null);
      abortRef.current = null;
    }
  }, [confirmVideoSongId, songs, videoUrls]);

  const handleCancelVideo = () => {
    abortRef.current?.abort();
  };

  const confirmSong = songs.find((s) => s.id === confirmVideoSongId);

  if (songs.length === 0) {
    return (
      <div className="library-empty">
        <p>No songs yet. Create your first one in the Create tab.</p>
      </div>
    );
  }

  return (
    <>
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
                    {song.musicVideo && ' · Video'}
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

                  {videoUrls[song.id] && (
                    <video
                      controls
                      src={videoUrls[song.id]}
                      className="song-video-player"
                      preload="metadata"
                      playsInline
                    />
                  )}

                  {song.transcript && (
                    <p className="song-transcript">{song.transcript}</p>
                  )}
                  <p className="song-prompt">{song.prompt}</p>

                  <div className="song-card-actions">
                    <div className="song-cost-row">
                      <span className="song-cost">
                        Song: {formatCost(song.cost)}
                      </span>
                      {song.musicVideo && (
                        <span className="song-cost">
                          Video: {formatCost(song.musicVideo.cost)}
                          {song.musicVideo.hasLyrics ? ' · lyrics' : ''}
                        </span>
                      )}
                    </div>

                    <div className="song-card-buttons">
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => handleDownloadSong(song.id, song.title)}
                        disabled={downloadingId === song.id}
                      >
                        {downloadingId === song.id ? 'Saving…' : '↓ Download song'}
                      </button>

                      {!song.musicVideo && supportsMusicVideo() ? (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setConfirmVideoSongId(song.id)}
                          disabled={isGeneratingVideo}
                        >
                          ▶ Music video · {formatCost(estimateMusicVideoCost(song.duration))}
                        </button>
                      ) : !song.musicVideo ? null : (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleDownloadVideo(song.id, song.title)}
                          disabled={downloadingVideoId === song.id}
                        >
                          {downloadingVideoId === song.id ? 'Saving…' : '↓ Download video'}
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleDelete(song.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {videoError && expandedId === song.id && (
                    <div className="error-banner" role="alert">
                      {videoError}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {supportsMusicVideo() && (
        <MusicVideoConfirm
          songTitle={confirmSong?.title ?? 'Untitled Song'}
          songDuration={confirmSong?.duration ?? 30}
          hasLyrics={confirmSong ? getLyricsForSong(confirmSong).hasLyrics : false}
          defaultVideoPrompt={confirmSong ? buildMusicVideoPrompt(confirmSong) : ''}
          open={!!confirmVideoSongId && !isGeneratingVideo}
          onConfirm={handleConfirmMusicVideo}
          onCancel={() => setConfirmVideoSongId(null)}
          isGenerating={isGeneratingVideo}
        />
      )}

      {supportsMusicVideo() && isGeneratingVideo && videoProgress && (
        <GenerationLoader
          progress={videoProgress}
          onCancel={handleCancelVideo}
          title="Creating music video"
        />
      )}
    </>
  );
}
