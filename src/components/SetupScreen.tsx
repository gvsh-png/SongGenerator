import { isLocalMode } from '../lib/config';
import { isAppConfigured } from '../lib/storage';
import { ApiKeySetup } from './ApiKeySetup';
import { LocalSetup } from './LocalSetup';

interface SetupScreenProps {
  onReady: () => void;
}

export function SetupScreen({ onReady }: SetupScreenProps) {
  if (isLocalMode()) {
    return <LocalSetup onReady={onReady} />;
  }
  return <ApiKeySetup onReady={onReady} />;
}

export function checkAppConfigured(): boolean {
  return isAppConfigured();
}
