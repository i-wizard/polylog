import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { calculateStreak, type DailyActivity } from '../../domain/progress/progress';
import { computeLessonStatuses, type LessonStatus } from '../../domain/progress/pathProgress';
import { getCompletedLessonIds, listDailyActivity } from '../../services/storage/progressRepository';
import { toLocalDateKey } from '../../utils/date';
import { useApp } from '../AppContext';

interface ProgressSnapshot {
  completedLessonIds: Set<string>;
  statuses: Map<string, LessonStatus>;
  todayXp: number;
  streak: number;
  isLoaded: boolean;
}

/** Live view of lesson completion, lesson unlock state, today's XP and the streak. */
export function useProgress(): ProgressSnapshot {
  const { course, units, settings } = useApp();
  const completed = useLiveQuery(() => getCompletedLessonIds(course.id), [course.id]);
  const activity = useLiveQuery<DailyActivity[]>(() => listDailyActivity(course.id), [course.id]);

  return useMemo(() => {
    const completedLessonIds = completed ?? new Set<string>();
    const activities = activity ?? [];
    const today = toLocalDateKey(new Date());
    return {
      completedLessonIds,
      statuses: computeLessonStatuses({ units, completedLessonIds, unlockAll: settings.unlockAll }),
      todayXp: activities.filter((row) => row.date === today).reduce((sum, row) => sum + row.xp, 0),
      streak: calculateStreak({ activities, dailyGoalXp: settings.dailyGoalXp, today }),
      isLoaded: completed !== undefined && activity !== undefined,
    };
  }, [completed, activity, units, settings.unlockAll, settings.dailyGoalXp]);
}
