import { useCallback, useRef, useState } from 'react';
import type { AppView, GenerationProgress, PromptFlowState, SavedSong, SongOptions } from './types';
import { defaultPromptFlowState } from './types';
import { SetupScreen, checkAppConfigured } from './components/SetupScreen';
import { SongForm } from './components/SongForm';
import { SongLibrary } from './components/SongLibrary';
import { GenerationLoader } from './components/GenerationLoader';
import { HomeScreen } from './components/HomeScreen';
import { CreateActionSheet } from './components/CreateActionSheet';
import { BottomNav } from './components/BottomNav';
import { PromptWorkflow } from './components/PromptWorkflow';
import { WriteLyricsForm } from './components/WriteLyricsForm';
import { clearAppConfig, saveSong } from './lib/storage';
import { buildPrompt, buildPromptFromFlow, defaultSongOptions, defaultLyricsSongOptions, flowToSongOptions } from './lib/prompt';
import { suggestTitleFromLyrics } from './lib/titleFromLyrics';
import { generateSong } from './lib/providers/generateSong';
import { humanizeGenerationError } from './lib/generationErrors';
import { estimateCost, selectCheapestModel } from './lib/pricing';
import { getAppBranding } from './lib/config';

function App() {
  const branding = getAppBranding();
  const [hasKey, setHasKey] = useState(checkAppConfigured());
  const [view, setView] = useState<AppView>('home');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [options, setOptions] = useState(defaultSongOptions());
  const [lyricsOptions, setLyricsOptions] = useState(defaultLyricsSongOptions());
  const [promptFlow, setPromptFlow] = useState<PromptFlowState>(defaultPromptFlowState());
  const [autoModel, setAutoModel] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [libraryKey, setLibraryKey] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const runGeneration = useCallback(async (
    prompt: string,
    model: ReturnType<typeof selectCheapestModel>,
    duration: number,
    songMeta: { title: string; options: SavedSong['options'] },
  ) => {
    setError(null);
    setIsGenerating(true);
    abortRef.current = new AbortController();

    try {
      const result = await generateSong(
        prompt,
        model,
        duration,
        { onProgress: setProgress },
        abortRef.current.signal,
      );

      const song: SavedSong = {
        id: crypto.randomUUID(),
        title: songMeta.title,
        prompt,
        options: songMeta.options,
        audioDataUrl: result.audioDataUrl,
        transcript: result.transcript,
        model,
        cost: estimateCost(model),
        duration,
        createdAt: Date.now(),
      };

      await saveSong(song);
      setLibraryKey((k) => k + 1);
      setView('library');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Generation cancelled.');
      } else {
        setError(humanizeGenerationError(err instanceof Error ? err.message : 'Generation failed.'));
      }
    } finally {
      setIsGenerating(false);
      setProgress(null);
      abortRef.current = null;
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    const model = autoModel ? selectCheapestModel(options.duration) : options.model;
    const finalOptions = { ...options, model };
    const prompt = buildPrompt(finalOptions);
    const title = options.title || `${options.genre} ${options.mood} Track`;

    await runGeneration(prompt, model, options.duration, {
      title,
      options: finalOptions,
    });
  }, [options, autoModel, runGeneration]);

  const handleWriteLyricsGenerate = useCallback(async () => {
    if (!lyricsOptions.lyrics.trim()) return;

    const model = selectCheapestModel(lyricsOptions.duration);
    const title =
      lyricsOptions.title.trim() ||
      suggestTitleFromLyrics(lyricsOptions.lyrics, lyricsOptions.genre);
    const finalOptions: SongOptions = {
      ...lyricsOptions,
      model,
      title,
      description: `Custom lyrics song (${lyricsOptions.genre}, ${lyricsOptions.mood})`,
    };
    const prompt = buildPrompt(finalOptions);

    await runGeneration(prompt, model, lyricsOptions.duration, {
      title,
      options: finalOptions,
    });
  }, [lyricsOptions, runGeneration]);

  const handlePromptFlowConfirm = useCallback(async (flow: PromptFlowState) => {
    const model = selectCheapestModel(flow.duration);
    const songOptions = flowToSongOptions(flow);
    const prompt = buildPromptFromFlow(flow);
    const title = flow.customTitle.trim() || flow.suggestedTitle || `${flow.genre} Track`;

    await runGeneration(prompt, model, flow.duration, {
      title,
      options: { ...songOptions, model },
    });
  }, [runGeneration]);

  const handleCancel = () => {
    abortRef.current?.abort();
  };

  const openCreate = () => {
    setError(null);
    setView('create');
  };

  const openPromptFlow = () => {
    setError(null);
    setPromptFlow(defaultPromptFlowState());
    setView('prompt-flow');
  };

  const openWriteLyrics = () => {
    setError(null);
    setLyricsOptions(defaultLyricsSongOptions());
    setView('write-lyrics');
  };

  if (!hasKey) {
    return <SetupScreen onReady={() => setHasKey(true)} />;
  }

  return (
    <div className="app-shell">
      <div className="app">
        <header className="app-header">
          <button
            type="button"
            className="header-brand"
            onClick={() => setView('home')}
          >
            <span className="brand-icon">♪</span>
            <h1>{branding.appName}</h1>
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              clearAppConfig();
              setHasKey(false);
            }}
          >
            Settings
          </button>
        </header>

        <main className="app-main">
          {view === 'home' && (
            <HomeScreen
              onCreateSong={openCreate}
              onPromptFlow={openPromptFlow}
              onWriteLyrics={openWriteLyrics}
              onOpenLibrary={() => setView('library')}
              libraryKey={libraryKey}
            />
          )}

          {view === 'create' && (
            <div className="page-create">
              <div className="page-header">
                <h2>Create a song</h2>
                <p>Describe your track and generate with {branding.generateWith}.</p>
              </div>
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
            </div>
          )}

          {view === 'prompt-flow' && (
            <>
              <PromptWorkflow
                state={promptFlow}
                onChange={setPromptFlow}
                onConfirm={handlePromptFlowConfirm}
                onBack={() => setView('home')}
                isGenerating={isGenerating}
              />
              {error && (
                <div className="error-banner" role="alert">
                  {error}
                </div>
              )}
            </>
          )}

          {view === 'write-lyrics' && (
            <div className="page-create">
              <div className="page-header">
                <button type="button" className="btn btn-ghost btn-sm page-back" onClick={() => setView('home')}>
                  ← Back
                </button>
                <h2>Write your lyrics</h2>
                <p>Pick a length, write your lyrics, and generate the song.</p>
              </div>
              <WriteLyricsForm
                options={lyricsOptions}
                onChange={setLyricsOptions}
                onSubmit={handleWriteLyricsGenerate}
                isGenerating={isGenerating}
              />
              {error && (
                <div className="error-banner" role="alert">
                  {error}
                </div>
              )}
            </div>
          )}

          {view === 'library' && (
            <div className="page-library">
              <div className="page-header">
                <h2>Your library</h2>
                <p>Listen, download, and manage your songs.</p>
              </div>
              <SongLibrary refreshKey={libraryKey} />
            </div>
          )}
        </main>

        <BottomNav
          activeView={view}
          onNavigate={setView}
          onCreatePress={() => setSheetOpen(true)}
        />

        <CreateActionSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          onCreateSong={openCreate}
          onPromptFlow={openPromptFlow}
          onWriteLyrics={openWriteLyrics}
        />

        {isGenerating && progress && (
          <GenerationLoader progress={progress} onCancel={handleCancel} />
        )}
      </div>
    </div>
  );
}

export default App;
