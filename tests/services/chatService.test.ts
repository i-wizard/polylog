import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { tutorConversation } from '../../src/domain/ai/chatContext';
import { ChatRole } from '../../src/domain/ai/types';
import { checkSentence, generateReply, saveLearnerMessage } from '../../src/services/ai/chatService';
import { getConversation } from '../../src/services/storage/conversationRepository';
import { db } from '../../src/services/storage/db';
import { GERMAN_ENGLISH_PACKS, buildJsonResponse, buildStreamResponse } from '../fixtures';

const COURSE_ID = 'de-en';
const CONVERSATION = tutorConversation(COURSE_ID);
const CONNECTION = { baseUrl: 'http://localhost:11434', model: 'gemma3:4b' };
const SYSTEM_PROMPT = 'You are a tutor.';
const QUESTION = 'Was heißt "coffee"?';
const NOW = new Date('2026-11-05T09:00:00');
const PROFILE = { level: 'A1', knownWords: [] };

let fetchMock: Mock;

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('saveLearnerMessage', () => {
  it('creates the conversation on its first message', async () => {
    expect(await getConversation(CONVERSATION.id)).toBeUndefined();

    await saveLearnerMessage({ conversation: CONVERSATION, text: QUESTION, now: NOW });

    const saved = await getConversation(CONVERSATION.id);
    expect(saved).toEqual({
      ...CONVERSATION,
      messages: [{ role: ChatRole.USER, content: QUESTION, createdAt: NOW.getTime() }],
      updatedAt: NOW.getTime(),
    });
  });
});

describe('generateReply', () => {
  it('sends the system prompt and history, then saves the streamed reply', async () => {
    fetchMock.mockResolvedValue(buildStreamResponse(['{"message":{"content":"Kaffee"}}\n', '{"done":true}\n']));
    const history = [{ role: ChatRole.USER, content: QUESTION }];
    const deltas: string[] = [];

    await generateReply({
      conversation: CONVERSATION,
      connection: CONNECTION,
      systemPrompt: SYSTEM_PROMPT,
      history,
      signal: new AbortController().signal,
      onDelta: (delta) => deltas.push(delta),
    });

    expect(deltas).toEqual(['Kaffee']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as { messages: unknown[] };
    expect(body.messages).toEqual([{ role: ChatRole.SYSTEM, content: SYSTEM_PROMPT }, ...history]);
    const saved = await getConversation(CONVERSATION.id);
    expect(saved?.messages).toHaveLength(1);
    expect(saved?.messages[0]).toMatchObject({ role: ChatRole.ASSISTANT, content: 'Kaffee' });
    expect(saved?.updatedAt).toBeGreaterThan(0);
  });

  it('saves nothing when the server is unreachable', async () => {
    fetchMock.mockRejectedValue(new TypeError('Load failed'));

    await expect(
      generateReply({
        conversation: CONVERSATION,
        connection: CONNECTION,
        systemPrompt: SYSTEM_PROMPT,
        history: [{ role: ChatRole.USER, content: QUESTION }],
        signal: new AbortController().signal,
        onDelta: () => undefined,
      }),
    ).rejects.toThrow();
    expect(await getConversation(CONVERSATION.id)).toBeUndefined();
  });
});

describe('checkSentence', () => {
  it('parses the JSON verdict from the model', async () => {
    const verdict = { isCorrect: false, corrected: 'Ich möchte einen Kaffee.', explanation: 'Kaffee is masculine: einen.' };
    fetchMock.mockResolvedValue(buildJsonResponse({ message: { content: JSON.stringify(verdict) }, done: true }));

    const result = await checkSentence({ connection: CONNECTION, packs: GERMAN_ENGLISH_PACKS, profile: PROFILE, text: 'Ich möchte ein Kaffee' });

    expect(result).toEqual(verdict);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as { format: unknown; stream: boolean };
    expect(body.stream).toBe(false);
    expect(body.format).toMatchObject({ required: ['isCorrect', 'corrected', 'explanation'] });
  });

  it('treats a "correct" verdict that still changes the sentence as a correction', async () => {
    const verdict = { isCorrect: true, corrected: 'Ich möchte einen Kaffee.', explanation: 'Use einen.' };
    fetchMock.mockResolvedValue(buildJsonResponse({ message: { content: JSON.stringify(verdict) }, done: true }));

    const result = await checkSentence({ connection: CONNECTION, packs: GERMAN_ENGLISH_PACKS, profile: PROFILE, text: 'Ich möchte ein Kaffee' });

    expect(result).toEqual({ isCorrect: false, corrected: 'Ich möchte einen Kaffee.', explanation: 'Use einen.' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('ignores a missing full stop when judging', async () => {
    const verdict = { isCorrect: false, corrected: 'Ich habe Hunger.', explanation: 'Add a full stop.' };
    fetchMock.mockResolvedValue(buildJsonResponse({ message: { content: JSON.stringify(verdict) }, done: true }));

    const result = await checkSentence({ connection: CONNECTION, packs: GERMAN_ENGLISH_PACKS, profile: PROFILE, text: 'Ich habe Hunger' });

    expect(result).toEqual({ isCorrect: true, corrected: 'Ich habe Hunger.', explanation: '' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reports an unreadable model answer', async () => {
    fetchMock.mockResolvedValue(buildJsonResponse({ message: { content: 'not json' }, done: true }));

    await expect(
      checkSentence({ connection: CONNECTION, packs: GERMAN_ENGLISH_PACKS, profile: PROFILE, text: 'Hallo' }),
    ).rejects.toThrow('unreadable');
  });
});
