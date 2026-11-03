import { describe, expect, it } from 'vitest';
import { AnswerNote, AnswerResult, checkAnswer, normalizeAnswer } from '../../src/domain/grading/answerChecker';
import { germanLanguagePack } from '../../src/languages/de';
import { englishLanguagePack } from '../../src/languages/en';

const GERMAN_SENTENCE = 'Ich heiße Anna.';
const ENGLISH_SENTENCE = 'My name is Anna.';

describe('normalizeAnswer', () => {
  it('drops punctuation and collapses whitespace', () => {
    expect(normalizeAnswer('  Hallo ,   Anna! ')).toBe('Hallo Anna');
  });

  it('unifies curly apostrophes', () => {
    expect(normalizeAnswer('I’m Tom')).toBe("I'm Tom");
  });
});

describe('checkAnswer', () => {
  it('accepts an exact answer ignoring punctuation', () => {
    const check = checkAnswer({ given: 'Ich heiße Anna', accepted: [GERMAN_SENTENCE], pack: germanLanguagePack });
    expect(check.result).toBe(AnswerResult.CORRECT);
    expect(check.bestMatch).toBe(GERMAN_SENTENCE);
  });

  it('flags capitalisation mistakes in German', () => {
    const check = checkAnswer({ given: 'ich heiße anna', accepted: [GERMAN_SENTENCE], pack: germanLanguagePack });
    expect(check.result).toBe(AnswerResult.ALMOST);
    expect(check.note).toBe(AnswerNote.CAPITALIZATION);
  });

  it('ignores capitalisation in English', () => {
    const check = checkAnswer({ given: 'my name is anna', accepted: [ENGLISH_SENTENCE], pack: englishLanguagePack });
    expect(check.result).toBe(AnswerResult.CORRECT);
  });

  it('flags ss typed instead of ß', () => {
    const check = checkAnswer({ given: 'Ich heisse Anna', accepted: [GERMAN_SENTENCE], pack: germanLanguagePack });
    expect(check.result).toBe(AnswerResult.ALMOST);
    expect(check.note).toBe(AnswerNote.SPECIAL_CHARACTER);
  });

  it('flags ue typed instead of ü', () => {
    const check = checkAnswer({ given: 'Tschuess', accepted: ['Tschüss'], pack: germanLanguagePack });
    expect(check.note).toBe(AnswerNote.SPECIAL_CHARACTER);
  });

  it('tolerates a one-letter typo inside a long word', () => {
    const check = checkAnswer({ given: 'Auf Wiedrsehen', accepted: ['Auf Wiedersehen'], pack: germanLanguagePack });
    expect(check.result).toBe(AnswerResult.ALMOST);
    expect(check.note).toBe(AnswerNote.TYPO);
  });

  it('treats an edit in the last two letters as a mistake, since German inflects there', () => {
    const check = checkAnswer({ given: 'Auf Wiedersehn', accepted: ['Auf Wiedersehen'], pack: germanLanguagePack });
    expect(check.result).toBe(AnswerResult.WRONG);
  });

  it('rejects a wrong verb ending even though it is one letter off', () => {
    const check = checkAnswer({ given: 'Ich heißt Anna', accepted: [GERMAN_SENTENCE], pack: germanLanguagePack });
    expect(check.result).toBe(AnswerResult.WRONG);
  });

  it('rejects swapped possessives (mein/dein)', () => {
    const check = checkAnswer({ given: 'dein Name', accepted: ['mein Name'], pack: germanLanguagePack });
    expect(check.result).toBe(AnswerResult.WRONG);
  });

  it('rejects a wrong short article', () => {
    const check = checkAnswer({ given: 'den Mann', accepted: ['dem Mann'], pack: germanLanguagePack });
    expect(check.result).toBe(AnswerResult.WRONG);
  });

  it('does not tolerate typos when strict', () => {
    const check = checkAnswer({ given: 'Wiedersehn', accepted: ['Wiedersehen'], pack: germanLanguagePack, strict: true });
    expect(check.result).toBe(AnswerResult.WRONG);
  });

  it('matches any accepted alternative', () => {
    const check = checkAnswer({
      given: 'Mein Name ist Tom',
      accepted: ['Ich heiße Tom.', 'Mein Name ist Tom.'],
      pack: germanLanguagePack,
    });
    expect(check.result).toBe(AnswerResult.CORRECT);
    expect(check.bestMatch).toBe('Mein Name ist Tom.');
  });

  it('shows the closest accepted answer when wrong', () => {
    const check = checkAnswer({
      given: 'Mein Name Tom',
      accepted: ['Ich heiße Tom.', 'Mein Name ist Tom.'],
      pack: germanLanguagePack,
    });
    expect(check.result).toBe(AnswerResult.WRONG);
    expect(check.bestMatch).toBe('Mein Name ist Tom.');
  });
});
