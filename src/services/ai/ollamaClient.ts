import type { ChatMessage } from '../../domain/ai/types';
import { Logger } from '../../utils/logger';

/** Keeps the model in memory between turns; reloading it on an Intel CPU takes several seconds. */
const KEEP_ALIVE = '30m';
const MODEL_LIST_TIMEOUT_MS = 6000;

export enum OllamaErrorKind {
  /** The server could not be reached (Mac asleep, tunnel stopped or restarted with a new address, or CORS not allowed). */
  OFFLINE = 'OFFLINE',
  /** The server answered but the chosen model isn't installed. */
  MODEL_MISSING = 'MODEL_MISSING',
  /** The server refused the request, usually Ollama's host check behind a proxy. */
  FORBIDDEN = 'FORBIDDEN',
  /** Any other unexpected reply. */
  BAD_RESPONSE = 'BAD_RESPONSE',
}

export class OllamaError extends Error {
  readonly kind: OllamaErrorKind;

  constructor({ kind, message }: { kind: OllamaErrorKind; message: string }) {
    super(message);
    this.name = 'OllamaError';
    this.kind = kind;
  }
}

/** Where to reach Ollama and which model to use. */
export interface OllamaConnection {
  baseUrl: string;
  model: string;
}

interface OllamaChatChunk {
  message?: { content?: string };
  done?: boolean;
  error?: string;
}

/** Removes trailing slashes so paths can be appended safely. */
export function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/**
 * Splits streamed NDJSON text into complete lines.
 *
 * Network chunks can end mid-line, so the unfinished tail is returned as
 * `rest` and must be prepended to the next chunk.
 */
export function splitNdjson(buffer: string): { lines: string[]; rest: string } {
  const parts = buffer.split('\n');
  const rest = parts.pop() ?? '';
  return { lines: parts.filter((line) => line.trim().length > 0), rest };
}

async function request({ url, init }: { url: string; init: RequestInit }): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    Logger.warn('Ollama unreachable', { url, error });
    throw new OllamaError({ kind: OllamaErrorKind.OFFLINE, message: `Could not reach ${url}` });
  }
  if (response.ok) {
    return response;
  }
  const detail = await response.text().catch(() => '');
  Logger.warn('Ollama request failed', { url, status: response.status, detail });
  if (response.status === 404) {
    throw new OllamaError({ kind: OllamaErrorKind.MODEL_MISSING, message: detail || 'Model not found' });
  }
  if (response.status === 403) {
    throw new OllamaError({ kind: OllamaErrorKind.FORBIDDEN, message: detail || 'Forbidden' });
  }
  throw new OllamaError({ kind: OllamaErrorKind.BAD_RESPONSE, message: detail || `HTTP ${response.status}` });
}

/** Names of the models installed in Ollama, e.g. "gemma3:4b". Doubles as a connection check. */
export async function listModels(baseUrl: string): Promise<string[]> {
  // A timeout rejects with a TimeoutError, which `request` reports as offline.
  const response = await request({
    url: `${normalizeBaseUrl(baseUrl)}/api/tags`,
    init: { signal: AbortSignal.timeout(MODEL_LIST_TIMEOUT_MS) },
  });
  const body = (await response.json()) as { models?: { name: string }[] };
  return (body.models ?? []).map((model) => model.name);
}

/** True when `model` is installed; Ollama reports untagged models as "<name>:latest". */
export function isModelInstalled({ model, installed }: { model: string; installed: string[] }): boolean {
  return installed.includes(model) || installed.includes(`${model}:latest`);
}

/**
 * Streams a chat reply, calling `onDelta` with each new piece of text.
 * Resolves with the full reply. Abort via `signal` to stop generation.
 */
export async function streamChat({
  connection,
  messages,
  signal,
  onDelta,
}: {
  connection: OllamaConnection;
  messages: ChatMessage[];
  signal?: AbortSignal;
  onDelta: (delta: string) => void;
}): Promise<string> {
  const response = await request({
    url: `${normalizeBaseUrl(connection.baseUrl)}/api/chat`,
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: connection.model, messages, stream: true, keep_alive: KEEP_ALIVE }),
      signal,
    },
  });
  if (!response.body) {
    throw new OllamaError({ kind: OllamaErrorKind.BAD_RESPONSE, message: 'Empty response' });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let reply = '';

  const handleLine = (line: string) => {
    const chunk = JSON.parse(line) as OllamaChatChunk;
    if (chunk.error) {
      throw new OllamaError({ kind: OllamaErrorKind.BAD_RESPONSE, message: chunk.error });
    }
    const delta = chunk.message?.content ?? '';
    if (delta) {
      reply += delta;
      onDelta(delta);
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const { lines, rest } = splitNdjson(buffer);
    buffer = rest;
    lines.forEach(handleLine);
  }
  if (buffer.trim()) {
    handleLine(buffer);
  }
  return reply;
}

/**
 * Sends a chat request and waits for the whole reply. With `format`, the
 * model is constrained to JSON matching that schema.
 */
export async function chatOnce({
  connection,
  messages,
  format,
  signal,
}: {
  connection: OllamaConnection;
  messages: ChatMessage[];
  format?: object;
  signal?: AbortSignal;
}): Promise<string> {
  const response = await request({
    url: `${normalizeBaseUrl(connection.baseUrl)}/api/chat`,
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: connection.model, messages, stream: false, keep_alive: KEEP_ALIVE, format }),
      signal,
    },
  });
  const body = (await response.json()) as OllamaChatChunk;
  return body.message?.content ?? '';
}
