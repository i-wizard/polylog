import { describe, expect, it } from 'vitest';
import {
  buildDictionaryIndex,
  entryAsVocab,
  searchDictionary,
  type DictionaryIndex,
} from '../../src/domain/dictionary/dictionary';
import { buildDictionaryData, buildNounVocab, buildPhraseVocab, GERMAN_CHARACTER_FOLDS } from '../fixtures';

const COURSE_PHRASE = buildPhraseVocab({ id: 'guten-morgen', text: 'Guten Morgen', translations: ['Good morning'] });
const COURSE_NOUN = buildNounVocab();

function buildIndex(): DictionaryIndex {
  return buildDictionaryIndex({
    dictionary: buildDictionaryData(),
    courseVocab: [COURSE_NOUN, COURSE_PHRASE],
    characterFolds: GERMAN_CHARACTER_FOLDS,
  });
}

function searchWords(query: string): string[] {
  return searchDictionary({ index: buildIndex(), query }).map((result) => result.entry.word);
}

describe('searchDictionary', () => {
  it('finds a word regardless of capitalisation', () => {
    expect(searchWords('hund')[0]).toBe('Hund');
  });

  it('finds words with special characters typed without them or spelled out', () => {
    expect(searchWords('fur')).toEqual(['für']);
    expect(searchWords('fuer')).toEqual(['für']);
    expect(searchWords('Für')).toEqual(['für']);
  });

  it('leads from an inflected form to its base word and says which form matched', () => {
    const [result] = searchDictionary({ index: buildIndex(), query: 'bin' });

    expect(result.entry.word).toBe('sein');
    expect(result.entry.meanings).toEqual(['to be']);
    expect(result.matchedForm).toBe('bin');
  });

  it('ignores inflected-form links when the query is itself a word', () => {
    expect(searchWords('hund')).not.toContain('Hunt');
  });

  it('finds words by meaning, ignoring "to" before verbs', () => {
    expect(searchWords('go')).toEqual(['gehen']);
    expect(searchWords('run')).toEqual(['laufen']);
  });

  it('finds words by meaning when "to" is typed before a verb', () => {
    expect(searchWords('to be')[0]).toBe('sein');
  });

  it('ranks words whose first meaning is the query before words with it as a later meaning', () => {
    // laufen is more common, but "walk" is only its second meaning.
    expect(searchWords('walk')).toEqual(['gehen', 'laufen']);
  });

  it('ranks an exact match before longer words that start with the query', () => {
    expect(searchWords('hund')).toEqual(['Hund', 'Hundefutter']);
  });

  it('ranks a word meaning exactly the query before words merely mentioning it', () => {
    expect(searchWords('dog')).toEqual(['Hund', 'Hundefutter']);
  });

  it('keeps several words with the same spelling, most common first', () => {
    expect(searchDictionary({ index: buildIndex(), query: 'sein' }).map((result) => result.entry.meanings[0])).toEqual([
      'to be',
      'his',
    ]);
  });

  it('returns nothing for a blank query', () => {
    expect(searchWords('  ')).toEqual([]);
  });
});

describe('buildDictionaryIndex', () => {
  it('links a course word to its dictionary entry', () => {
    const [result] = searchDictionary({ index: buildIndex(), query: 'Frau' });

    expect(result.entry.plural).toBe('Frauen');
    expect(result.courseVocab?.id).toBe(COURSE_NOUN.id);
  });

  it('adds course words the dictionary lacks, such as phrases', () => {
    const [result] = searchDictionary({ index: buildIndex(), query: 'guten morgen' });

    expect(result.entry.word).toBe('Guten Morgen');
    expect(result.entry.meanings).toEqual(['Good morning']);
    expect(result.courseVocab?.id).toBe(COURSE_PHRASE.id);
  });
});

describe('entryAsVocab', () => {
  it('keeps what is needed to show and speak a noun with its article', () => {
    const vocab = entryAsVocab(buildDictionaryData().entries[5]);

    expect(vocab.text).toBe('Hund');
    expect(vocab.gender).toBe('m');
    expect(vocab.plural).toBe('Hunde');
  });
});
