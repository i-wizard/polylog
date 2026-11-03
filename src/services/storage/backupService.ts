import type { ReviewCard } from '../../domain/srs/scheduler';
import { Logger } from '../../utils/logger';
import { db, type AppSettings, type LessonProgress, type StoredReviewLog } from './db';
import type { DailyActivity } from '../../domain/progress/progress';

const BACKUP_FORMAT_VERSION = 1;

export interface ProgressBackup {
  formatVersion: number;
  exportedAt: string;
  settings: AppSettings[];
  lessonProgress: LessonProgress[];
  cards: ReviewCard[];
  reviewLogs: StoredReviewLog[];
  dailyActivity: DailyActivity[];
}

/** Snapshot of every table, ready to be saved as JSON. */
export async function exportProgress(now: Date): Promise<ProgressBackup> {
  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: now.toISOString(),
    settings: await db.settings.toArray(),
    lessonProgress: await db.lessonProgress.toArray(),
    cards: await db.cards.toArray(),
    reviewLogs: await db.reviewLogs.toArray(),
    dailyActivity: await db.dailyActivity.toArray(),
  };
}

/** JSON turns FSRS dates into strings; scheduling needs real Date objects back. */
function reviveCardDates(card: ReviewCard): ReviewCard {
  const lastReview = card.fsrs.last_review ? new Date(card.fsrs.last_review) : undefined;
  return {
    ...card,
    fsrs: { ...card.fsrs, due: new Date(card.fsrs.due), last_review: lastReview },
  };
}

/**
 * Replaces all local progress with a backup.
 *
 * Runs in one transaction so a malformed file can't leave the database half-restored.
 */
export async function importProgress(backup: ProgressBackup): Promise<void> {
  if (backup.formatVersion !== BACKUP_FORMAT_VERSION) {
    throw new Error(`Unsupported backup version ${backup.formatVersion}`);
  }

  const tables = [db.settings, db.lessonProgress, db.cards, db.reviewLogs, db.dailyActivity];
  await db.transaction('rw', tables, async () => {
    await Promise.all(tables.map((table) => table.clear()));
    await db.settings.bulkPut(backup.settings);
    await db.lessonProgress.bulkPut(backup.lessonProgress);
    await db.cards.bulkPut(backup.cards.map(reviveCardDates));
    await db.reviewLogs.bulkPut(backup.reviewLogs);
    await db.dailyActivity.bulkPut(backup.dailyActivity);
  });
  Logger.info('Progress imported', { exportedAt: backup.exportedAt, cards: backup.cards.length });
}

/** Deletes all learning progress but keeps settings. */
export async function resetProgress(): Promise<void> {
  const tables = [db.lessonProgress, db.cards, db.reviewLogs, db.dailyActivity];
  await db.transaction('rw', tables, async () => {
    await Promise.all(tables.map((table) => table.clear()));
  });
  Logger.warn('All learning progress was reset');
}
