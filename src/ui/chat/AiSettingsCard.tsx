import { ClipboardPaste } from 'lucide-react';
import { useState } from 'react';
import { AiStatus } from '../../domain/ai/types';
import { updateSettings } from '../../services/storage/settingsRepository';
import { Logger } from '../../utils/logger';
import { useApp } from '../AppContext';
import { useAiStatus } from '../hooks/useAiStatus';

const SETUP_GUIDE_URL = 'https://github.com/i-wizard/polylog/blob/master/docs/ai-setup.md';

/** Browsers block http:// requests from an https:// page, so the phone needs the tunnel's https address. */
function isBlockedInsecureUrl(url: string): boolean {
  return window.location.protocol === 'https:' && url.trim().startsWith('http://');
}

function statusText({ status, model }: { status: AiStatus; model: string }): string {
  switch (status) {
    case AiStatus.NOT_CONFIGURED:
      return 'Not set up yet.';
    case AiStatus.CHECKING:
      return 'Checking…';
    case AiStatus.ONLINE:
      return `✅ Connected — using ${model}.`;
    case AiStatus.MODEL_MISSING:
      return `⚠️ Connected, but ${model} isn't installed. Pick another model.`;
    case AiStatus.OFFLINE:
      return "❌ Can't reach that address. Is tools/start-ai.sh running on your Mac? Its address changes each time it starts.";
  }
}

/** Settings card for the learner's own Ollama server: address, model, and a connection test. */
export function AiSettingsCard() {
  const { settings } = useApp();
  const { status, models, recheck } = useAiStatus();
  const [url, setUrl] = useState(settings.ollamaUrl ?? '');
  const modelOptions = models.includes(settings.ollamaModel) ? models : [settings.ollamaModel, ...models];

  const [pasteHint, setPasteHint] = useState<string | null>(null);

  const saveUrl = async (value: string = url) => {
    await updateSettings({ ollamaUrl: value.trim() || undefined });
  };

  // The tunnel address changes every time the Mac script starts, so pasting it is one tap.
  const handlePaste = async () => {
    setPasteHint(null);
    try {
      const pasted = (await navigator.clipboard.readText()).trim();
      if (!pasted) {
        setPasteHint('The clipboard is empty. Copy the address on your Mac first.');
        return;
      }
      setUrl(pasted);
      await saveUrl(pasted);
      recheck();
    } catch (error) {
      Logger.warn('Clipboard read failed', error);
      setPasteHint("Couldn't read the clipboard. Long-press the address field and choose Paste.");
    }
  };

  const handleTest = async () => {
    await saveUrl();
    recheck();
  };

  return (
    <section className="card">
      <h2 className="card__title">AI tutor</h2>
      <p className="muted small">
        Chat and role-plays use Ollama on your Mac. Run <code>tools/start-ai.sh</code> there, then paste the address it
        shows. Everything else works without it.{' '}
        <a href={SETUP_GUIDE_URL} target="_blank" rel="noreferrer">
          Setup guide
        </a>
      </p>
      <label className="field">
        <span>Server address</span>
        <span className="field-row">
          <input
            className="text-field"
            type="url"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="https://….trycloudflare.com"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onBlur={() => void saveUrl()}
          />
          <button type="button" className="button button--primary" onClick={() => void handlePaste()}>
            <ClipboardPaste size={18} aria-hidden /> Paste
          </button>
        </span>
      </label>
      {pasteHint && <p className="small">{pasteHint}</p>}
      {isBlockedInsecureUrl(url) && (
        <p className="small" role="alert">
          The app is loaded over https, so it can only reach an <strong>https://</strong> address: use the one
          tools/start-ai.sh prints.
        </p>
      )}
      <label className="field">
        <span>Model</span>
        <select
          className="select"
          value={settings.ollamaModel}
          onChange={(event) => void updateSettings({ ollamaModel: event.target.value })}
        >
          {modelOptions.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="button button--secondary" disabled={!url.trim()} onClick={() => void handleTest()}>
        Test connection
      </button>
      <p className="small" aria-live="polite">
        {statusText({ status, model: settings.ollamaModel })}
      </p>
    </section>
  );
}
