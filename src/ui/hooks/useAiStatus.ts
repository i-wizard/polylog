import { useCallback, useEffect, useState } from 'react';
import { AiStatus } from '../../domain/ai/types';
import { isModelInstalled, listModels } from '../../services/ai/ollamaClient';
import { useApp } from '../AppContext';

interface AiStatusSnapshot {
  status: AiStatus;
  /** Models installed in Ollama, once a check has succeeded. */
  models: string[];
  recheck: () => void;
}

/**
 * Checks whether the learner's Ollama server is reachable and has the chosen
 * model. Runs when a chat surface opens and whenever the URL or model changes.
 */
export function useAiStatus(): AiStatusSnapshot {
  const { settings } = useApp();
  const { ollamaUrl, ollamaModel } = settings;
  const [status, setStatus] = useState<AiStatus>(ollamaUrl ? AiStatus.CHECKING : AiStatus.NOT_CONFIGURED);
  const [models, setModels] = useState<string[]>([]);
  const [checkCount, setCheckCount] = useState(0);

  useEffect(() => {
    if (!ollamaUrl) {
      setStatus(AiStatus.NOT_CONFIGURED);
      return;
    }
    let cancelled = false;
    setStatus(AiStatus.CHECKING);
    listModels(ollamaUrl)
      .then((installed) => {
        if (cancelled) return;
        setModels(installed);
        setStatus(isModelInstalled({ model: ollamaModel, installed }) ? AiStatus.ONLINE : AiStatus.MODEL_MISSING);
      })
      .catch(() => {
        if (!cancelled) setStatus(AiStatus.OFFLINE);
      });
    return () => {
      cancelled = true;
    };
  }, [ollamaUrl, ollamaModel, checkCount]);

  const recheck = useCallback(() => setCheckCount((count) => count + 1), []);
  return { status, models, recheck };
}
