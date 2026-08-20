import { getSongsMetadata } from '../lib/storage';
import { formatDuration } from '../lib/pricing';
import { getAppBranding, isLocalMode } from '../lib/config';

interface HomeScreenProps {
  onCreateSong: () => void;
  onPromptFlow: () => void;
  onWriteLyrics: () => void;
  onOpenLibrary: () => void;
  libraryKey: number;
}

export function HomeScreen({
  onCreateSong,
  onPromptFlow,
  onWriteLyrics,
  onOpenLibrary,
}: HomeScreenProps) {
  const branding = getAppBranding();
  const recentSongs = getSongsMetadata().slice(0, 3);

  return (
    <div className="home-screen">
      <section className="home-hero">
        <p className="home-eyebrow">{branding.tagline}</p>
        <h2 className="home-title">What will you create today?</h2>
        <p className="home-subtitle">
          {isLocalMode()
            ? 'Generate songs on your own hardware — describe a vibe, write lyrics, or use a prompt template.'
            : 'Generate songs with Lyria 3 — describe a vibe, write your own lyrics, or use an AI prompt.'}
        </p>
      </section>

      <section className="home-actions">
        <button type="button" className="action-card" onClick={onCreateSong}>
          <span className="action-card-icon" aria-hidden="true">✦</span>
          <div className="action-card-body">
            <h3>Create a song</h3>
            <p>Describe your track and generate music with {branding.generateWith}.</p>
          </div>
          <span className="action-card-arrow" aria-hidden="true">→</span>
        </button>

        <button type="button" className="action-card action-card--alt" onClick={onWriteLyrics}>
          <span className="action-card-icon" aria-hidden="true">📝</span>
          <div className="action-card-body">
            <h3>Write your lyrics</h3>
            <p>Choose the length, write your own lyrics, and generate the song.</p>
          </div>
          <span className="action-card-arrow" aria-hidden="true">→</span>
        </button>

        <button type="button" className="action-card" onClick={onPromptFlow}>
          <span className="action-card-icon" aria-hidden="true">✎</span>
          <div className="action-card-body">
            <h3>Get a prompt &amp; create</h3>
            <p>Build a lyrics prompt, use any AI you like, then turn the lyrics into a song.</p>
          </div>
          <span className="action-card-arrow" aria-hidden="true">→</span>
        </button>
      </section>

      {recentSongs.length > 0 && (
        <section className="home-recent">
          <div className="home-recent-header">
            <h3>Recent songs</h3>
            <button type="button" className="link-btn" onClick={onOpenLibrary}>
              View all
            </button>
          </div>
          <div className="home-recent-list">
            {recentSongs.map((song) => (
              <div key={song.id} className="home-recent-item">
                <span className="home-recent-title">{song.title}</span>
                <span className="home-recent-meta">
                  {song.options.genre} · {formatDuration(song.duration)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="home-tips">
        <h3>How it works</h3>
        <ol className="home-steps">
          <li>Pick a path — describe, write lyrics, or use a prompt template</li>
          <li>Set duration, genre, and vocals</li>
          <li>{isLocalMode() ? 'Generate on your local server' : 'Confirm cost and generate your track'}</li>
          <li>Listen, download, and save to your library</li>
        </ol>
      </section>
    </div>
  );
}
