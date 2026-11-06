import type { Scenario } from '../../src/domain/content/types';
import type { CoursePacks } from '../../src/domain/grading/exerciseGrading';
import { germanLanguagePack } from '../../src/languages/de';
import { englishLanguagePack } from '../../src/languages/en';

export const GERMAN_ENGLISH_PACKS: CoursePacks = { target: germanLanguagePack, base: englishLanguagePack };

/** A café role-play unlocked by the fixture unit. */
export function buildScenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    id: 'rp-cafe',
    unitId: 'unit-1',
    icon: '☕',
    title: 'At the café',
    aiRole: 'A friendly waiter.',
    setting: 'A small café in Vienna.',
    goals: ['Order a drink', 'Ask for the bill'],
    opening: { text: 'Guten Tag! Was möchten Sie trinken?', translation: 'Hello! What would you like to drink?' },
    usefulPhrases: [{ text: 'Die Rechnung, bitte.', translation: 'The bill, please.' }],
    ...overrides,
  };
}

/** A fetch Response whose body streams the given text pieces, as Ollama does. */
export function buildStreamResponse(pieces: string[]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const piece of pieces) controller.enqueue(encoder.encode(piece));
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { 'Content-Type': 'application/x-ndjson' } });
}

/** A JSON fetch Response with the given status. */
export function buildJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
