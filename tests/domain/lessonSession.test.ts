import { describe, expect, it } from 'vitest';
import {
  createLessonSession,
  currentAttemptKey,
  currentExercise,
  isSessionFinished,
  recordAnswer,
  sessionProgress,
  summarizeSession,
} from '../../src/domain/session/lessonSession';
import { buildLesson } from '../fixtures';

describe('lessonSession', () => {
  it('shows exercises in authored order', () => {
    const session = createLessonSession(buildLesson());
    expect(currentExercise(session)?.id).toBe('e1');
  });

  it('moves a wrongly answered exercise to the back of the queue', () => {
    const session = recordAnswer({ session: createLessonSession(buildLesson()), isCorrect: false });
    expect(session.queue).toEqual(['e2', 'e3', 'e1']);
    expect(session.missedIds).toEqual(['e1']);
  });

  it('changes the attempt key when an exercise is retried', () => {
    let session = createLessonSession(buildLesson({ exercises: buildLesson().exercises.slice(0, 1) }));
    const firstKey = currentAttemptKey(session);
    session = recordAnswer({ session, isCorrect: false });
    expect(currentAttemptKey(session)).not.toBe(firstKey);
  });

  it('finishes only after every exercise is answered correctly', () => {
    let session = createLessonSession(buildLesson());
    session = recordAnswer({ session, isCorrect: false });
    session = recordAnswer({ session, isCorrect: true });
    session = recordAnswer({ session, isCorrect: true });
    expect(isSessionFinished(session)).toBe(false);
    expect(sessionProgress(session)).toBeCloseTo(2 / 3);

    session = recordAnswer({ session, isCorrect: true });
    expect(isSessionFinished(session)).toBe(true);
  });

  it('summarises first-try accuracy', () => {
    let session = createLessonSession(buildLesson());
    session = recordAnswer({ session, isCorrect: false });
    for (let index = 0; index < 3; index += 1) {
      session = recordAnswer({ session, isCorrect: true });
    }
    expect(summarizeSession(session)).toEqual({ totalExercises: 3, firstTryCorrect: 2, mistakes: 1, isPerfect: false });
  });
});
