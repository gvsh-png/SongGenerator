import { useCallback } from 'react';
import type { SongOptions } from '../types';
import { GENRES, MOODS } from '../types';
import { VOCAL_TYPES } from './songFormOptions';
import { SpeechInput } from './SpeechInput';
import { CostPreview } from './CostPreview';
import { selectCheapestModel } from '../lib/pricing';

interface WriteLyricsFormProps {
  options: SongOptions;
  onChange: (options: SongOptions) => void;
  onSubmit: () => void;
  isGenerating: boolean;
}

export function WriteLyricsForm({
  options,
  onChange,
  onSubmit,
  isGenerating,
}: WriteLyricsFormProps) {
  const update = <K extends keyof SongOptions>(key: K, value: SongOptions[K]) => {
    const next = { ...options, [key]: value };
    next.model = selectCheapestModel(next.duration);
    onChange(next);
  };

  const handleSpeech = useCallback(
    (text: string) => {
      onChange({ ...options, lyrics: text });
    },
    [options, onChange],
  );

  const hasLyrics = options.lyrics.trim().length > 0;

  return (
    <form
      className="song-form write-lyrics-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="form-section">
        <label className="field-label" htmlFor="wl-duration">
          Song length: {options.duration}s
        </label>
        <input
          id="wl-duration"
          type="range"
          className="range-input"
          min={15}
          max={120}
          step={5}
          value={options.duration}
          onChange={(e) => update('duration', Number(e.target.value))}
        />
        <div className="range-labels">
          <span>15s</span>
          <span>2 min</span>
        </div>
      </div>

      <div className="form-section">
        <div className="field-header">
          <label className="field-label" htmlFor="wl-lyrics">
            Your lyrics
          </label>
          <SpeechInput onTranscript={handleSpeech} disabled={isGenerating} />
        </div>
        <textarea
          id="wl-lyrics"
          className="text-area text-area--lyrics"
          value={options.lyrics}
          onChange={(e) => update('lyrics', e.target.value)}
          placeholder={"[Verse 1]\nWalking down the empty street at midnight…\n\n[Chorus]\nWe rise, we fall, we stand together…"}
          rows={10}
        />
        <p className="hint">Use section labels like [Verse] or [Chorus] if you like.</p>
      </div>

      <div className="form-section">
        <label className="field-label" htmlFor="wl-title">Title (optional)</label>
        <input
          id="wl-title"
          className="text-input"
          value={options.title}
          onChange={(e) => update('title', e.target.value)}
          placeholder="Auto-generated from lyrics if left blank"
        />
      </div>

      <div className="form-grid">
        <div className="form-section">
          <label className="field-label" htmlFor="wl-genre">Genre</label>
          <select
            id="wl-genre"
            className="select-input"
            value={options.genre}
            onChange={(e) => update('genre', e.target.value)}
          >
            {GENRES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <div className="form-section">
          <label className="field-label" htmlFor="wl-mood">Mood</label>
          <select
            id="wl-mood"
            className="select-input"
            value={options.mood}
            onChange={(e) => update('mood', e.target.value)}
          >
            {MOODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-section">
        <label className="field-label">Vocals</label>
        <div className="chip-group chip-group--wrap">
          {VOCAL_TYPES.map((v) => (
            <button
              key={v.value}
              type="button"
              className={`chip ${options.vocals === v.value ? 'chip--active' : ''}`}
              onClick={() => update('vocals', v.value)}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <CostPreview
        model={options.model}
        duration={options.duration}
        autoModel
      />

      <button
        type="submit"
        className="btn btn-primary btn-full btn-generate"
        disabled={isGenerating || !hasLyrics}
      >
        {isGenerating ? 'Generating…' : 'Generate song from lyrics'}
      </button>
    </form>
  );
}
