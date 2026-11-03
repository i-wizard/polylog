import type { Lesson, Unit } from '../content/types';

export enum LessonStatus {
  LOCKED = 'LOCKED',
  AVAILABLE = 'AVAILABLE',
  COMPLETED = 'COMPLETED',
}

export interface LessonLocation {
  unit: Unit;
  lesson: Lesson;
}

/**
 * Works out which lessons can be opened.
 *
 * The path is linear: a lesson unlocks when the lesson before it (across unit
 * boundaries) is completed. `unlockAll` opens everything, for revisiting or testing.
 */
export function computeLessonStatuses({
  units,
  completedLessonIds,
  unlockAll,
}: {
  units: Unit[];
  completedLessonIds: Set<string>;
  unlockAll: boolean;
}): Map<string, LessonStatus> {
  const statuses = new Map<string, LessonStatus>();
  let previousCompleted = true;

  for (const unit of units) {
    for (const lesson of unit.lessons) {
      const isCompleted = completedLessonIds.has(lesson.id);
      if (isCompleted) {
        statuses.set(lesson.id, LessonStatus.COMPLETED);
      } else if (previousCompleted || unlockAll) {
        statuses.set(lesson.id, LessonStatus.AVAILABLE);
      } else {
        statuses.set(lesson.id, LessonStatus.LOCKED);
      }
      previousCompleted = isCompleted;
    }
  }
  return statuses;
}

/** The first lesson that is available but not yet completed, or null when all are done. */
export function findNextLesson({
  units,
  statuses,
}: {
  units: Unit[];
  statuses: Map<string, LessonStatus>;
}): LessonLocation | null {
  for (const unit of units) {
    for (const lesson of unit.lessons) {
      if (statuses.get(lesson.id) === LessonStatus.AVAILABLE) {
        return { unit, lesson };
      }
    }
  }
  return null;
}

/** Finds a lesson by id within a set of units. */
export function findLesson({ units, unitId, lessonId }: { units: Unit[]; unitId: string; lessonId: string }): LessonLocation | null {
  const unit = units.find((candidate) => candidate.id === unitId);
  const lesson = unit?.lessons.find((candidate) => candidate.id === lessonId);
  if (!unit || !lesson) {
    return null;
  }
  return { unit, lesson };
}
