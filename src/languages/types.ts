import type { VocabItem } from '../domain/content/types';

export enum TextDirection {
  LTR = 'ltr',
  RTL = 'rtl',
}

/** A grammatical gender, e.g. German masculine → article "der", shown in blue. */
export interface GenderDefinition {
  code: string;
  article: string;
  label: string;
  /** CSS custom property suffix, resolved as `var(--<colorToken>)`. */
  colorToken: string;
}

/**
 * Everything the core needs to know about how a language behaves.
 *
 * This is the only place language-specific rules may live. Adding a language
 * means writing a new pack and registering it; the lesson player, grading, SRS
 * and storage stay untouched.
 */
export interface LanguagePack {
  code: string;
  name: string;
  nativeName: string;
  /** BCP-47 locale used for text-to-speech and speech recognition. */
  speechLocale: string;
  direction: TextDirection;
  /** Characters shown on the on-screen key row under text inputs. */
  specialCharacters: string[];
  /** Lower-case spellings learners type instead of special characters (ä → ae). */
  characterFolds: Record<string, string>;
  /** When true, a capitalisation-only difference is flagged instead of silently accepted. */
  capitalizationMatters: boolean;
  /**
   * How many trailing letters carry inflection. Edits inside this window are
   * grammar mistakes, not typos (e.g. German "wohne" vs "wohnt").
   */
  inflectedEndingLength: number;
  genders: GenderDefinition[];
  /** Lower-case words that must always be spelt exactly (articles, possessives). */
  strictWords: string[];
  /** Renders a noun the way learners should memorise it, e.g. "der Tisch". */
  formatNoun(noun: VocabItem): string;
  /** Splits a sentence into word tiles. */
  tokenize(sentence: string): string[];
}
