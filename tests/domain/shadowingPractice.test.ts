import { describe, expect, it } from 'vitest';
import { ExerciseType } from '../../src/domain/content/types';
import { buildShadowingLesson } from '../../src/domain/practice/shadowingPractice';
import { buildUnit } from '../fixtures';

const FIXED_RANDOM = () => 0;

describe('buildShadowingLesson', () => {
  it('returns null before any lesson is completed', () => {
    expect(buildShadowingLesson({ units: [buildUnit()], completedLessonIds: new Set(), count: 5 })).toBeNull();
  });

  it('uses sentences only from completed lessons, including vocab examples', () => {
    const lesson = buildShadowingLesson({
      units: [buildUnit()],
      completedLessonIds: new Set(['lesson-1']),
      count: 5,
      random: FIXED_RANDOM,
    });

    const texts = lesson?.exercises.map((exercise) => (exercise.type === ExerciseType.SHADOW ? exercise.text : ''));
    expect(texts?.sort()).toEqual(['Die Frau heißt Anna.', 'Guten Morgen!']);
    expect(lesson?.exercises.every((exercise) => exercise.type === ExerciseType.SHADOW)).toBe(true);
  });

  it('limits the number of sentences', () => {
    const lesson = buildShadowingLesson({
      units: [buildUnit()],
      completedLessonIds: new Set(['lesson-1']),
      count: 1,
      random: FIXED_RANDOM,
    });
    expect(lesson?.exercises).toHaveLength(1);
  });
});
