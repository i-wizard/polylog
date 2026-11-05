import { shiftDateKey } from '../../utils/date';
import type { LessonResult } from '../session/lessonSession';

export const XP_PER_LESSON = 10;
export const XP_PERFECT_LESSON_BONUS = 5;
export const XP_PER_REVIEW = 1;
export const XP_PER_SHADOWING_SENTENCE = 1;
export const DAILY_GOAL_OPTIONS = [10, 20, 30, 50];
/**
 * Goal assumed for days recorded before each day stored its own goal.
 * The smallest option is used so that changing the goal never retroactively breaks an old streak.
 */
const LEGACY_DAY_GOAL_XP = Math.min(...DAILY_GOAL_OPTIONS);

export interface DailyActivity {
  courseId: string;
  /** Local date, "YYYY-MM-DD". */
  date: string;
  xp: number;
  lessonsCompleted: number;
  reviewsDone: number;
  /** The daily goal in force when this day's activity was last recorded. */
  goalXp?: number;
}

/** XP earned for finishing a lesson; a flawless first run earns a bonus. */
export function xpForLesson(result: LessonResult): number {
  return result.isPerfect ? XP_PER_LESSON + XP_PERFECT_LESSON_BONUS : XP_PER_LESSON;
}

/**
 * Counts consecutive days on which the daily goal was met.
 *
 * Past days are judged against the goal stored with them, so changing the
 * goal only affects today and later. Today only extends the streak once its
 * goal is met; an unfinished today does not break a streak that ran through
 * yesterday.
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
  const activityByDate = new Map<string, DailyActivity>();
  for (const activity of activities) {
    activityByDate.set(activity.date, activity);
  }

  const goalMet = (date: string): boolean => {
    const activity = activityByDate.get(date);
    if (!activity) {
      return false;
    }
    const goalXp = date === today ? dailyGoalXp : (activity.goalXp ?? LEGACY_DAY_GOAL_XP);
    return activity.xp >= goalXp;
  };

  let streak = 0;
  let cursor = goalMet(today) ? today : shiftDateKey({ dateKey: today, days: 1 });
  while (goalMet(cursor)) {
    streak += 1;
    cursor = shiftDateKey({ dateKey: cursor, days: 1 });
  }
  return streak;
}
