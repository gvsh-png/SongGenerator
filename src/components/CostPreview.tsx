import type { ModelId } from '../types';
import { MODEL_PRICING, formatCost, formatDuration, selectCheapestModel } from '../lib/pricing';

interface CostPreviewProps {
  model: ModelId;
  duration: number;
  autoModel: boolean;
}

export function CostPreview({ model, duration, autoModel }: CostPreviewProps) {
  const effectiveModel = autoModel ? selectCheapestModel(duration) : model;
  const pricing = MODEL_PRICING[effectiveModel];
  const cost = pricing.perSong;

  return (
    <div className="cost-preview">
      <div className="cost-row">
        <span className="cost-label">Model</span>
        <span className="cost-value">{pricing.label}</span>
      </div>
      <div className="cost-row">
        <span className="cost-label">Duration</span>
        <span className="cost-value">{formatDuration(duration)}</span>
      </div>
      <div className="cost-row cost-row--total">
        <span className="cost-label">Estimated cost</span>
        <span className="cost-value cost-value--price">{formatCost(cost)}</span>
      </div>
      {autoModel && duration <= 30 && (
        <p className="cost-hint">
          Using Clip model — cheapest option for songs up to 30s
        </p>
      )}
      {autoModel && duration > 30 && (
        <p className="cost-hint">
          Using Pro model for songs longer than 30s
        </p>
      )}
    </div>
  );
}
