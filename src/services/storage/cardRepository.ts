import Dexie from 'dexie';
import type { ReviewCard, ReviewLogEntry } from '../../domain/srs/scheduler';
import { Logger } from '../../utils/logger';
import { db } from './db';

/**
 * Saves cards that don't exist yet. Repeating a lesson must never reset the
 * scheduling of words already in review, so existing cards are left alone.
 */
export async function addCardsIfMissing(cards: ReviewCard[]): Promise<number> {
  if (cards.length === 0) {
    return 0;
  }
  const existing = await db.cards.bulkGet(cards.map((card) => card.id));
  const missing = cards.filter((_, index) => existing[index] === undefined);
  await db.cards.bulkAdd(missing);
  Logger.info('Review cards added', { added: missing.length, skipped: cards.length - missing.length });
  return missing.length;
}

/** Cards in a course whose due time has passed. */
export async function getDueCards({ courseId, now }: { courseId: string; now: Date }): Promise<ReviewCard[]> {
  return db.cards
    .where('[courseId+due]')
    .between([courseId, Dexie.minKey], [courseId, now.getTime()], true, true)
    .toArray();
}

/** Total number of cards in a course. */
export async function countCards(courseId: string): Promise<number> {
  return db.cards.where('courseId').equals(courseId).count();
}

/** Counts reviews logged since a point in time, split by whether the card was new. */
export async function countReviewsSince({
  courseId,
  since,
}: {
  courseId: string;
  since: Date;
}): Promise<{ newCards: number; total: number }> {
  const logs = await db.reviewLogs.where('reviewedAt').aboveOrEqual(since.getTime()).toArray();
  const courseLogs = logs.filter((log) => log.courseId === courseId);
  return {
    newCards: courseLogs.filter((log) => log.wasNew).length,
    total: courseLogs.length,
  };
}

/** Persists a reviewed card and its log entry atomically. */
export async function saveReview({ card, log }: { card: ReviewCard; log: ReviewLogEntry }): Promise<void> {
  await db.transaction('rw', db.cards, db.reviewLogs, async () => {
    await db.cards.put(card);
    await db.reviewLogs.add(log);
  });
}
