import { getSongsMetadata } from '../lib/storage';
import { formatDuration } from '../lib/pricing';

interface HomeScreenProps {
  onCreateSong: () => void;
  onPromptFlow: () => void;
  onOpenLibrary: () => void;
  libraryKey: number;
}

export function HomeScreen({
  onCreateSong,
  onPromptFlow,
  onOpenLibrary,
}: HomeScreenProps) {
  const recentSongs = getSongsMetadata().slice(0, 3);

  return (
    <div className="home-screen">
      <section className="home-hero">
        <p className="home-eyebrow">AI Music Studio</p>
        <h2 className="home-title">What will you create today?</h2>
        <p className="home-subtitle">
          Generate songs with Lyria 3, or craft lyrics with your favorite AI first.
        </p>
      </section>

      <section className="home-actions">
        <button type="button" className="action-card" onClick={onCreateSong}>
          <span className="action-card-icon" aria-hidden="true">✦</span>
          <div className="action-card-body">
            <h3>Create a song</h3>
            <p>Describe your track and generate music directly with Lyria 3.</p>
          </div>
          <span className="action-card-arrow" aria-hidden="true">→</span>
        </button>

        <button type="button" className="action-card action-card--alt" onClick={onPromptFlow}>
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
          <li>Pick a path — direct creation or prompt-first workflow</li>
          <li>Customize genre, vocals, mood, and duration</li>
          <li>Confirm cost and generate your track</li>
          <li>Listen, download, and save to your library</li>
        </ol>
      </section>
    </div>
  );
}
