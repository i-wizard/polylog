import { describe, expect, it } from 'vitest';
import {
  buildLearnerProfile,
  buildLessonContext,
  describeExercise,
  findRelevantGrammarNotes,
  formatGrammarNote,
  isScenarioUnlocked,
  recentMessages,
  rolePlayConversation,
  tutorConversation,
} from '../../src/domain/ai/chatContext';
import { ChatMode, ChatRole } from '../../src/domain/ai/types';
import { CefrLevel, ExerciseType, LanguageRole, type Exercise } from '../../src/domain/content/types';
import { GERMAN_ENGLISH_PACKS, buildLesson, buildScenario, buildTeachExercise, buildUnit } from '../fixtures';

const COURSE_ID = 'de-en';
const FIRST_LESSON_ONLY = new Set(['lesson-1']);
const WHOLE_UNIT = new Set(['lesson-1', 'lesson-2']);

describe('conversation refs', () => {
  it('gives the tutor one conversation per course', () => {
    expect(tutorConversation(COURSE_ID)).toEqual({ id: 'de-en:tutor', courseId: COURSE_ID, mode: ChatMode.TUTOR });
  });

  it('gives each role-play its own conversation', () => {
    expect(rolePlayConversation({ courseId: COURSE_ID, scenarioId: 'rp-cafe' })).toEqual({
      id: 'de-en:roleplay:rp-cafe',
      courseId: COURSE_ID,
      mode: ChatMode.ROLE_PLAY,
      scenarioId: 'rp-cafe',
    });
  });
});

describe('buildLearnerProfile', () => {
  it('lists words from completed lessons only, with articles on nouns', () => {
    const profile = buildLearnerProfile({ units: [buildUnit()], completedLessonIds: FIRST_LESSON_ONLY, packs: GERMAN_ENGLISH_PACKS });
    expect(profile).toEqual({ level: CefrLevel.A1, knownWords: ['die Frau'] });
  });

  it('knows no words before any lesson is done', () => {
    const profile = buildLearnerProfile({ units: [buildUnit()], completedLessonIds: new Set(), packs: GERMAN_ENGLISH_PACKS });
    expect(profile.knownWords).toEqual([]);
  });
});

describe('isScenarioUnlocked', () => {
  const units = [buildUnit()];
  const scenario = buildScenario();

  it('stays locked until every lesson of its unit is done', () => {
    expect(isScenarioUnlocked({ scenario, units, completedLessonIds: FIRST_LESSON_ONLY, unlockAll: false })).toBe(false);
    expect(isScenarioUnlocked({ scenario, units, completedLessonIds: WHOLE_UNIT, unlockAll: false })).toBe(true);
  });

  it('opens everything when unlockAll is set', () => {
    expect(isScenarioUnlocked({ scenario, units, completedLessonIds: new Set(), unlockAll: true })).toBe(true);
  });
});

describe('recentMessages', () => {
  it('keeps only the latest messages, oldest first', () => {
    const messages = ['a', 'b', 'c'].map((content) => ({ role: ChatRole.USER, content }));
    expect(recentMessages(messages, 2).map((message) => message.content)).toEqual(['b', 'c']);
  });
});

describe('describeExercise', () => {
  const cases: { exercise: Exercise; expected: string[] }[] = [
    {
      exercise: { id: 'mc', type: ExerciseType.MULTIPLE_CHOICE, prompt: 'Tschüss', promptLanguage: LanguageRole.TARGET, options: ['Bye', 'Hi'], optionsLanguage: LanguageRole.BASE, answerIndex: 0 },
      expected: ['Question (German): "Tschüss"', 'Correct answer: "Bye"'],
    },
    {
      exercise: { id: 'tr', type: ExerciseType.TRANSLATE, source: 'Hello', sourceLanguage: LanguageRole.BASE, accepted: ['Hallo'] },
      expected: ['from English into German', 'Correct answer: "Hallo"'],
    },
    {
      exercise: { id: 'wo', type: ExerciseType.WORD_ORDER, translation: 'My name is Anna.', answer: 'Ich heiße Anna.' },
      expected: ['"My name is Anna."', 'Correct answer: "Ich heiße Anna."'],
    },
    {
      exercise: { id: 'cl', type: ExerciseType.CLOZE, before: 'Ich', after: 'Anna.', accepted: ['heiße'], translation: 'I am called Anna.' },
      expected: ['"Ich ___ Anna."', 'Correct answer: "heiße"'],
    },
    {
      exercise: { id: 'lc', type: ExerciseType.LISTEN_CHOOSE, options: ['schon', 'schön'], answerIndex: 1 },
      expected: ['"schon", "schön"', 'Correct answer: "schön"'],
    },
    {
      exercise: { id: 'lt', type: ExerciseType.LISTEN_TYPE, text: 'Guten Tag', translation: 'Good day' },
      expected: ['hears "Guten Tag"'],
    },
    {
      exercise: { id: 'mp', type: ExerciseType.MATCH_PAIRS, pairs: [{ target: 'ja', base: 'yes' }, { target: 'nein', base: 'no' }] },
      expected: ['"ja" = "yes"', '"nein" = "no"'],
    },
    {
      exercise: { id: 'sh', type: ExerciseType.SHADOW, text: 'Guten Morgen!', translation: 'Good morning!', hint: 'Soft r' },
      expected: ['say "Guten Morgen!"', 'Tip shown: Soft r'],
    },
  ];

  for (const { exercise, expected } of cases) {
    it(`describes ${exercise.type} with its answer`, () => {
      const description = describeExercise({ exercise, packs: GERMAN_ENGLISH_PACKS, includeAnswer: true });
      for (const fragment of expected) {
        expect(description).toContain(fragment);
      }
    });
  }

  it('leaves the answer out until the learner has answered', () => {
    const exercise: Exercise = { id: 'tr', type: ExerciseType.TRANSLATE, source: 'Hello', sourceLanguage: LanguageRole.BASE, accepted: ['Hallo'] };
    const description = describeExercise({ exercise, packs: GERMAN_ENGLISH_PACKS, includeAnswer: false });
    expect(description).toContain('Translate "Hello"');
    expect(description).not.toContain('Hallo');
  });
});

describe('buildLessonContext', () => {
  it('includes notes, the current exercise and its answer once answered', () => {
    const teach = buildTeachExercise('t1');
    const lesson = buildLesson();
    const context = buildLessonContext({
      lesson,
      exercise: lesson.exercises[0],
      hasAnswered: true,
      notes: teach.type === ExerciseType.TEACH ? [teach] : [],
      packs: GERMAN_ENGLISH_PACKS,
    });
    expect(context.lessonTitle).toBe('Lesson one');
    expect(context.notes).toEqual(['Teach t1: Some explanation.']);
    expect(context.exercise).toContain('Correct answer: "Hallo"');
    expect(context.hasAnswered).toBe(true);
  });

  it('hides the answer before the learner has answered', () => {
    const lesson = buildLesson();
    const context = buildLessonContext({ lesson, exercise: lesson.exercises[0], hasAnswered: false, notes: [], packs: GERMAN_ENGLISH_PACKS });
    expect(context.exercise).not.toContain('Correct answer');
  });

  it('leaves out the exercise while a teaching card is shown', () => {
    const teach = buildTeachExercise('t1');
    const context = buildLessonContext({ lesson: buildLesson(), exercise: teach, hasAnswered: false, notes: [], packs: GERMAN_ENGLISH_PACKS });
    expect(context.exercise).toBeUndefined();
  });
});

describe('findRelevantGrammarNotes', () => {
  const accusative = { id: 'acc', title: 'The accusative: einen', body: 'Only **der** words change: *ein* becomes **einen**.', table: [['subject', 'ein Tee'], ['object', 'einen Tee']] };
  const plurals = { id: 'plural', title: 'Plurals', body: 'German nouns form the plural in several ways.' };
  const numbers = { id: 'numbers', title: 'Numbers', body: 'The tens end in -zig.' };
  const units = [buildUnit({ grammarNotes: [accusative, plurals, numbers] })];

  it('finds the note that shares distinctive words with the question', () => {
    const notes = findRelevantGrammarNotes({ question: 'Why is it "einen Tee" and not "ein Tee"?', units });
    expect(notes.map((note) => note.id)).toEqual(['acc']);
  });

  it('returns nothing when no note is relevant', () => {
    expect(findRelevantGrammarNotes({ question: 'How do I say good night?', units })).toEqual([]);
  });

  it('formats a note with its table for the prompt', () => {
    expect(formatGrammarNote(accusative)).toBe(
      'The accusative: einen: Only **der** words change: *ein* becomes **einen**.\nsubject | ein Tee\nobject | einen Tee',
    );
  });
});
