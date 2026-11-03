import type { LanguagePack } from '../../languages/types';
import { commonPrefixLength, levenshteinDistance } from '../../utils/levenshtein';

export enum AnswerResult {
  CORRECT = 'CORRECT',
  /** Accepted, but with something worth pointing out. */
  ALMOST = 'ALMOST',
  WRONG = 'WRONG',
}

export enum AnswerNote {
  CAPITALIZATION = 'CAPITALIZATION',
  SPECIAL_CHARACTER = 'SPECIAL_CHARACTER',
  TYPO = 'TYPO',
}

export interface AnswerCheck {
  result: AnswerResult;
  note?: AnswerNote;
  /** The accepted answer the learner matched, or the closest one when wrong. */
  bestMatch: string;
}

interface ComparisonResult {
  result: AnswerResult;
  note?: AnswerNote;
}

const RESULT_RANK: Record<AnswerResult, number> = {
  [AnswerResult.CORRECT]: 2,
  [AnswerResult.ALMOST]: 1,
  [AnswerResult.WRONG]: 0,
};

const MIN_TYPO_WORD_LENGTH = 4;

/**
 * Normalises free-text input so formatting differences never count as mistakes:
 * unifies apostrophes, drops sentence punctuation and collapses whitespace.
 */
export function normalizeAnswer(text: string): string {
  return text
    .normalize('NFC')
    .replace(/[’‘`´]/g, "'")
    .replace(/[.,!?;:¡¿"«»„“”()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function foldCharacters({ text, folds }: { text: string; folds: Record<string, string> }): string {
  let folded = text;
  for (const [character, replacement] of Object.entries(folds)) {
    folded = folded.split(character).join(replacement);
  }
  return folded;
}

/**
 * Decides whether one word is an acceptable typo of another.
 *
 * Rejects edits in the inflected ending and in strict words, because those
 * differences are exactly the grammar being practised (wohne/wohnt, mein/dein).
 */
function isTolerableTypo({ given, expected, pack }: { given: string; expected: string; pack: LanguagePack }): boolean {
  if (expected.length < MIN_TYPO_WORD_LENGTH) {
    return false;
  }
  if (pack.strictWords.includes(expected) || pack.strictWords.includes(given)) {
    return false;
  }
  if (levenshteinDistance({ from: given, to: expected }) !== 1) {
    return false;
  }
  const sharedPrefix = commonPrefixLength({ first: given, second: expected });
  const editIsInEnding = sharedPrefix >= expected.length - pack.inflectedEndingLength;
  return !editIsInEnding;
}

function isTypoMatch({ given, expected, pack }: { given: string; expected: string; pack: LanguagePack }): boolean {
  const givenWords = given.split(' ');
  const expectedWords = expected.split(' ');
  if (givenWords.length !== expectedWords.length) {
    return false;
  }
  let differingWords = 0;
  for (let index = 0; index < expectedWords.length; index += 1) {
    if (givenWords[index] === expectedWords[index]) {
      continue;
    }
    differingWords += 1;
    if (!isTolerableTypo({ given: givenWords[index], expected: expectedWords[index], pack })) {
      return false;
    }
  }
  return differingWords > 0;
}

function compareWithExpected({
  given,
  expected,
  pack,
  strict,
}: {
  given: string;
  expected: string;
  pack: LanguagePack;
  strict: boolean;
}): ComparisonResult {
  if (given === expected) {
    return { result: AnswerResult.CORRECT };
  }

  const givenLower = given.toLowerCase();
  const expectedLower = expected.toLowerCase();
  if (givenLower === expectedLower) {
    if (pack.capitalizationMatters) {
      return { result: AnswerResult.ALMOST, note: AnswerNote.CAPITALIZATION };
    }
    return { result: AnswerResult.CORRECT };
  }

  const givenFolded = foldCharacters({ text: givenLower, folds: pack.characterFolds });
  const expectedFolded = foldCharacters({ text: expectedLower, folds: pack.characterFolds });
  if (givenFolded === expectedFolded) {
    return { result: AnswerResult.ALMOST, note: AnswerNote.SPECIAL_CHARACTER };
  }

  if (!strict && isTypoMatch({ given: givenFolded, expected: expectedFolded, pack })) {
    return { result: AnswerResult.ALMOST, note: AnswerNote.TYPO };
  }

  return { result: AnswerResult.WRONG };
}

function findClosest({ given, accepted }: { given: string; accepted: string[] }): string {
  let closest = accepted[0];
  let closestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of accepted) {
    const distance = levenshteinDistance({ from: given.toLowerCase(), to: normalizeAnswer(candidate).toLowerCase() });
    if (distance < closestDistance) {
      closest = candidate;
      closestDistance = distance;
    }
  }
  return closest;
}

/**
 * Grades a typed answer against every accepted answer and returns the best result.
 *
 * `pack` is the language the answer is written in. Set `strict` for exercises
 * that test spelling-level grammar (cloze gaps), which disables typo tolerance.
 */
export function checkAnswer({
  given,
  accepted,
  pack,
  strict = false,
}: {
  given: string;
  accepted: string[];
  pack: LanguagePack;
  strict?: boolean;
}): AnswerCheck {
  const normalizedGiven = normalizeAnswer(given);
  let best: AnswerCheck | null = null;

  for (const candidate of accepted) {
    const comparison = compareWithExpected({
      given: normalizedGiven,
      expected: normalizeAnswer(candidate),
      pack,
      strict,
    });
    if (best === null || RESULT_RANK[comparison.result] > RESULT_RANK[best.result]) {
      best = { ...comparison, bestMatch: candidate };
    }
    if (comparison.result === AnswerResult.CORRECT) {
      break;
    }
  }

  if (best === null || best.result === AnswerResult.WRONG) {
    return { result: AnswerResult.WRONG, bestMatch: findClosest({ given: normalizedGiven, accepted }) };
  }
  return best;
}
