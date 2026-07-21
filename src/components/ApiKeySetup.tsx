import { useState } from 'react';
import { getApiKey, setApiKey, clearApiKey } from '../lib/storage';

interface ApiKeySetupProps {
  onReady: () => void;
}

export function ApiKeySetup({ onReady }: ApiKeySetupProps) {
  const [key, setKey] = useState(getApiKey() ?? '');
  const [showKey, setShowKey] = useState(false);

  const handleSave = () => {
    const trimmed = key.trim();
    if (!trimmed) return;
    setApiKey(trimmed);
    onReady();
  };

  return (
    <div className="api-key-setup">
      <div className="setup-card">
        <div className="setup-icon">♪</div>
        <h1>Lyria Song Studio</h1>
        <p className="setup-subtitle">
          Create AI songs with Google Lyria 3 via OpenRouter
        </p>

        <label className="field-label" htmlFor="api-key">
          OpenRouter API Key
        </label>
        <div className="key-input-row">
          <input
            id="api-key"
            type={showKey ? 'text' : 'password'}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk-or-v1-..."
            autoComplete="off"
            className="text-input"
          />
          <button
            type="button"
            className="icon-btn"
            onClick={() => setShowKey(!showKey)}
            aria-label={showKey ? 'Hide key' : 'Show key'}
          >
            {showKey ? '🙈' : '👁'}
          </button>
        </div>
        <p className="hint">
          Stored locally in your browser. Get a key at{' '}
          <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer">
            openrouter.ai/keys
          </a>
        </p>

        <button
          className="btn btn-primary btn-full"
          onClick={handleSave}
          disabled={!key.trim()}
        >
          Start Creating
        </button>

        {getApiKey() && (
          <button
            className="btn btn-ghost btn-full"
            onClick={() => {
              clearApiKey();
              setKey('');
            }}
          >
            Clear saved key
          </button>
        )}
      </div>
    </div>
  );
}
