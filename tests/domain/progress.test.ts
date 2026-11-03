import { describe, expect, it } from 'vitest';
import { LessonStatus, computeLessonStatuses, findNextLesson } from '../../src/domain/progress/pathProgress';
import {
  XP_PERFECT_LESSON_BONUS,
  XP_PER_LESSON,
  calculateStreak,
  xpForLesson,
  type DailyActivity,
} from '../../src/domain/progress/progress';
import { shiftDateKey } from '../../src/utils/date';
import { buildUnit } from '../fixtures';

const COURSE_ID = 'test-course';
const TODAY = '2026-11-03';
const DAILY_GOAL = 30;

function activity({ date, xp }: { date: string; xp: number }): DailyActivity {
  return { courseId: COURSE_ID, date, xp, lessonsCompleted: 0, reviewsDone: 0 };
}

describe('xpForLesson', () => {
  it('adds a bonus for a perfect lesson', () => {
    const perfect = xpForLesson({ totalExercises: 5, firstTryCorrect: 5, mistakes: 0, isPerfect: true });
    const imperfect = xpForLesson({ totalExercises: 5, firstTryCorrect: 4, mistakes: 1, isPerfect: false });
    expect(perfect).toBe(XP_PER_LESSON + XP_PERFECT_LESSON_BONUS);
    expect(imperfect).toBe(XP_PER_LESSON);
  });
});

describe('calculateStreak', () => {
  it('counts consecutive days that met the goal, including today', () => {
    const activities = [
      activity({ date: TODAY, xp: 30 }),
      activity({ date: shiftDateKey({ dateKey: TODAY, days: 1 }), xp: 40 }),
      activity({ date: shiftDateKey({ dateKey: TODAY, days: 2 }), xp: 10 }),
    ];
    expect(calculateStreak({ activities, dailyGoalXp: DAILY_GOAL, today: TODAY })).toBe(2);
  });

  it('keeps yesterday\'s streak alive while today is still in progress', () => {
    const activities = [
      activity({ date: TODAY, xp: 5 }),
      activity({ date: shiftDateKey({ dateKey: TODAY, days: 1 }), xp: 30 }),
    ];
    expect(calculateStreak({ activities, dailyGoalXp: DAILY_GOAL, today: TODAY })).toBe(1);
  });

  it('is zero after a missed day', () => {
    const activities = [activity({ date: shiftDateKey({ dateKey: TODAY, days: 2 }), xp: 50 })];
    expect(calculateStreak({ activities, dailyGoalXp: DAILY_GOAL, today: TODAY })).toBe(0);
  });

  it('crosses month boundaries', () => {
    expect(shiftDateKey({ dateKey: '2026-03-01', days: 1 })).toBe('2026-02-28');
  });
});

describe('computeLessonStatuses', () => {
  const units = [buildUnit()];

  it('unlocks only the first lesson at the start', () => {
    const statuses = computeLessonStatuses({ units, completedLessonIds: new Set(), unlockAll: false });
    expect(statuses.get('lesson-1')).toBe(LessonStatus.AVAILABLE);
    expect(statuses.get('lesson-2')).toBe(LessonStatus.LOCKED);
  });

  it('unlocks the next lesson after completion', () => {
    const statuses = computeLessonStatuses({ units, completedLessonIds: new Set(['lesson-1']), unlockAll: false });
    expect(statuses.get('lesson-1')).toBe(LessonStatus.COMPLETED);
    expect(statuses.get('lesson-2')).toBe(LessonStatus.AVAILABLE);
    expect(findNextLesson({ units, statuses })?.lesson.id).toBe('lesson-2');
  });

  it('opens everything when unlockAll is set', () => {
    const statuses = computeLessonStatuses({ units, completedLessonIds: new Set(), unlockAll: true });
    expect(statuses.get('lesson-2')).toBe(LessonStatus.AVAILABLE);
  });
});
