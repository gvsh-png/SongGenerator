import { useCallback, useRef, useState } from 'react';
import type { GenerationProgress, SavedSong, SongOptions } from './types';
import { ApiKeySetup } from './components/ApiKeySetup';
import { SongForm } from './components/SongForm';
import { SongLibrary } from './components/SongLibrary';
import { GenerationLoader } from './components/GenerationLoader';
import { getApiKey, saveSong } from './lib/storage';
import { buildPrompt, defaultSongOptions } from './lib/prompt';
import { generateSong } from './lib/openrouter';
import { estimateCost, selectCheapestModel } from './lib/pricing';
import { clearApiKey } from './lib/storage';

function App() {
  const [hasKey, setHasKey] = useState(!!getApiKey());
  const [options, setOptions] = useState<SongOptions>(defaultSongOptions());
  const [autoModel, setAutoModel] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [libraryKey, setLibraryKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'create' | 'library'>('create');
  const abortRef = useRef<AbortController | null>(null);

  const handleGenerate = useCallback(async () => {
    const apiKey = getApiKey();
    if (!apiKey) return;

    setError(null);
    setIsGenerating(true);

    const model = autoModel ? selectCheapestModel(options.duration) : options.model;
    const finalOptions = { ...options, model };
    const prompt = buildPrompt(finalOptions);

    abortRef.current = new AbortController();

    try {
      const result = await generateSong(
        apiKey,
        prompt,
        model,
        options.duration,
        { onProgress: setProgress },
        abortRef.current.signal,
      );

      const song: SavedSong = {
        id: crypto.randomUUID(),
        title: options.title || `${options.genre} ${options.mood} Track`,
        prompt,
        options: finalOptions,
        audioDataUrl: result.audioDataUrl,
        transcript: result.transcript,
        model,
        cost: estimateCost(model),
        duration: options.duration,
        createdAt: Date.now(),
      };

      await saveSong(song);
      setLibraryKey((k) => k + 1);
      setActiveTab('library');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Generation cancelled.');
      } else {
        setError(err instanceof Error ? err.message : 'Generation failed.');
      }
    } finally {
      setIsGenerating(false);
      setProgress(null);
      abortRef.current = null;
    }
  }, [options, autoModel]);

  const handleCancel = () => {
    abortRef.current?.abort();
  };

  if (!hasKey) {
    return <ApiKeySetup onReady={() => setHasKey(true)} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand">
          <span className="brand-icon">♪</span>
          <h1>Lyria Studio</h1>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            clearApiKey();
            setHasKey(false);
          }}
        >
          Settings
        </button>
      </header>

      <main className="app-main">
        {activeTab === 'create' && (
          <>
            <SongForm
              options={options}
              onChange={setOptions}
              onSubmit={handleGenerate}
              isGenerating={isGenerating}
              autoModel={autoModel}
              onAutoModelChange={setAutoModel}
            />
            {error && (
              <div className="error-banner" role="alert">
                {error}
              </div>
            )}
          </>
        )}

        {activeTab === 'library' && (
          <SongLibrary refreshKey={libraryKey} />
        )}
      </main>

      <nav className="tab-nav tab-nav--bottom" aria-label="Main navigation">
        <button
          className={`tab-btn ${activeTab === 'create' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('create')}
          type="button"
        >
          <span className="tab-icon" aria-hidden="true">✦</span>
          Create
        </button>
        <button
          className={`tab-btn ${activeTab === 'library' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('library')}
          type="button"
        >
          <span className="tab-icon" aria-hidden="true">♫</span>
          Library
        </button>
      </nav>

      {isGenerating && progress && (
        <GenerationLoader progress={progress} onCancel={handleCancel} />
      )}
    </div>
  );
}

export default App;
