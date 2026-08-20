import type { GenerationProgress } from '../types';
import { formatTimeRemaining } from '../lib/pricing';

interface GenerationLoaderProps {
  progress: GenerationProgress;
  onCancel?: () => void;
  title?: string;
}

const PHASES = [
  { key: 'preparing', label: 'Prepare' },
  { key: 'connecting', label: 'Connect' },
  { key: 'submitting', label: 'Submit' },
  { key: 'generating', label: 'Generate' },
  { key: 'polling', label: 'Queue' },
  { key: 'downloading', label: 'Download' },
  { key: 'finalizing', label: 'Finalize' },
] as const;

export function GenerationLoader({ progress, onCancel, title = 'Creating your song' }: GenerationLoaderProps) {
  const elapsedSec = Math.floor(progress.elapsedMs / 1000);
  const showRemaining = ['generating', 'polling', 'downloading'].includes(progress.phase);
  const isVideo = title.toLowerCase().includes('music video');
  const chunkUnit = isVideo ? 'clip' : 'audio chunk';

  return (
    <div className="loader-overlay" role="status" aria-live="polite">
      <div className="loader-card">
        <div className="loader-visual">
          <div className="loader-ring">
            <svg viewBox="0 0 100 100" className="loader-svg">
              <circle className="loader-track" cx="50" cy="50" r="42" />
              <circle
                className="loader-fill"
                cx="50"
                cy="50"
                r="42"
                style={{
                  strokeDasharray: `${progress.progress * 2.64} 264`,
                }}
              />
            </svg>
            <span className="loader-percent">{Math.round(progress.progress)}%</span>
          </div>
        </div>

        <h2 className="loader-title">{title}</h2>
        <p className="loader-message">{progress.message}</p>

        <div className="loader-progress-bar">
          <div
            className="loader-progress-fill"
            style={{ width: `${progress.progress}%` }}
          />
        </div>

        <div className="loader-meta">
          <span>{elapsedSec}s elapsed</span>
          {showRemaining && progress.estimatedRemainingMs > 0 && (
            <span>{formatTimeRemaining(progress.estimatedRemainingMs)}</span>
          )}
        </div>

        <div className="loader-steps loader-steps--compact">
          {PHASES.filter((step) => {
            const videoPhases = ['submitting', 'polling', 'downloading'];
            const audioPhases = ['preparing', 'connecting', 'generating', 'finalizing'];
            const activeSet = videoPhases.includes(progress.phase)
              ? ['submitting', 'polling', 'generating', 'downloading']
              : audioPhases;
            return activeSet.includes(step.key);
          }).map((step, _i, arr) => {
            const currentIdx = arr.findIndex((s) => s.key === progress.phase);
            const stepIdx = arr.findIndex((s) => s.key === step.key);
            const status =
              stepIdx < currentIdx ? 'done' : stepIdx === currentIdx ? 'active' : 'pending';
            return (
              <div key={step.key} className={`loader-step loader-step--${status}`}>
                <div className="loader-step-dot">
                  {status === 'done' ? '✓' : stepIdx + 1}
                </div>
                <span className="loader-step-label">{step.label}</span>
              </div>
            );
          })}
        </div>

        {progress.chunksReceived > 0 && (
          <p className="loader-chunks">
            {progress.chunksReceived} {chunkUnit}{progress.chunksReceived !== 1 ? 's' : ''} completed
          </p>
        )}

        {progress.transcript && (
          <div className="loader-transcript">
            <span className="loader-transcript-label">Live output</span>
            <p>{progress.transcript}</p>
          </div>
        )}

        <div className="loader-pulse">
          <span /><span /><span />
        </div>

        {onCancel && (
          <button className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
