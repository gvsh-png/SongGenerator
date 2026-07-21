import { useState } from 'react';
import type { PromptFlowState } from '../types';
import { GENRES, MOODS } from '../types';
import { VOCAL_TYPES, TEMPO_OPTIONS, ENERGY_LEVELS } from './songFormOptions';
import { buildLyricsRequestPrompt } from '../lib/promptTemplates';
import { suggestTitleFromLyrics } from '../lib/titleFromLyrics';
import { CostPreview } from './CostPreview';
import { selectCheapestModel } from '../lib/pricing';
import { formatDuration } from '../lib/pricing';

interface PromptWorkflowProps {
  state: PromptFlowState;
  onChange: (state: PromptFlowState) => void;
  onConfirm: (state: PromptFlowState) => void;
  onBack: () => void;
  isGenerating: boolean;
}

const STEPS = [
  { id: 'configure', label: 'Configure' },
  { id: 'copy-prompt', label: 'Copy prompt' },
  { id: 'paste-lyrics', label: 'Paste lyrics' },
  { id: 'confirm', label: 'Confirm' },
] as const;

export function PromptWorkflow({
  state,
  onChange,
  onConfirm,
  onBack,
  isGenerating,
}: PromptWorkflowProps) {
  const [copied, setCopied] = useState(false);
  const model = selectCheapestModel(state.duration);
  const title = state.customTitle.trim() || state.suggestedTitle;

  const update = (patch: Partial<PromptFlowState>) => {
    onChange({ ...state, ...patch });
  };

  const goToCopyPrompt = () => {
    const generatedPrompt = buildLyricsRequestPrompt({
      genre: state.genre,
      vocals: state.vocals,
      mood: state.mood,
      tempo: state.tempo,
      energy: state.energy,
      theme: state.theme,
    });
    update({ generatedPrompt, step: 'copy-prompt' });
  };

  const goToPasteLyrics = () => {
    update({ step: 'paste-lyrics' });
  };

  const goToConfirm = () => {
    const suggestedTitle = suggestTitleFromLyrics(state.pastedLyrics, state.genre);
    update({ suggestedTitle, customTitle: '', step: 'confirm' });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(state.generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stepIndex = STEPS.findIndex((s) => s.id === state.step);

  return (
    <div className="prompt-workflow">
      <div className="workflow-header">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
          ← Back
        </button>
        <h2 className="workflow-title">Prompt &amp; Create</h2>
      </div>

      <div className="workflow-steps" aria-label="Progress">
        {STEPS.map((step, i) => (
          <div
            key={step.id}
            className={`workflow-step ${i <= stepIndex ? 'workflow-step--active' : ''} ${i < stepIndex ? 'workflow-step--done' : ''}`}
          >
            <span className="workflow-step-dot">{i < stepIndex ? '✓' : i + 1}</span>
            <span className="workflow-step-label">{step.label}</span>
          </div>
        ))}
      </div>

      {state.step === 'configure' && (
        <div className="workflow-panel">
          <p className="panel-intro">
            Choose your style. We'll build a ready-to-copy prompt — no AI needed on our end.
          </p>

          <div className="form-grid">
            <div className="form-section">
              <label className="field-label" htmlFor="pf-genre">Genre</label>
              <select
                id="pf-genre"
                className="select-input"
                value={state.genre}
                onChange={(e) => update({ genre: e.target.value })}
              >
                {GENRES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div className="form-section">
              <label className="field-label" htmlFor="pf-mood">Mood</label>
              <select
                id="pf-mood"
                className="select-input"
                value={state.mood}
                onChange={(e) => update({ mood: e.target.value })}
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
                  className={`chip ${state.vocals === v.value ? 'chip--active' : ''}`}
                  onClick={() => update({ vocals: v.value })}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-grid">
            <div className="form-section">
              <label className="field-label" htmlFor="pf-tempo">Tempo</label>
              <select
                id="pf-tempo"
                className="select-input"
                value={state.tempo}
                onChange={(e) => update({ tempo: e.target.value as PromptFlowState['tempo'] })}
              >
                {TEMPO_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="form-section">
              <label className="field-label" htmlFor="pf-energy">Energy</label>
              <select
                id="pf-energy"
                className="select-input"
                value={state.energy}
                onChange={(e) => update({ energy: e.target.value as PromptFlowState['energy'] })}
              >
                {ENERGY_LEVELS.map((e) => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-section">
            <label className="field-label" htmlFor="pf-theme">Theme (optional)</label>
            <input
              id="pf-theme"
              className="text-input"
              value={state.theme}
              onChange={(e) => update({ theme: e.target.value })}
              placeholder="e.g. summer nights, heartbreak, road trip"
            />
          </div>

          <button type="button" className="btn btn-primary btn-full" onClick={goToCopyPrompt}>
            Generate prompt template
          </button>
        </div>
      )}

      {state.step === 'copy-prompt' && (
        <div className="workflow-panel">
          <p className="panel-intro">
            Copy this prompt and paste it into ChatGPT, Claude, Gemini, or any AI you prefer.
            Ask it to return song lyrics.
          </p>

          <div className="copy-box">
            <pre className="copy-box-text">{state.generatedPrompt}</pre>
            <button
              type="button"
              className="btn btn-primary btn-sm copy-box-btn"
              onClick={handleCopy}
            >
              {copied ? 'Copied!' : 'Copy prompt'}
            </button>
          </div>

          <button type="button" className="btn btn-primary btn-full" onClick={goToPasteLyrics}>
            I have my lyrics →
          </button>
        </div>
      )}

      {state.step === 'paste-lyrics' && (
        <div className="workflow-panel">
          <p className="panel-intro">
            Paste the lyrics your AI returned, then set how the final song should sound.
          </p>

          <div className="form-section">
            <label className="field-label" htmlFor="pf-lyrics">Lyrics from your AI</label>
            <textarea
              id="pf-lyrics"
              className="text-area"
              value={state.pastedLyrics}
              onChange={(e) => update({ pastedLyrics: e.target.value })}
              placeholder="[Verse 1]&#10;Walking through the city lights…&#10;&#10;[Chorus]&#10;We rise, we fall…"
              rows={8}
            />
          </div>

          <div className="form-section">
            <label className="field-label" htmlFor="pf-duration">
              Song duration: {formatDuration(state.duration)}
            </label>
            <input
              id="pf-duration"
              type="range"
              className="range-input"
              min={15}
              max={120}
              step={5}
              value={state.duration}
              onChange={(e) => update({ duration: Number(e.target.value) })}
            />
            <div className="range-labels">
              <span>15s</span>
              <span>2 min</span>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-full"
            onClick={goToConfirm}
            disabled={!state.pastedLyrics.trim()}
          >
            Review &amp; confirm →
          </button>
        </div>
      )}

      {state.step === 'confirm' && (
        <div className="workflow-panel">
          <p className="panel-intro">
            Review your song details before generating. You can edit the title below.
          </p>

          <div className="confirm-card">
            <div className="form-section">
              <label className="field-label" htmlFor="pf-title">Song title</label>
              <input
                id="pf-title"
                className="text-input"
                value={state.customTitle || state.suggestedTitle}
                onChange={(e) => update({ customTitle: e.target.value })}
                placeholder={state.suggestedTitle}
              />
              {state.suggestedTitle && !state.customTitle && (
                <p className="hint">Suggested from your lyrics — edit anytime</p>
              )}
            </div>

            <div className="confirm-detail">
              <span>Genre</span>
              <strong>{state.genre}</strong>
            </div>
            <div className="confirm-detail">
              <span>Duration</span>
              <strong>{formatDuration(state.duration)}</strong>
            </div>
            <div className="confirm-detail">
              <span>Vocals</span>
              <strong>{VOCAL_TYPES.find((v) => v.value === state.vocals)?.label}</strong>
            </div>

            <div className="confirm-lyrics-preview">
              <span className="field-label">Lyrics preview</span>
              <p>{state.pastedLyrics.slice(0, 200)}{state.pastedLyrics.length > 200 ? '…' : ''}</p>
            </div>
          </div>

          <CostPreview model={model} duration={state.duration} autoModel />

          <div className="confirm-actions">
            <button
              type="button"
              className="btn btn-ghost btn-full"
              onClick={() => update({ step: 'paste-lyrics' })}
              disabled={isGenerating}
            >
              Go back
            </button>
            <button
              type="button"
              className="btn btn-primary btn-full btn-generate"
              onClick={() => onConfirm({ ...state, customTitle: title })}
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating…' : 'Confirm & generate'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
