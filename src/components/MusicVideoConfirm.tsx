import { useEffect, useState } from 'react';
import { formatCost, formatDuration } from '../lib/pricing';
import {
  VIDEO_PRICING,
  planMusicVideoClips,
} from '../lib/musicVideo';

interface MusicVideoConfirmProps {
  songTitle: string;
  songDuration: number;
  hasLyrics: boolean;
  defaultVideoPrompt: string;
  open: boolean;
  onConfirm: (videoPrompt: string) => void;
  onCancel: () => void;
  isGenerating: boolean;
}

export function MusicVideoConfirm({
  songTitle,
  songDuration,
  hasLyrics,
  defaultVideoPrompt,
  open,
  onConfirm,
  onCancel,
  isGenerating,
}: MusicVideoConfirmProps) {
  const [videoPrompt, setVideoPrompt] = useState(defaultVideoPrompt);

  useEffect(() => {
    if (open) setVideoPrompt(defaultVideoPrompt);
  }, [open, defaultVideoPrompt]);

  if (!open) return null;

  const plan = planMusicVideoClips(songDuration);
  const trimmedPrompt = videoPrompt.trim();

  return (
    <div className="sheet-overlay" onClick={onCancel} role="presentation">
      <div
        className="sheet confirm-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Confirm music video generation"
      >
        <div className="sheet-handle" aria-hidden="true" />
        <h2 className="sheet-title">Create music video</h2>
        <p className="sheet-subtitle">
          Full video for &ldquo;{songTitle}&rdquo;
        </p>

        <div className="form-section confirm-prompt-section">
          <label className="field-label" htmlFor="mv-prompt">
            Video prompt
          </label>
          <textarea
            id="mv-prompt"
            className="text-area text-area--video-prompt"
            value={videoPrompt}
            onChange={(e) => setVideoPrompt(e.target.value)}
            placeholder="Describe the visuals for your music video…"
            rows={5}
            disabled={isGenerating}
          />
          <p className="hint">
            Edit this to steer the look and scenes. Each clip uses your prompt plus an opening, middle, or finale note.
          </p>
        </div>

        <div className="cost-preview">
          <div className="cost-row">
            <span className="cost-label">Model</span>
            <span className="cost-value">{VIDEO_PRICING.label}</span>
          </div>
          <div className="cost-row">
            <span className="cost-label">Song length</span>
            <span className="cost-value">{formatDuration(songDuration)}</span>
          </div>
          <div className="cost-row">
            <span className="cost-label">Video length</span>
            <span className="cost-value">{formatDuration(plan.totalDuration)}</span>
          </div>
          <div className="cost-row">
            <span className="cost-label">Clips to generate</span>
            <span className="cost-value">{plan.clipCount} × up to 8s (4 parallel)</span>
          </div>
          <div className="cost-row">
            <span className="cost-label">Includes</span>
            <span className="cost-value">Song + visuals + lyrics</span>
          </div>
          <div className="cost-row">
            <span className="cost-label">Lyrics</span>
            <span className="cost-value">
              {hasLyrics ? 'Synced subtitles burned in' : 'Title overlay'}
            </span>
          </div>
          <div className="cost-row">
            <span className="cost-label">Output</span>
            <span className="cost-value">Single MP4 (audio included)</span>
          </div>
          <div className="cost-row cost-row--total">
            <span className="cost-label">Estimated cost</span>
            <span className="cost-value cost-value--price">{formatCost(plan.estimatedCost)}</span>
          </div>
          <p className="cost-hint">
            Clips render in parallel (4 at a time) for faster generation, then your song audio and lyrics are combined into one MP4.
          </p>
        </div>

        <div className="confirm-actions">
          <button
            type="button"
            className="btn btn-ghost btn-full"
            onClick={onCancel}
            disabled={isGenerating}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary btn-full"
            onClick={() => onConfirm(trimmedPrompt)}
            disabled={isGenerating || !trimmedPrompt}
          >
            {isGenerating ? 'Generating…' : `Confirm · ${formatCost(plan.estimatedCost)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
