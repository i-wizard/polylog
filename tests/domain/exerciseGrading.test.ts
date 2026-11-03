import { describe, expect, it } from 'vitest';
import { ExerciseType, LanguageRole, type ClozeExercise, type TranslateExercise, type WordOrderExercise } from '../../src/domain/content/types';
import { AnswerResult } from '../../src/domain/grading/answerChecker';
import { buildClozeSentence, gradeCloze, gradeTranslate, gradeWordOrder } from '../../src/domain/grading/exerciseGrading';
import { germanLanguagePack } from '../../src/languages/de';
import { englishLanguagePack } from '../../src/languages/en';

const PACKS = { target: germanLanguagePack, base: englishLanguagePack };

const WORD_ORDER: WordOrderExercise = {
  id: 'wo',
  type: ExerciseType.WORD_ORDER,
  translation: 'Today I am going home.',
  answer: 'Heute gehe ich nach Hause.',
  alternatives: ['Ich gehe heute nach Hause.'],
};

const CLOZE: ClozeExercise = {
  id: 'cl',
  type: ExerciseType.CLOZE,
  before: '',
  after: 'Sie Herr Weber?',
  accepted: ['Sind'],
  translation: 'Are you Mr Weber?',
};

const TARGET_TO_BASE: TranslateExercise = {
  id: 'tr',
  type: ExerciseType.TRANSLATE,
  source: 'Gute Nacht!',
  sourceLanguage: LanguageRole.TARGET,
  accepted: ['Good night!'],
};

describe('gradeWordOrder', () => {
  it('accepts the main answer', () => {
    const outcome = gradeWordOrder({ exercise: WORD_ORDER, tiles: ['Heute', 'gehe', 'ich', 'nach', 'Hause'], pack: germanLanguagePack });
    expect(outcome.result).toBe(AnswerResult.CORRECT);
  });

  it('accepts an alternative word order', () => {
    const outcome = gradeWordOrder({ exercise: WORD_ORDER, tiles: ['Ich', 'gehe', 'heute', 'nach', 'Hause'], pack: germanLanguagePack });
    expect(outcome.result).toBe(AnswerResult.CORRECT);
  });

  it('rejects verb-third order', () => {
    const outcome = gradeWordOrder({ exercise: WORD_ORDER, tiles: ['Heute', 'ich', 'gehe', 'nach', 'Hause'], pack: germanLanguagePack });
    expect(outcome.result).toBe(AnswerResult.WRONG);
  });
});

describe('gradeCloze', () => {
  it('builds a tidy sentence with a gap at the start', () => {
    expect(buildClozeSentence({ exercise: CLOZE, answer: 'Sind' })).toBe('Sind Sie Herr Weber?');
  });

  it('returns the full sentence to speak', () => {
    const outcome = gradeCloze({ exercise: CLOZE, given: 'Sind', pack: germanLanguagePack });
    expect(outcome.result).toBe(AnswerResult.CORRECT);
    expect(outcome.speakText).toBe('Sind Sie Herr Weber?');
  });
});

describe('gradeTranslate', () => {
  it('grades target→base answers in the base language and speaks the German source', () => {
    const outcome = gradeTranslate({ exercise: TARGET_TO_BASE, given: 'good night', packs: PACKS });
    expect(outcome.result).toBe(AnswerResult.CORRECT);
    expect(outcome.speakText).toBe('Gute Nacht!');
  });
});
