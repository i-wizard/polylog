import { ExerciseType, type Exercise, type Lesson, type TeachExercise } from '../content/types';

/**
 * Immutable state of one run through a lesson.
 *
 * Exercises answered wrongly are pushed to the back of the queue, so a lesson
 * only finishes once every exercise has been answered correctly once.
 */
export interface LessonSession {
  exercisesById: Record<string, Exercise>;
  queue: string[];
  totalExercises: number;
  completedIds: string[];
  /** Exercise ids answered wrongly at least once. */
  missedIds: string[];
  /** How many times each exercise has been shown; used to reset exercise UI on retries. */
  attempts: Record<string, number>;
}

export interface LessonResult {
  totalExercises: number;
  firstTryCorrect: number;
  mistakes: number;
  isPerfect: boolean;
}

/** Starts a session that will show the lesson's exercises in authored order. */
export function createLessonSession(lesson: Lesson): LessonSession {
  const exercisesById: Record<string, Exercise> = {};
  for (const exercise of lesson.exercises) {
    exercisesById[exercise.id] = exercise;
  }
  const queue = lesson.exercises.map((exercise) => exercise.id);
  return {
    exercisesById,
    queue,
    totalExercises: queue.length,
    completedIds: [],
    missedIds: [],
    attempts: {},
  };
}

/** The exercise to show now, or null when the lesson is finished. */
export function currentExercise(session: LessonSession): Exercise | null {
  const exerciseId = session.queue[0];
  if (exerciseId === undefined) {
    return null;
  }
  return session.exercisesById[exerciseId];
}

/** A key that changes every time an exercise is shown, so its UI state resets on retry. */
export function currentAttemptKey(session: LessonSession): string {
  const exerciseId = session.queue[0] ?? 'done';
  return `${exerciseId}#${session.attempts[exerciseId] ?? 0}`;
}

/** Records the answer to the current exercise and moves the queue forward. */
export function recordAnswer({ session, isCorrect }: { session: LessonSession; isCorrect: boolean }): LessonSession {
  const [exerciseId, ...rest] = session.queue;
  if (exerciseId === undefined) {
    return session;
  }

  const attempts = { ...session.attempts, [exerciseId]: (session.attempts[exerciseId] ?? 0) + 1 };

  if (isCorrect) {
    return {
      ...session,
      queue: rest,
      completedIds: [...session.completedIds, exerciseId],
      attempts,
    };
  }

  const missedIds = session.missedIds.includes(exerciseId) ? session.missedIds : [...session.missedIds, exerciseId];
  return {
    ...session,
    queue: [...rest, exerciseId],
    missedIds,
    attempts,
  };
}

/**
 * Teaching cards the learner has already read in this session, in the order
 * they were shown. Lets the learner look back at them while answering questions.
 */
export function seenTeachExercises(session: LessonSession): TeachExercise[] {
  const seen: TeachExercise[] = [];
  for (const exerciseId of session.completedIds) {
    const exercise = session.exercisesById[exerciseId];
    if (exercise.type === ExerciseType.TEACH) {
      seen.push(exercise);
    }
  }
  return seen;
}

export function isSessionFinished(session: LessonSession): boolean {
  return session.queue.length === 0;
}

/** Fraction of exercises completed, from 0 to 1. */
export function sessionProgress(session: LessonSession): number {
  if (session.totalExercises === 0) {
    return 1;
  }
  return session.completedIds.length / session.totalExercises;
}

/** Summarises a finished session for the summary screen and XP calculation. */
export function summarizeSession(session: LessonSession): LessonResult {
  const mistakes = session.missedIds.length;
  return {
    totalExercises: session.totalExercises,
    firstTryCorrect: session.totalExercises - mistakes,
    mistakes,
    isPerfect: mistakes === 0,
  };
}
