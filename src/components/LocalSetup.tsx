import { useState } from 'react';
import {
  clearLocalConfig,
  getLocalApiKey,
  getLocalBaseUrl,
  setLocalApiKey,
  setLocalBaseUrl,
} from '../lib/storage';
import { getAppBranding, getDefaultLocalBaseUrl, normalizeLocalApiBase } from '../lib/config';
import { testLocalConnection } from '../lib/providers/localGenerate';

interface LocalSetupProps {
  onReady: () => void;
}

export function LocalSetup({ onReady }: LocalSetupProps) {
  const branding = getAppBranding();
  const [baseUrl, setBaseUrl] = useState(getLocalBaseUrl() ?? getDefaultLocalBaseUrl());
  const [apiKey, setApiKey] = useState(getLocalApiKey() ?? '');
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    setStatus(null);
    const result = await testLocalConnection(baseUrl);
    setStatus(result.ok ? `✓ ${result.message}` : result.message);
    setTesting(false);
  };

  const handleSave = async () => {
    const trimmed = baseUrl.trim();
    if (!trimmed) return;
    setLocalBaseUrl(normalizeLocalApiBase(trimmed));
    setLocalApiKey(apiKey);
    onReady();
  };

  return (
    <div className="api-key-setup">
      <div className="setup-card setup-card--wide">
        <div className="setup-icon">🏠</div>
        <h1>{branding.appName}</h1>
        <p className="setup-subtitle">{branding.tagline}</p>

        <label className="field-label" htmlFor="local-base-url">
          Local API server URL
        </label>
        <input
          id="local-base-url"
          type="url"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="http://localhost:8787"
          className="text-input"
        />
        <p className="hint">
          On your PC defaults to <code className="inline-code">http://localhost:8787</code>. Remote
          previews use <code className="inline-code">/local-api</code>. Easiest: run{' '}
          <code className="inline-code">npm run local</code> to start API + UI together.
        </p>

        <label className="field-label" htmlFor="local-api-key">
          API key (optional)
        </label>
        <div className="key-input-row">
          <input
            id="local-api-key"
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Only if your server requires auth"
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

        {status && (
          <p className={`setup-status ${status.startsWith('✓') ? 'setup-status--ok' : 'setup-status--err'}`}>
            {status}
          </p>
        )}

        <div className="setup-actions">
          <button
            type="button"
            className="btn btn-ghost btn-full"
            onClick={handleTest}
            disabled={testing || !baseUrl.trim()}
          >
            {testing ? 'Testing…' : 'Test connection'}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-full"
            onClick={handleSave}
            disabled={!baseUrl.trim()}
          >
            Start creating
          </button>
        </div>

        {getLocalBaseUrl() && (
          <button
            type="button"
            className="btn btn-ghost btn-full"
            onClick={() => {
              clearLocalConfig();
              setBaseUrl(getDefaultLocalBaseUrl());
              setApiKey('');
            }}
          >
            Clear saved settings
          </button>
        )}

        <div className="setup-docs">
          <h3>Self-hosted backend</h3>
          <p>
            Your server should expose <code className="inline-code">GET /health</code> and{' '}
            <code className="inline-code">POST /api/generate</code> returning JSON with{' '}
            <code className="inline-code">audio</code> (base64 MP3). Plug in YuE, HeartMuLa, or your own model.
          </p>
          <p>
            See <code className="inline-code">local-server/README.md</code> in the repo for the API contract and mock server.
          </p>
        </div>
      </div>
    </div>
  );
}
