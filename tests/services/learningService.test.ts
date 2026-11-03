import { beforeEach, describe, expect, it } from 'vitest';
import { XP_PER_LESSON, XP_PER_REVIEW } from '../../src/domain/progress/progress';
import { ReviewRating, buildCardId, CardType } from '../../src/domain/srs/scheduler';
import { germanLanguagePack } from '../../src/languages/de';
import { completeLesson, loadReviewQueue, submitReview } from '../../src/services/learning/learningService';
import { exportProgress, importProgress } from '../../src/services/storage/backupService';
import { db } from '../../src/services/storage/db';
import { DEFAULT_SETTINGS } from '../../src/services/storage/settingsRepository';
import { toLocalDateKey } from '../../src/utils/date';
import { FIXTURE_COURSE_ID, buildUnit } from '../fixtures';

const NOW = new Date('2026-11-03T09:00:00');
const LATER = new Date('2026-11-03T10:00:00');
const TODAY = toLocalDateKey(NOW);
const IMPERFECT_RESULT = { totalExercises: 4, firstTryCorrect: 3, mistakes: 1, isPerfect: false };
const NOUN_CARD_ID = buildCardId({ courseId: FIXTURE_COURSE_ID, vocabId: 'frau', cardType: CardType.RECOGNIZE });

async function completeFirstLesson(now: Date) {
  const unit = buildUnit();
  return completeLesson({
    courseId: FIXTURE_COURSE_ID,
    unit,
    lesson: unit.lessons[0],
    result: IMPERFECT_RESULT,
    targetPack: germanLanguagePack,
    now,
  });
}

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe('completeLesson', () => {
  it('records completion, creates review cards and credits XP', async () => {
    expect(await db.lessonProgress.get([FIXTURE_COURSE_ID, 'lesson-1'])).toBeUndefined();
    expect(await db.cards.count()).toBe(0);

    const completion = await completeFirstLesson(NOW);

    expect(completion.xpEarned).toBe(XP_PER_LESSON);
    expect(completion.newWords.map((word) => word.id)).toEqual(['frau']);

    const progress = await db.lessonProgress.get([FIXTURE_COURSE_ID, 'lesson-1']);
    expect(progress).toMatchObject({
      unitId: 'unit-1',
      firstCompletedAt: NOW.getTime(),
      lastCompletedAt: NOW.getTime(),
      bestAccuracy: 0.75,
      timesCompleted: 1,
    });

    const cards = await db.cards.toArray();
    expect(cards.map((card) => card.cardType).sort()).toEqual([CardType.GENDER, CardType.PRODUCE, CardType.RECOGNIZE]);

    const activity = await db.dailyActivity.get([FIXTURE_COURSE_ID, TODAY]);
    expect(activity).toEqual({ courseId: FIXTURE_COURSE_ID, date: TODAY, xp: XP_PER_LESSON, lessonsCompleted: 1, reviewsDone: 0 });
  });

  it('repeating a lesson keeps existing card schedules and updates the completion record', async () => {
    await completeFirstLesson(NOW);
    const card = await db.cards.get(NOUN_CARD_ID);
    await submitReview({ card: card!, rating: ReviewRating.GOOD, now: NOW });
    const reviewedDue = (await db.cards.get(NOUN_CARD_ID))!.due;

    await completeFirstLesson(LATER);

    expect((await db.cards.get(NOUN_CARD_ID))!.due).toBe(reviewedDue);
    expect(await db.cards.count()).toBe(3);
    const progress = await db.lessonProgress.get([FIXTURE_COURSE_ID, 'lesson-1']);
    expect(progress).toMatchObject({ firstCompletedAt: NOW.getTime(), lastCompletedAt: LATER.getTime(), timesCompleted: 2 });
  });
});

describe('submitReview', () => {
  it('saves the new schedule, logs the review and credits XP', async () => {
    await completeFirstLesson(NOW);
    const card = (await db.cards.get(NOUN_CARD_ID))!;
    expect(await db.reviewLogs.count()).toBe(0);

    const updated = await submitReview({ card, rating: ReviewRating.GOOD, now: NOW });

    expect(updated.due).toBeGreaterThan(NOW.getTime());
    expect((await db.cards.get(NOUN_CARD_ID))!.due).toBe(updated.due);
    const logs = await db.reviewLogs.toArray();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ cardId: NOUN_CARD_ID, rating: ReviewRating.GOOD, reviewedAt: NOW.getTime(), wasNew: true });
    const activity = await db.dailyActivity.get([FIXTURE_COURSE_ID, TODAY]);
    expect(activity).toMatchObject({ xp: XP_PER_LESSON + XP_PER_REVIEW, reviewsDone: 1 });
  });
});

describe('loadReviewQueue', () => {
  it('only offers new cards up to the remaining daily allowance', async () => {
    await completeFirstLesson(NOW);
    const settings = { ...DEFAULT_SETTINGS, newCardsPerDay: 2 };

    const firstQueue = await loadReviewQueue({ courseId: FIXTURE_COURSE_ID, settings, now: NOW });
    expect(firstQueue).toHaveLength(2);

    await submitReview({ card: firstQueue[0], rating: ReviewRating.EASY, now: NOW });
    const secondQueue = await loadReviewQueue({ courseId: FIXTURE_COURSE_ID, settings, now: NOW });
    expect(secondQueue).toHaveLength(1);
  });
});

describe('backup round trip', () => {
  it('restores cards with real Date objects so scheduling keeps working', async () => {
    await completeFirstLesson(NOW);
    const backup = JSON.parse(JSON.stringify(await exportProgress(NOW)));
    await Promise.all(db.tables.map((table) => table.clear()));
    expect(await db.cards.count()).toBe(0);

    await importProgress(backup);

    const restored = (await db.cards.get(NOUN_CARD_ID))!;
    expect(restored.fsrs.due).toBeInstanceOf(Date);
    const reviewed = await submitReview({ card: restored, rating: ReviewRating.GOOD, now: NOW });
    expect(reviewed.due).toBeGreaterThan(NOW.getTime());
    expect(await db.lessonProgress.count()).toBe(1);
  });
});
