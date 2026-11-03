import {
  CefrLevel,
  ExerciseType,
  LanguageRole,
  LessonKind,
  PartOfSpeech,
  type Course,
  type Exercise,
  type Lesson,
  type Unit,
  type VocabItem,
} from '../../src/domain/content/types';

/** A feminine noun, so gender cards are created for it. */
export function buildNounVocab(overrides: Partial<VocabItem> = {}): VocabItem {
  return {
    id: 'frau',
    text: 'Frau',
    translations: ['woman'],
    partOfSpeech: PartOfSpeech.NOUN,
    gender: 'f',
    plural: 'Frauen',
    example: { text: 'Die Frau heißt Anna.', translation: 'The woman is called Anna.' },
    ...overrides,
  };
}

export function buildPhraseVocab(overrides: Partial<VocabItem> = {}): VocabItem {
  return {
    id: 'hallo',
    text: 'Hallo',
    translations: ['Hello'],
    partOfSpeech: PartOfSpeech.INTERJECTION,
    ...overrides,
  };
}

export function buildTranslateExercise(id: string): Exercise {
  return {
    id,
    type: ExerciseType.TRANSLATE,
    source: 'Hello',
    sourceLanguage: LanguageRole.BASE,
    accepted: ['Hallo'],
  };
}

export function buildShadowExercise(id: string): Exercise {
  return { id, type: ExerciseType.SHADOW, text: 'Guten Morgen!', translation: 'Good morning!' };
}

export function buildLesson(overrides: Partial<Lesson> = {}): Lesson {
  return {
    id: 'lesson-1',
    title: 'Lesson one',
    kind: LessonKind.LEARN,
    introduces: [],
    exercises: [buildTranslateExercise('e1'), buildTranslateExercise('e2'), buildTranslateExercise('e3')],
    ...overrides,
  };
}

/** A two-lesson unit whose lessons introduce one vocab item each. */
export function buildUnit(overrides: Partial<Unit> = {}): Unit {
  return {
    id: 'unit-1',
    level: CefrLevel.A1,
    title: 'Unit one',
    description: 'Test unit',
    icon: '🧪',
    vocab: [buildNounVocab(), buildPhraseVocab()],
    grammarNotes: [],
    lessons: [
      buildLesson({ id: 'lesson-1', introduces: ['frau'], exercises: [buildShadowExercise('l1-e1')] }),
      buildLesson({ id: 'lesson-2', introduces: ['hallo'], exercises: [buildTranslateExercise('l2-e1')] }),
    ],
    ...overrides,
  };
}

export function buildCourse(overrides: Partial<Course> = {}): Course {
  return {
    id: 'test-course',
    targetLanguage: 'de',
    baseLanguage: 'en',
    title: 'Test course',
    description: 'For tests',
    greetings: { morning: 'Guten Morgen!', afternoon: 'Guten Tag!', evening: 'Guten Abend!' },
    levels: [{ level: CefrLevel.A1, unitIds: ['unit-1'] }],
    ...overrides,
  };
}
