import type { DailyActivity } from '../../domain/progress/progress';
import type { LessonResult } from '../../domain/session/lessonSession';
import { Logger } from '../../utils/logger';
import { db, type LessonProgress } from './db';
import { getSettings } from './settingsRepository';

/** Ids of every lesson the learner has completed at least once in a course. */
export async function getCompletedLessonIds(courseId: string): Promise<Set<string>> {
  const rows = await db.lessonProgress.where('courseId').equals(courseId).toArray();
  return new Set(rows.map((row) => row.lessonId));
}

/** Stores (or updates) the learner's record for a finished lesson. */
export async function recordLessonCompletion({
  courseId,
  unitId,
  lessonId,
  result,
  now,
}: {
  courseId: string;
  unitId: string;
  lessonId: string;
  result: LessonResult;
  now: Date;
}): Promise<void> {
  const accuracy = result.totalExercises === 0 ? 1 : result.firstTryCorrect / result.totalExercises;
  const existing = await db.lessonProgress.get([courseId, lessonId]);

  const progress: LessonProgress = {
    courseId,
    unitId,
    lessonId,
    firstCompletedAt: existing?.firstCompletedAt ?? now.getTime(),
    lastCompletedAt: now.getTime(),
    bestAccuracy: Math.max(existing?.bestAccuracy ?? 0, accuracy),
    timesCompleted: (existing?.timesCompleted ?? 0) + 1,
  };
  await db.lessonProgress.put(progress);
  Logger.info('Lesson completed', { courseId, lessonId, accuracy, timesCompleted: progress.timesCompleted });
}

/**
 * Adds XP and counters to a day's activity row, creating it if needed.
 *
 * The current daily goal is stamped on the row so the streak can later judge
 * this day by the goal that applied then, not by whatever the goal becomes.
 */
export async function addDailyActivity({
  courseId,
  date,
  xp,
  lessonsCompleted = 0,
  reviewsDone = 0,
}: {
  courseId: string;
  date: string;
  xp: number;
  lessonsCompleted?: number;
  reviewsDone?: number;
}): Promise<void> {
  const { dailyGoalXp } = await getSettings();
  await db.transaction('rw', db.dailyActivity, async () => {
    const existing = await db.dailyActivity.get([courseId, date]);
    await db.dailyActivity.put({
      courseId,
      date,
      xp: (existing?.xp ?? 0) + xp,
      lessonsCompleted: (existing?.lessonsCompleted ?? 0) + lessonsCompleted,
      reviewsDone: (existing?.reviewsDone ?? 0) + reviewsDone,
      goalXp: dailyGoalXp,
    });
  });
}

/** All daily activity rows of a course, for streak and goal calculations. */
export async function listDailyActivity(courseId: string): Promise<DailyActivity[]> {
  return db.dailyActivity.where('courseId').equals(courseId).toArray();
}
