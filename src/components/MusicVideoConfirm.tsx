import { formatCost } from '../lib/pricing';
import {
  MUSIC_VIDEO_DURATION,
  VIDEO_PRICING,
  estimateMusicVideoCost,
} from '../lib/musicVideo';
import { formatDuration } from '../lib/pricing';

interface MusicVideoConfirmProps {
  songTitle: string;
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isGenerating: boolean;
}

export function MusicVideoConfirm({
  songTitle,
  open,
  onConfirm,
  onCancel,
  isGenerating,
}: MusicVideoConfirmProps) {
  if (!open) return null;

  const cost = estimateMusicVideoCost();

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
          Visual clip for &ldquo;{songTitle}&rdquo;
        </p>

        <div className="cost-preview">
          <div className="cost-row">
            <span className="cost-label">Model</span>
            <span className="cost-value">{VIDEO_PRICING.label}</span>
          </div>
          <div className="cost-row">
            <span className="cost-label">Clip length</span>
            <span className="cost-value">{formatDuration(MUSIC_VIDEO_DURATION)}</span>
          </div>
          <div className="cost-row">
            <span className="cost-label">Resolution</span>
            <span className="cost-value">{VIDEO_PRICING.resolution}</span>
          </div>
          <div className="cost-row">
            <span className="cost-label">Audio</span>
            <span className="cost-value">Visuals only (use your MP3)</span>
          </div>
          <div className="cost-row cost-row--total">
            <span className="cost-label">Estimated cost</span>
            <span className="cost-value cost-value--price">{formatCost(cost)}</span>
          </div>
          <p className="cost-hint">
            Generates an 8s cinematic visual. Play it alongside your downloaded song.
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
            {isGenerating ? 'Generating…' : `Confirm · ${formatCost(cost)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
