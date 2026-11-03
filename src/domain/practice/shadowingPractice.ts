import { ExerciseType, LessonKind, type Lesson, type ShadowExercise, type Unit } from '../content/types';
import { shuffle } from '../../utils/random';

export const SHADOWING_LESSON_ID = 'practice-shadowing';

interface SentenceSource {
  text: string;
  translation: string;
}

/**
 * Collects target-language sentences the learner has already met, from
 * completed lessons only, so practice never introduces unseen material.
 */
function collectSentences({ units, completedLessonIds }: { units: Unit[]; completedLessonIds: Set<string> }): SentenceSource[] {
  const sentencesByText = new Map<string, SentenceSource>();

  for (const unit of units) {
    const vocabById = new Map(unit.vocab.map((item) => [item.id, item]));
    for (const lesson of unit.lessons) {
      if (!completedLessonIds.has(lesson.id)) {
        continue;
      }
      for (const exercise of lesson.exercises) {
        if (exercise.type === ExerciseType.SHADOW || exercise.type === ExerciseType.LISTEN_TYPE) {
          sentencesByText.set(exercise.text, { text: exercise.text, translation: exercise.translation });
        }
      }
      for (const vocabId of lesson.introduces) {
        const example = vocabById.get(vocabId)?.example;
        if (example) {
          sentencesByText.set(example.text, example);
        }
      }
    }
  }

  return [...sentencesByText.values()];
}

/**
 * Builds an ad-hoc lesson of shadowing exercises from already-learned sentences.
 *
 * Returns null when nothing has been learned yet.
 */
export function buildShadowingLesson({
  units,
  completedLessonIds,
  count,
  random = Math.random,
}: {
  units: Unit[];
  completedLessonIds: Set<string>;
  count: number;
  random?: () => number;
}): Lesson | null {
  const sentences = collectSentences({ units, completedLessonIds });
  if (sentences.length === 0) {
    return null;
  }

  const picked = shuffle({ items: sentences, random }).slice(0, count);
  const exercises: ShadowExercise[] = picked.map((sentence, index) => ({
    id: `${SHADOWING_LESSON_ID}-${index}`,
    type: ExerciseType.SHADOW,
    text: sentence.text,
    translation: sentence.translation,
  }));

  return {
    id: SHADOWING_LESSON_ID,
    title: 'Shadowing practice',
    kind: LessonKind.PRACTICE,
    introduces: [],
    exercises,
  };
}
