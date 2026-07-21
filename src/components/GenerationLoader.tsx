import type { GenerationProgress } from '../types';
import { formatTimeRemaining } from '../lib/pricing';

interface GenerationLoaderProps {
  progress: GenerationProgress;
  onCancel?: () => void;
}

const PHASES = [
  { key: 'preparing', label: 'Prepare' },
  { key: 'connecting', label: 'Connect' },
  { key: 'generating', label: 'Generate' },
  { key: 'finalizing', label: 'Finalize' },
] as const;

function phaseIndex(phase: GenerationProgress['phase']): number {
  const map: Record<string, number> = {
    preparing: 0,
    connecting: 1,
    generating: 2,
    finalizing: 3,
    complete: 4,
  };
  return map[phase] ?? 0;
}

export function GenerationLoader({ progress, onCancel }: GenerationLoaderProps) {
  const currentIdx = phaseIndex(progress.phase);
  const elapsedSec = Math.floor(progress.elapsedMs / 1000);

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

        <h2 className="loader-title">Creating your song</h2>
        <p className="loader-message">{progress.message}</p>

        <div className="loader-progress-bar">
          <div
            className="loader-progress-fill"
            style={{ width: `${progress.progress}%` }}
          />
        </div>

        <div className="loader-meta">
          <span>{elapsedSec}s elapsed</span>
          {progress.phase === 'generating' && progress.estimatedRemainingMs > 0 && (
            <span>{formatTimeRemaining(progress.estimatedRemainingMs)}</span>
          )}
        </div>

        <div className="loader-steps">
          {PHASES.map((step, i) => {
            const status =
              i < currentIdx ? 'done' : i === currentIdx ? 'active' : 'pending';
            return (
              <div key={step.key} className={`loader-step loader-step--${status}`}>
                <div className="loader-step-dot">
                  {status === 'done' ? '✓' : i + 1}
                </div>
                <span className="loader-step-label">{step.label}</span>
              </div>
            );
          })}
        </div>

        {progress.chunksReceived > 0 && (
          <p className="loader-chunks">
            Received {progress.chunksReceived} audio chunks
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
