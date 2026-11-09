import { PartOfSpeech } from '../../src/domain/content/types';
import type { DictionaryData } from '../../src/domain/dictionary/dictionary';

export const GERMAN_CHARACTER_FOLDS = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' };

/** A tiny dictionary in frequency order, with "bin" linked to the verb sein and "hund" to the rare Hunt. */
export function buildDictionaryData(): DictionaryData {
  return {
    source: 'test data',
    entries: [
      { word: 'sein', partOfSpeech: PartOfSpeech.VERB, ipa: '/zaɪ̯n/', meanings: ['to be'] },
      { word: 'sein', partOfSpeech: PartOfSpeech.DETERMINER, meanings: ['his'] },
      { word: 'für', partOfSpeech: PartOfSpeech.PREPOSITION, ipa: '/fyːɐ̯/', meanings: ['for'] },
      { word: 'laufen', partOfSpeech: PartOfSpeech.VERB, meanings: ['to run', 'to walk'] },
      { word: 'gehen', partOfSpeech: PartOfSpeech.VERB, meanings: ['to go, to walk'] },
      {
        word: 'Hund',
        partOfSpeech: PartOfSpeech.NOUN,
        gender: 'm',
        plural: 'Hunde',
        ipa: '/hʊnt/',
        meanings: ['dog, hound'],
      },
      { word: 'Hundefutter', partOfSpeech: PartOfSpeech.NOUN, gender: 'n', meanings: ['dog food'] },
      { word: 'Frau', partOfSpeech: PartOfSpeech.NOUN, gender: 'f', plural: 'Frauen', meanings: ['woman', 'wife'] },
      { word: 'Hunt', partOfSpeech: PartOfSpeech.NOUN, gender: 'm', meanings: ['minecart'] },
    ],
    forms: { bin: [0], hunde: [5], hund: [8] },
  };
}
