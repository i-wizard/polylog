import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { ChatRole } from '../../src/domain/ai/types';
import {
  OllamaError,
  OllamaErrorKind,
  chatOnce,
  isModelInstalled,
  listModels,
  splitNdjson,
  streamChat,
} from '../../src/services/ai/ollamaClient';
import { buildJsonResponse, buildStreamResponse } from '../fixtures';

const BASE_URL = 'https://mac.tailnet.ts.net/';
const CHAT_URL = 'https://mac.tailnet.ts.net/api/chat';
const TAGS_URL = 'https://mac.tailnet.ts.net/api/tags';
const MODEL = 'gemma3:4b';
const CONNECTION = { baseUrl: BASE_URL, model: MODEL };
const MESSAGES = [{ role: ChatRole.USER, content: 'Hallo!' }];

let fetchMock: Mock;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function requestBody(callIndex = 0): Record<string, unknown> {
  const [, init] = fetchMock.mock.calls[callIndex] as [string, RequestInit];
  return JSON.parse(init.body as string) as Record<string, unknown>;
}

describe('splitNdjson', () => {
  it('returns complete lines and keeps the unfinished tail', () => {
    expect(splitNdjson('{"a":1}\n{"b":2}\n{"c"')).toEqual({ lines: ['{"a":1}', '{"b":2}'], rest: '{"c"' });
  });
});

describe('listModels', () => {
  it('returns installed model names from /api/tags', async () => {
    fetchMock.mockResolvedValue(buildJsonResponse({ models: [{ name: MODEL }, { name: 'llama3:latest' }] }));

    const models = await listModels(BASE_URL);

    expect(models).toEqual([MODEL, 'llama3:latest']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe(TAGS_URL);
  });

  it('reports a network failure as offline', async () => {
    fetchMock.mockRejectedValue(new TypeError('Load failed'));

    await expect(listModels(BASE_URL)).rejects.toMatchObject({ kind: OllamaErrorKind.OFFLINE });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('isModelInstalled', () => {
  it('treats an untagged model as ":latest"', () => {
    expect(isModelInstalled({ model: 'llama3', installed: ['llama3:latest'] })).toBe(true);
    expect(isModelInstalled({ model: MODEL, installed: ['llama3:latest'] })).toBe(false);
  });
});

describe('streamChat', () => {
  it('streams deltas from NDJSON split across network chunks', async () => {
    fetchMock.mockResolvedValue(
      buildStreamResponse([
        '{"message":{"content":"Gu"},"done":false}\n{"message":{"con',
        'tent":"ten Tag!"},"done":false}\n',
        '{"message":{"content":""},"done":true}',
      ]),
    );
    const deltas: string[] = [];

    const reply = await streamChat({ connection: CONNECTION, messages: MESSAGES, onDelta: (delta) => deltas.push(delta) });

    expect(reply).toBe('Guten Tag!');
    expect(deltas).toEqual(['Gu', 'ten Tag!']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(CHAT_URL);
    expect(init.method).toBe('POST');
    expect(requestBody()).toEqual({ model: MODEL, messages: MESSAGES, stream: true, keep_alive: '30m' });
  });

  it('reports a missing model', async () => {
    fetchMock.mockResolvedValue(buildJsonResponse({ error: "model 'gemma3:4b' not found" }, 404));

    const error = await streamChat({ connection: CONNECTION, messages: MESSAGES, onDelta: () => undefined }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(OllamaError);
    expect((error as OllamaError).kind).toBe(OllamaErrorKind.MODEL_MISSING);
  });

  it("reports Ollama's host check as forbidden", async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 403 }));

    await expect(streamChat({ connection: CONNECTION, messages: MESSAGES, onDelta: () => undefined })).rejects.toMatchObject({
      kind: OllamaErrorKind.FORBIDDEN,
    });
  });
});

describe('chatOnce', () => {
  it('sends a non-streaming request with the JSON schema format', async () => {
    const schema = { type: 'object' };
    fetchMock.mockResolvedValue(buildJsonResponse({ message: { content: '{"isCorrect":true}' }, done: true }));

    const reply = await chatOnce({ connection: CONNECTION, messages: MESSAGES, format: schema });

    expect(reply).toBe('{"isCorrect":true}');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(requestBody()).toEqual({ model: MODEL, messages: MESSAGES, stream: false, keep_alive: '30m', format: schema });
  });
});
