import { useMemo } from 'react';
import type { SentenceCheck } from '../../domain/ai/types';
import { checkSentence, connectionFromSettings, translateMessage } from '../../services/ai/chatService';
import { OllamaError, OllamaErrorKind, type OllamaConnection } from '../../services/ai/ollamaClient';
import { useApp } from '../AppContext';
import { useLearnerProfile } from './useLearnerProfile';

export interface SentenceActions {
  translate: (text: string) => Promise<string>;
  /** `replyTo` is the AI line the learner was answering, which helps judge the sentence. */
  check: (input: { text: string; replyTo?: string }) => Promise<SentenceCheck>;
}

/** Translate and check helpers bound to the learner's AI server, language packs and level. */
export function useSentenceActions(): SentenceActions {
  const { settings, packs } = useApp();
  const profile = useLearnerProfile();

  return useMemo<SentenceActions>(() => {
    const requireConnection = (): OllamaConnection => {
      const connection = connectionFromSettings(settings);
      if (!connection) {
        throw new OllamaError({ kind: OllamaErrorKind.OFFLINE, message: 'AI is not set up' });
      }
      return connection;
    };
    return {
      translate: (text) => translateMessage({ connection: requireConnection(), packs, text }),
      check: ({ text, replyTo }) =>
        checkSentence({ connection: requireConnection(), packs, profile, text, previousReply: replyTo }),
    };
  }, [settings, packs, profile]);
}
