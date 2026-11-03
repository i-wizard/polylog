import type { Lesson, Unit, VocabItem } from '../../domain/content/types';
import { XP_PER_REVIEW, XP_PER_SHADOWING_SENTENCE, xpForLesson } from '../../domain/progress/progress';
import { buildReviewQueue } from '../../domain/srs/reviewQueue';
import { createCardsForVocab, scheduleReview, type ReviewCard, type ReviewRating } from '../../domain/srs/scheduler';
import type { LessonResult } from '../../domain/session/lessonSession';
import type { LanguagePack } from '../../languages/types';
import { toLocalDateKey } from '../../utils/date';
import type { AppSettings } from '../storage/db';
import { addCardsIfMissing, countReviewsSince, getDueCards, saveReview } from '../storage/cardRepository';
import { addDailyActivity, recordLessonCompletion } from '../storage/progressRepository';

export interface LessonCompletion {
  xpEarned: number;
  newWords: VocabItem[];
}

/**
 * Persists everything that follows from finishing a lesson: the completion
 * record, review cards for newly taught words, and the day's XP.
 */
export async function completeLesson({
  courseId,
  unit,
  lesson,
  result,
  targetPack,
  now,
}: {
  courseId: string;
  unit: Unit;
  lesson: Lesson;
  result: LessonResult;
  targetPack: LanguagePack;
  now: Date;
}): Promise<LessonCompletion> {
  const vocabById = new Map(unit.vocab.map((item) => [item.id, item]));
  const newWords = lesson.introduces
    .map((vocabId) => vocabById.get(vocabId))
    .filter((item): item is VocabItem => item !== undefined);

  const cards = newWords.flatMap((vocab) =>
    createCardsForVocab({ courseId, unitId: unit.id, vocab, languageHasGender: targetPack.genders.length > 0, now }),
  );
  const xpEarned = xpForLesson(result);

  await recordLessonCompletion({ courseId, unitId: unit.id, lessonId: lesson.id, result, now });
  await addCardsIfMissing(cards);
  await addDailyActivity({ courseId, date: toLocalDateKey(now), xp: xpEarned, lessonsCompleted: 1 });

  return { xpEarned, newWords };
}

/** Credits XP for a finished shadowing practice set. */
export async function completeShadowingPractice({
  courseId,
  sentenceCount,
  now,
}: {
  courseId: string;
  sentenceCount: number;
  now: Date;
}): Promise<number> {
  const xpEarned = sentenceCount * XP_PER_SHADOWING_SENTENCE;
  await addDailyActivity({ courseId, date: toLocalDateKey(now), xp: xpEarned });
  return xpEarned;
}

function startOfDay(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Today's review queue, respecting the daily new-card and review limits. */
export async function loadReviewQueue({
  courseId,
  settings,
  now,
}: {
  courseId: string;
  settings: AppSettings;
  now: Date;
}): Promise<ReviewCard[]> {
  const [dueCards, doneToday] = await Promise.all([
    getDueCards({ courseId, now }),
    countReviewsSince({ courseId, since: startOfDay(now) }),
  ]);
  return buildReviewQueue({
    dueCards,
    newCardsAllowed: settings.newCardsPerDay - doneToday.newCards,
    reviewsAllowed: settings.reviewsPerDay - doneToday.total,
  });
}

/** Schedules and saves one review, and credits its XP. Returns the updated card. */
export async function submitReview({
  card,
  rating,
  now,
}: {
  card: ReviewCard;
  rating: ReviewRating;
  now: Date;
}): Promise<ReviewCard> {
  const reviewed = scheduleReview({ card, rating, now });
  await saveReview(reviewed);
  await addDailyActivity({ courseId: card.courseId, date: toLocalDateKey(now), xp: XP_PER_REVIEW, reviewsDone: 1 });
  return reviewed.card;
}
