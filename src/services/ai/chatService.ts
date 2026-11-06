import { recentMessages } from '../../domain/ai/chatContext';
import {
  SENTENCE_CHECK_SCHEMA,
  assembleChatMessages,
  buildCheckMessages,
  buildTranslateMessages,
  type TurnContext,
} from '../../domain/ai/prompts';
import {
  ChatRole,
  type ChatMessage,
  type ConversationRef,
  type LearnerProfile,
  type SentenceCheck,
} from '../../domain/ai/types';
import type { CoursePacks } from '../../domain/grading/exerciseGrading';
import { Logger } from '../../utils/logger';
import type { AppSettings } from '../storage/db';
import { appendMessage } from '../storage/conversationRepository';
import { OllamaError, OllamaErrorKind, chatOnce, streamChat, type OllamaConnection } from './ollamaClient';

/** The Ollama connection from settings, or null when AI hasn't been set up. */
export function connectionFromSettings(settings: AppSettings): OllamaConnection | null {
  if (!settings.ollamaUrl?.trim()) {
    return null;
  }
  return { baseUrl: settings.ollamaUrl, model: settings.ollamaModel };
}

/** Saves a message the learner sent. */
export async function saveLearnerMessage({
  conversation,
  text,
  now,
}: {
  conversation: ConversationRef;
  text: string;
  now: Date;
}): Promise<void> {
  await appendMessage({ conversation, message: { role: ChatRole.USER, content: text, createdAt: now.getTime() }, now });
}

/**
 * Streams the AI's reply to `history` (whose last message is the learner's)
 * and saves it. If the learner stops it midway, the partial reply is kept.
 */
export async function generateReply({
  conversation,
  connection,
  systemPrompt,
  history,
  context,
  signal,
  onDelta,
}: {
  conversation: ConversationRef;
  connection: OllamaConnection;
  systemPrompt: string;
  history: ChatMessage[];
  context?: TurnContext;
  signal: AbortSignal;
  onDelta: (delta: string) => void;
}): Promise<void> {
  const messages = assembleChatMessages({ systemPrompt, history: recentMessages(history), context });
  let partial = '';
  try {
    const reply = await streamChat({
      connection,
      messages,
      signal,
      onDelta: (delta) => {
        partial += delta;
        onDelta(delta);
      },
    });
    await saveReply({ conversation, text: reply });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      Logger.info('Chat reply stopped by learner', { conversationId: conversation.id, characters: partial.length });
      await saveReply({ conversation, text: partial });
      return;
    }
    throw error;
  }
}

async function saveReply({ conversation, text }: { conversation: ConversationRef; text: string }): Promise<void> {
  const content = text.trim();
  if (!content) {
    return;
  }
  const now = new Date();
  await appendMessage({ conversation, message: { role: ChatRole.ASSISTANT, content, createdAt: now.getTime() }, now });
}

/** Translates a target-language message into the learner's language. */
export async function translateMessage({
  connection,
  packs,
  text,
}: {
  connection: OllamaConnection;
  packs: CoursePacks;
  text: string;
}): Promise<string> {
  const reply = await chatOnce({ connection, messages: buildTranslateMessages({ packs, text }) });
  return reply.trim();
}

/** Ignores spacing and final punctuation, which the check is told not to care about. */
function normalizeSentence(text: string): string {
  return text.trim().replace(/[.!?]+$/, '').replace(/\s+/g, ' ');
}

/** Asks the model whether a learner's sentence is correct, with a correction and explanation. */
export async function checkSentence({
  connection,
  packs,
  profile,
  text,
  previousReply,
}: {
  connection: OllamaConnection;
  packs: CoursePacks;
  profile: LearnerProfile;
  text: string;
  previousReply?: string;
}): Promise<SentenceCheck> {
  const reply = await chatOnce({
    connection,
    messages: buildCheckMessages({ packs, profile, text, previousReply }),
    format: SENTENCE_CHECK_SCHEMA,
  });
  try {
    const parsed = JSON.parse(reply) as Partial<SentenceCheck>;
    const corrected = parsed.corrected?.trim() || text;
    // Small models sometimes say "correct" while changing the sentence, so the
    // verdict is taken from whether a correction was actually made.
    const isCorrect = normalizeSentence(corrected) === normalizeSentence(text);
    return { isCorrect, corrected, explanation: isCorrect ? '' : (parsed.explanation ?? '') };
  } catch (error) {
    Logger.warn('Sentence check returned invalid JSON', { reply, error });
    throw new OllamaError({ kind: OllamaErrorKind.BAD_RESPONSE, message: 'The model returned an unreadable answer' });
  }
}

/** A short, learner-facing explanation of why an AI request failed. */
export function describeAiError(error: unknown): string {
  if (error instanceof OllamaError) {
    switch (error.kind) {
      case OllamaErrorKind.OFFLINE:
        return "Can't reach your Mac. Is tools/start-ai.sh running? Its address changes each time it starts, so paste the new one in Settings.";
      case OllamaErrorKind.MODEL_MISSING:
        return 'The chosen model is not installed in Ollama. Pick another one in Settings.';
      case OllamaErrorKind.FORBIDDEN:
        return 'Ollama refused the request. Restart tools/start-ai.sh on your Mac.';
      case OllamaErrorKind.BAD_RESPONSE:
        return `The AI server returned an error: ${error.message}`;
    }
  }
  return 'Something went wrong talking to the AI.';
}
