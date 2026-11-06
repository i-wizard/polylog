import { useMemo } from 'react';
import { buildLearnerProfile } from '../../domain/ai/chatContext';
import type { LearnerProfile } from '../../domain/ai/types';
import { useApp } from '../AppContext';
import { useProgress } from './useProgress';

/** The learner's level and known words, kept up to date as lessons are completed. */
export function useLearnerProfile(): LearnerProfile {
  const { units, packs } = useApp();
  const { completedLessonIds } = useProgress();
  return useMemo(() => buildLearnerProfile({ units, completedLessonIds, packs }), [units, completedLessonIds, packs]);
}
