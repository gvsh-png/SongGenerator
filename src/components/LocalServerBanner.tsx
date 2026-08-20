import { useEffect, useState } from 'react';
import { fetchLocalHealth } from '../lib/providers/localGenerate';

export function LocalServerBanner() {
  const [status, setStatus] = useState<'checking' | 'ok' | 'down'>('checking');
  const [detail, setDetail] = useState('');

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const data = await fetchLocalHealth();
        if (cancelled) return;
        if (data.status === 'ok') {
          setStatus('ok');
          setDetail(`${data.message ?? 'Connected'} · ${data.device ?? '?'}`);
        } else {
          setStatus('down');
          setDetail(data.message ?? 'Model loading…');
        }
      } catch {
        if (!cancelled) {
          setStatus('down');
          setDetail('API not reachable — keep npm run local running');
        }
      }
    };

    check();
    const id = window.setInterval(check, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (status === 'ok') return null;

  return (
    <div className="local-server-banner" role="status">
      {status === 'checking' ? 'Checking local API…' : `Local API offline: ${detail}`}
      {status === 'down' && (
        <span className="local-server-banner__hint">
          {' '}
          Run <code className="inline-code">npm run local</code> and open{' '}
          <code className="inline-code">http://127.0.0.1:5173</code>
        </span>
      )}
    </div>
  );
}
