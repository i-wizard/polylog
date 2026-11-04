import { describe, expect, it } from 'vitest';
import { ExerciseType, MouthShape, PartOfSpeech } from '../../src/domain/content/types';
import { validateCourse } from '../../src/domain/content/validateCourse';
import { getLanguagePack } from '../../src/languages/registry';
import { germanLanguagePack } from '../../src/languages/de';
import { listCourses, listUnitFileIds, loadCourseUnits } from '../../src/services/content/contentRepository';
import { buildCourse, buildUnit } from '../fixtures';

const FIXTURE_UNIT_FILES = ['unit-1'];

describe('bundled course content', () => {
  const courses = listCourses();

  it('includes at least one course', () => {
    expect(courses.length).toBeGreaterThan(0);
  });

  for (const course of courses) {
    it(`${course.id} passes validation`, async () => {
      const units = await loadCourseUnits(course);
      const problems = validateCourse({
        course,
        units,
        unitFileIds: listUnitFileIds(course.id),
        targetPack: getLanguagePack(course.targetLanguage),
      });
      expect(problems).toEqual([]);
    });
  }
});

describe('validateCourse', () => {
  it('accepts a valid fixture course', () => {
    const problems = validateCourse({
      course: buildCourse(),
      units: [buildUnit()],
      unitFileIds: FIXTURE_UNIT_FILES,
      targetPack: germanLanguagePack,
    });
    expect(problems).toEqual([]);
  });

  it('reports unlisted and missing unit files', () => {
    const problems = validateCourse({
      course: buildCourse(),
      units: [buildUnit()],
      unitFileIds: ['unit-2'],
      targetPack: germanLanguagePack,
    });
    expect(problems).toContain('course.json lists unit "unit-1" but no file exists');
    expect(problems).toContain('unit file "unit-2" is not listed in course.json');
  });

  it('reports nouns without a gender and vocab never introduced', () => {
    const unit = buildUnit();
    unit.vocab.push({ id: 'tisch', text: 'Tisch', translations: ['table'], partOfSpeech: PartOfSpeech.NOUN });
    const problems = validateCourse({ course: buildCourse(), units: [unit], unitFileIds: FIXTURE_UNIT_FILES, targetPack: germanLanguagePack });
    expect(problems).toContain('unit-1/tisch: noun without gender');
    expect(problems).toContain('unit-1/tisch: introduced by 0 lessons (expected exactly 1)');
  });

  it('reports a word-order distractor that is part of the answer', () => {
    const unit = buildUnit();
    unit.lessons[0].exercises.push({
      id: 'wo-bad',
      type: ExerciseType.WORD_ORDER,
      translation: 'My name is Anna.',
      answer: 'Ich heiße Anna.',
      distractors: ['Anna'],
    });
    const problems = validateCourse({ course: buildCourse(), units: [unit], unitFileIds: FIXTURE_UNIT_FILES, targetPack: germanLanguagePack });
    expect(problems).toContain('lesson-1/wo-bad: distractor "Anna" is also in the answer');
  });

  it('reports an out-of-range answer index', () => {
    const unit = buildUnit();
    unit.lessons[0].exercises.push({
      id: 'mc-bad',
      type: ExerciseType.LISTEN_CHOOSE,
      options: ['schon', 'schön'],
      answerIndex: 2,
    });
    const problems = validateCourse({ course: buildCourse(), units: [unit], unitFileIds: FIXTURE_UNIT_FILES, targetPack: germanLanguagePack });
    expect(problems).toContain('lesson-1/mc-bad: answerIndex out of range');
  });

  it('reports an unknown mouth shape', () => {
    const unit = buildUnit();
    unit.lessons[0].exercises.push({
      id: 'teach-bad',
      type: ExerciseType.TEACH,
      title: 'Umlauts',
      body: 'Round your lips.',
      mouthShapes: [
        { shape: MouthShape.TIGHT_ROUNDED, label: 'ü', caption: 'Tight circle' },
        { shape: 'POUT' as MouthShape, label: 'ö', caption: 'Typo in the shape name' },
      ],
    });
    const problems = validateCourse({ course: buildCourse(), units: [unit], unitFileIds: FIXTURE_UNIT_FILES, targetPack: germanLanguagePack });
    expect(problems).toEqual(['lesson-1/teach-bad: unknown mouth shape "POUT"']);
  });
});
