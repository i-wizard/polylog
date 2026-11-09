import { useEffect, useMemo, useState } from 'react';
import type { Unit } from '../../domain/content/types';
import { buildDictionaryIndex, type DictionaryData, type DictionaryIndex } from '../../domain/dictionary/dictionary';
import { loadDictionary } from '../../services/content/dictionaryRepository';
import { Logger } from '../../utils/logger';
import { useApp } from '../AppContext';

export enum DictionaryStatus {
  LOADING = 'LOADING',
  READY = 'READY',
  /** No dictionary is bundled for this course's languages. */
  UNAVAILABLE = 'UNAVAILABLE',
  FAILED = 'FAILED',
}

/** Building the index takes a moment on a phone, so it is kept for the next time the tab opens. */
let cachedIndex: { data: DictionaryData; units: Unit[]; index: DictionaryIndex } | null = null;

export interface DictionaryState {
  status: DictionaryStatus;
  index: DictionaryIndex | null;
  source?: string;
}

/** Loads the active course's dictionary, merged with the course's own vocab, ready to search. */
export function useDictionary(): DictionaryState {
  const { course, units, packs } = useApp();
  const [data, setData] = useState<DictionaryData | null>(null);
  const [status, setStatus] = useState(DictionaryStatus.LOADING);

  useEffect(() => {
    let cancelled = false;
    setStatus(DictionaryStatus.LOADING);
    loadDictionary({ targetLanguage: course.targetLanguage, baseLanguage: course.baseLanguage })
      .then((loaded) => {
        if (cancelled) {
          return;
        }
        setData(loaded);
        setStatus(loaded ? DictionaryStatus.READY : DictionaryStatus.UNAVAILABLE);
      })
      .catch((error: unknown) => {
        Logger.error('Failed to load dictionary', { courseId: course.id, error });
        if (!cancelled) {
          setStatus(DictionaryStatus.FAILED);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [course.id, course.targetLanguage, course.baseLanguage]);

  const index = useMemo(() => {
    if (!data) {
      return null;
    }
    if (cachedIndex?.data === data && cachedIndex.units === units) {
      return cachedIndex.index;
    }
    const courseVocab = units.flatMap((unit) => unit.vocab);
    const built = buildDictionaryIndex({ dictionary: data, courseVocab, characterFolds: packs.target.characterFolds });
    cachedIndex = { data, units, index: built };
    return built;
  }, [data, units, packs.target.characterFolds]);

  return { status, index, source: data?.source };
}
