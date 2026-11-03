import type { VocabItem } from '../../domain/content/types';
import { whitespaceTokenize } from '../tokenize';
import { TextDirection, type LanguagePack } from '../types';

/**
 * English, used as the base (explanation) language.
 *
 * Grading is lenient here: the learner is being tested on the target
 * language, so capitalisation and word endings in English answers don't matter.
 */
export const englishLanguagePack: LanguagePack = {
  code: 'en',
  name: 'English',
  nativeName: 'English',
  speechLocale: 'en-GB',
  direction: TextDirection.LTR,
  specialCharacters: [],
  characterFolds: {},
  capitalizationMatters: false,
  inflectedEndingLength: 0,
  genders: [],
  strictWords: [],
  formatNoun: (noun: VocabItem) => noun.text,
  tokenize: whitespaceTokenize,
};
