import { formatCost, formatDuration } from '../lib/pricing';
import {
  VIDEO_PRICING,
  planMusicVideoClips,
} from '../lib/musicVideo';

interface MusicVideoConfirmProps {
  songTitle: string;
  songDuration: number;
  hasLyrics: boolean;
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isGenerating: boolean;
}

export function MusicVideoConfirm({
  songTitle,
  songDuration,
  hasLyrics,
  open,
  onConfirm,
  onCancel,
  isGenerating,
}: MusicVideoConfirmProps) {
  if (!open) return null;

  const plan = planMusicVideoClips(songDuration);

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
            onClick={onConfirm}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating…' : `Confirm · ${formatCost(plan.estimatedCost)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
