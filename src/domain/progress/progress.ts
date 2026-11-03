import { shiftDateKey } from '../../utils/date';
import type { LessonResult } from '../session/lessonSession';

export const XP_PER_LESSON = 10;
export const XP_PERFECT_LESSON_BONUS = 5;
export const XP_PER_REVIEW = 1;
export const XP_PER_SHADOWING_SENTENCE = 1;

export interface DailyActivity {
  courseId: string;
  /** Local date, "YYYY-MM-DD". */
  date: string;
  xp: number;
  lessonsCompleted: number;
  reviewsDone: number;
}

/** XP earned for finishing a lesson; a flawless first run earns a bonus. */
export function xpForLesson(result: LessonResult): number {
  return result.isPerfect ? XP_PER_LESSON + XP_PERFECT_LESSON_BONUS : XP_PER_LESSON;
}

/**
 * Counts consecutive days on which the daily goal was met.
 *
 * Today only extends the streak once its goal is met; an unfinished today
 * does not break a streak that ran through yesterday.
 */
export function calculateStreak({
  activities,
  dailyGoalXp,
  today,
}: {
  activities: DailyActivity[];
  dailyGoalXp: number;
  today: string;
}): number {
  const xpByDate = new Map<string, number>();
  for (const activity of activities) {
    xpByDate.set(activity.date, (xpByDate.get(activity.date) ?? 0) + activity.xp);
  }

  const goalMet = (date: string) => (xpByDate.get(date) ?? 0) >= dailyGoalXp;

  let streak = 0;
  let cursor = goalMet(today) ? today : shiftDateKey({ dateKey: today, days: 1 });
  while (goalMet(cursor)) {
    streak += 1;
    cursor = shiftDateKey({ dateKey: cursor, days: 1 });
  }
  return streak;
}
