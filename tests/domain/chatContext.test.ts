import { describe, expect, it } from 'vitest';
import {
  buildLearnerProfile,
  findRelevantGrammarNotes,
  formatGrammarNote,
  isScenarioUnlocked,
  recentMessages,
  rolePlayConversation,
  tutorConversation,
} from '../../src/domain/ai/chatContext';
import { ChatMode, ChatRole } from '../../src/domain/ai/types';
import { CefrLevel } from '../../src/domain/content/types';
import { GERMAN_ENGLISH_PACKS, buildScenario, buildUnit } from '../fixtures';

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
