import { useCallback, useState } from 'react';
import type { SongOptions } from '../types';
import {
  ENERGY_LEVELS,
  ERAS,
  GENRES,
  INSTRUMENTS,
  KEYS,
  MOODS,
  STRUCTURES,
  TEMPO_OPTIONS,
  VOCAL_TYPES,
} from './songFormOptions';
import { SpeechInput } from './SpeechInput';
import { CostPreview } from './CostPreview';
import { selectCheapestModel } from '../lib/pricing';

interface SongFormProps {
  options: SongOptions;
  onChange: (options: SongOptions) => void;
  onSubmit: () => void;
  isGenerating: boolean;
  autoModel: boolean;
  onAutoModelChange: (value: boolean) => void;
}

export function SongForm({
  options,
  onChange,
  onSubmit,
  isGenerating,
  autoModel,
  onAutoModelChange,
}: SongFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const update = <K extends keyof SongOptions>(key: K, value: SongOptions[K]) => {
    const next = { ...options, [key]: value };
    if (autoModel) {
      next.model = selectCheapestModel(next.duration);
    }
    onChange(next);
  };

  const toggleInstrument = (inst: string) => {
    const current = options.instruments;
    const next = current.includes(inst)
      ? current.filter((i) => i !== inst)
      : [...current, inst];
    update('instruments', next);
  };

  const handleSpeech = useCallback(
    (text: string) => {
      onChange({ ...options, description: text });
    },
    [options, onChange],
  );

  return (
    <form
      className="song-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="form-section">
        <label className="field-label" htmlFor="title">Title (optional)</label>
        <input
          id="title"
          className="text-input"
          value={options.title}
          onChange={(e) => update('title', e.target.value)}
          placeholder="My awesome track"
        />
      </div>

      <div className="form-section">
        <div className="field-header">
          <label className="field-label" htmlFor="description">
            Describe your song
          </label>
          <SpeechInput onTranscript={handleSpeech} disabled={isGenerating} />
        </div>
        <textarea
          id="description"
          className="text-area"
          value={options.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder="A dreamy lo-fi beat with soft piano, rain sounds, and a nostalgic summer vibe…"
          rows={4}
        />
        <p className="hint">
          Describe the style and mood — avoid naming real artists or songs. Google may block explicit or violent content.
        </p>
      </div>

      <div className="form-section">
        <label className="field-label" htmlFor="duration">
          Duration: {options.duration}s
        </label>
        <input
          id="duration"
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

      <div className="form-grid">
        <div className="form-section">
          <label className="field-label" htmlFor="genre">Genre</label>
          <select
            id="genre"
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
          <label className="field-label" htmlFor="mood">Mood</label>
          <select
            id="mood"
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

      <div className="form-grid">
        <div className="form-section">
          <label className="field-label" htmlFor="tempo">Tempo</label>
          <select
            id="tempo"
            className="select-input"
            value={options.tempo}
            onChange={(e) => update('tempo', e.target.value as SongOptions['tempo'])}
          >
            {TEMPO_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="form-section">
          <label className="field-label" htmlFor="energy">Energy</label>
          <select
            id="energy"
            className="select-input"
            value={options.energy}
            onChange={(e) => update('energy', e.target.value as SongOptions['energy'])}
          >
            {ENERGY_LEVELS.map((e) => (
              <option key={e.value} value={e.value}>{e.label}</option>
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

      <div className="form-section">
        <label className="field-label">Instruments</label>
        <div className="chip-group chip-group--wrap">
          {INSTRUMENTS.map((inst) => (
            <button
              key={inst}
              type="button"
              className={`chip ${options.instruments.includes(inst) ? 'chip--active' : ''}`}
              onClick={() => toggleInstrument(inst)}
            >
              {inst}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="btn btn-ghost advanced-toggle"
        onClick={() => setShowAdvanced(!showAdvanced)}
      >
        {showAdvanced ? '▾ Hide' : '▸ Show'} advanced options
      </button>

      {showAdvanced && (
        <div className="advanced-section">
          <div className="form-grid">
            <div className="form-section">
              <label className="field-label" htmlFor="key">Key</label>
              <select
                id="key"
                className="select-input"
                value={options.key}
                onChange={(e) => update('key', e.target.value)}
              >
                {KEYS.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>

            <div className="form-section">
              <label className="field-label" htmlFor="era">Era</label>
              <select
                id="era"
                className="select-input"
                value={options.era}
                onChange={(e) => update('era', e.target.value)}
              >
                {ERAS.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-section">
            <label className="field-label" htmlFor="structure">Structure</label>
            <select
              id="structure"
              className="select-input"
              value={options.structure}
              onChange={(e) => update('structure', e.target.value)}
            >
              {STRUCTURES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="form-section">
            <label className="field-label" htmlFor="lyrics">Lyrics (optional)</label>
            <textarea
              id="lyrics"
              className="text-area"
              value={options.lyrics}
              onChange={(e) => update('lyrics', e.target.value)}
              placeholder="Verse 1: Walking down the street…"
              rows={3}
            />
          </div>

          <div className="form-section">
            <label className="field-label" htmlFor="seed">Seed (optional)</label>
            <input
              id="seed"
              type="number"
              className="text-input"
              value={options.seed ?? ''}
              onChange={(e) =>
                update('seed', e.target.value ? Number(e.target.value) : undefined)
              }
              placeholder="For reproducible results"
            />
          </div>

          <div className="form-section">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={autoModel}
                onChange={(e) => onAutoModelChange(e.target.checked)}
              />
              Auto-select cheapest model (Clip ≤30s, Pro &gt;30s)
            </label>
          </div>
        </div>
      )}

      <CostPreview
        model={options.model}
        duration={options.duration}
        autoModel={autoModel}
      />

      <button
        type="submit"
        className="btn btn-primary btn-full btn-generate"
        disabled={isGenerating || !options.description.trim()}
      >
        {isGenerating ? 'Generating…' : 'Generate Song'}
      </button>
    </form>
  );
}
