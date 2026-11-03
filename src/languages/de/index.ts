import type { VocabItem } from '../../domain/content/types';
import { whitespaceTokenize } from '../tokenize';
import { TextDirection, type GenderDefinition, type LanguagePack } from '../types';

const GERMAN_GENDERS: GenderDefinition[] = [
  { code: 'm', article: 'der', label: 'masculine', colorToken: 'gender-m' },
  { code: 'f', article: 'die', label: 'feminine', colorToken: 'gender-f' },
  { code: 'n', article: 'das', label: 'neuter', colorToken: 'gender-n' },
];

/**
 * Words of four or more letters that differ from a sibling form by one letter
 * (mein/dein, eine/keine). Shorter words are never typo-tolerated anyway.
 */
const GERMAN_STRICT_WORDS = [
  'eine', 'einen', 'einem', 'einer', 'eines',
  'kein', 'keine', 'keinen', 'keinem', 'keiner', 'keines',
  'mein', 'meine', 'meinen', 'meinem', 'meiner', 'meines',
  'dein', 'deine', 'deinen', 'deinem', 'deiner', 'deines',
  'sein', 'seine', 'seinen', 'seinem', 'seiner', 'seines',
  'ihre', 'ihren', 'ihrem', 'ihrer', 'ihres', 'ihnen',
  'dich', 'mich', 'sich', 'euch',
  'dieser', 'diese', 'diesen', 'diesem', 'dieses',
];

/** Renders a German noun with its article, e.g. "der Tisch". */
function formatGermanNoun(noun: VocabItem): string {
  const gender = GERMAN_GENDERS.find((definition) => definition.code === noun.gender);
  if (!gender) {
    return noun.text;
  }
  return `${gender.article} ${noun.text}`;
}

export const germanLanguagePack: LanguagePack = {
  code: 'de',
  name: 'German',
  nativeName: 'Deutsch',
  speechLocale: 'de-DE',
  direction: TextDirection.LTR,
  specialCharacters: ['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü'],
  characterFolds: { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' },
  capitalizationMatters: true,
  inflectedEndingLength: 2,
  genders: GERMAN_GENDERS,
  strictWords: GERMAN_STRICT_WORDS,
  formatNoun: formatGermanNoun,
  tokenize: whitespaceTokenize,
};
