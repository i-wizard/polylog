import { germanLanguagePack } from './de';
import { englishLanguagePack } from './en';
import type { LanguagePack } from './types';

const LANGUAGE_PACKS: Record<string, LanguagePack> = {
  [germanLanguagePack.code]: germanLanguagePack,
  [englishLanguagePack.code]: englishLanguagePack,
};

/**
 * Returns the language pack for a language code.
 *
 * Throws for unknown codes because a course referencing a missing pack is a
 * build-time content error, not something the UI can recover from.
 */
export function getLanguagePack(code: string): LanguagePack {
  const pack = LANGUAGE_PACKS[code];
  if (!pack) {
    throw new Error(`No language pack registered for "${code}"`);
  }
  return pack;
}
