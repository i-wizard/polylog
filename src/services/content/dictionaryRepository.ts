import type { DictionaryData } from '../../domain/dictionary/dictionary';

const dictionaryLoaders = import.meta.glob<DictionaryData>('/content/dictionaries/*.json', { import: 'default' });

/**
 * Loads the dictionary for a language pair, e.g. German → English, or null if
 * none is bundled. The file is several megabytes, so it is a separate chunk,
 * fetched the first time the dictionary is opened and cached for offline use.
 */
export async function loadDictionary({
  targetLanguage,
  baseLanguage,
}: {
  targetLanguage: string;
  baseLanguage: string;
}): Promise<DictionaryData | null> {
  const loader = dictionaryLoaders[`/content/dictionaries/${targetLanguage}-${baseLanguage}.json`];
  return loader ? loader() : null;
}
