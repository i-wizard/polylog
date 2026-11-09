import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { preloadVoices } from './services/speech/speechService';
import { App } from './ui/App';
import './ui/styles/global.css';
import { Logger } from './utils/logger';

/**
 * Asks the browser not to evict our IndexedDB data under storage pressure.
 * Safari may still decline for non-installed sites; home-screen install helps.
 */
async function requestPersistentStorage(): Promise<void> {
  if (!navigator.storage?.persist) {
    return;
  }
  const persisted = await navigator.storage.persist();
  Logger.info('Persistent storage', { persisted });
}

void preloadVoices();
void requestPersistentStorage();

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
