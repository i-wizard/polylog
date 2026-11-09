import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { findRelevantGrammarNotes, formatGrammarNote } from '../../domain/ai/chatContext';
import type { TurnContext } from '../../domain/ai/prompts';
import { ChatRole, type ChatMessage, type ConversationRef } from '../../domain/ai/types';
import type { Unit } from '../../domain/content/types';
import { connectionFromSettings, describeAiError, generateReply, saveLearnerMessage } from '../../services/ai/chatService';
import { clearConversation, getConversation } from '../../services/storage/conversationRepository';
import { Logger } from '../../utils/logger';
import { useApp } from '../AppContext';

const NO_MESSAGES: ChatMessage[] = [];

function buildTurnContext({
  history,
  referenceUnits,
}: {
  history: ChatMessage[];
  referenceUnits?: Unit[];
}): TurnContext {
  const question = history.findLast((message) => message.role === ChatRole.USER)?.content ?? '';
  const referenceNotes = referenceUnits
    ? findRelevantGrammarNotes({ question, units: referenceUnits }).map(formatGrammarNote)
    : undefined;
  return { referenceNotes };
}

export interface ChatState {
  /** Everything shown in the thread: leading messages, then the saved conversation. */
  messages: ChatMessage[];
  /** The reply as it streams in, or null when no reply is being generated. */
  streamingText: string | null;
  error: string | null;
  isReplying: boolean;
  send: (text: string) => void;
  /** Generates a reply again after a failure, without re-sending the learner's message. */
  retry: () => void;
  stop: () => void;
  restart: () => void;
}

/**
 * Runs one AI conversation: shows the saved messages, sends new ones, streams
 * the reply, and lets the learner stop or restart.
 *
 * `leadingMessages` are shown and sent before the saved ones but never stored,
 * e.g. a role-play's pre-written opening line. With `referenceUnits`, the
 * grammar notes of those units that best match each question are sent along.
 */
export function useChat({
  conversation,
  systemPrompt,
  leadingMessages = NO_MESSAGES,
  referenceUnits,
}: {
  conversation: ConversationRef;
  systemPrompt: string;
  leadingMessages?: ChatMessage[];
  referenceUnits?: Unit[];
}): ChatState {
  const { settings } = useApp();
  const saved = useLiveQuery(() => getConversation(conversation.id), [conversation.id]);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const messages = useMemo<ChatMessage[]>(
    () => [...leadingMessages, ...(saved?.messages ?? [])],
    [leadingMessages, saved],
  );

  // Leaving the screen stops generation so the Mac isn't left working for nobody.
  useEffect(() => () => abortRef.current?.abort(), []);

  const reply = useCallback(
    async (history: ChatMessage[]) => {
      const connection = connectionFromSettings(settings);
      if (!connection) {
        setError('Set up the AI tutor in Settings first.');
        return;
      }
      const context = buildTurnContext({ history, referenceUnits });
      const controller = new AbortController();
      abortRef.current = controller;
      setError(null);
      setStreamingText('');
      try {
        await generateReply({
          conversation,
          connection,
          systemPrompt,
          history,
          context,
          signal: controller.signal,
          onDelta: (delta) => setStreamingText((current) => (current ?? '') + delta),
        });
      } catch (caught) {
        Logger.error('Chat reply failed', { conversationId: conversation.id, error: caught });
        setError(describeAiError(caught));
      } finally {
        abortRef.current = null;
        setStreamingText(null);
      }
    },
    [settings, conversation, systemPrompt, referenceUnits],
  );

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || abortRef.current) return;
      const history = [...messages, { role: ChatRole.USER, content: trimmed }];
      void saveLearnerMessage({ conversation, text: trimmed, now: new Date() }).then(() => reply(history));
    },
    [messages, conversation, reply],
  );

  const retry = useCallback(() => {
    if (!abortRef.current) void reply(messages);
  }, [messages, reply]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const restart = useCallback(() => {
    abortRef.current?.abort();
    setError(null);
    void clearConversation(conversation.id);
  }, [conversation.id]);

  return { messages, streamingText, error, isReplying: streamingText !== null, send, retry, stop, restart };
}
