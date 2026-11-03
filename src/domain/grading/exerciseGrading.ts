import type { LanguagePack } from '../../languages/types';
import {
  LanguageRole,
  type ClozeExercise,
  type ListenTypeExercise,
  type TranslateExercise,
  type WordOrderExercise,
} from '../content/types';
import { AnswerResult, checkAnswer, type AnswerNote } from './answerChecker';

/** What the lesson player needs to show feedback and advance the session. */
export interface AnswerOutcome {
  result: AnswerResult;
  note?: AnswerNote;
  /** Model answer shown in the feedback sheet. */
  correctAnswer?: string;
  /** Target-language text played aloud after checking. */
  speakText?: string;
}

export interface CoursePacks {
  target: LanguagePack;
  base: LanguagePack;
}

/** Joins cloze parts into a readable sentence, tidying spaces before punctuation. */
export function buildClozeSentence({ exercise, answer }: { exercise: ClozeExercise; answer: string }): string {
  return `${exercise.before} ${answer} ${exercise.after}`
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Grades a tap-to-choose answer (multiple choice, listen-and-choose). */
export function gradeChoice({
  selectedIndex,
  answerIndex,
  correctAnswer,
  speakText,
}: {
  selectedIndex: number;
  answerIndex: number;
  correctAnswer: string;
  speakText?: string;
}): AnswerOutcome {
  const result = selectedIndex === answerIndex ? AnswerResult.CORRECT : AnswerResult.WRONG;
  return { result, correctAnswer, speakText };
}

/** Grades a typed translation in whichever direction the exercise asks for. */
export function gradeTranslate({
  exercise,
  given,
  packs,
}: {
  exercise: TranslateExercise;
  given: string;
  packs: CoursePacks;
}): AnswerOutcome {
  const answerIsTarget = exercise.sourceLanguage === LanguageRole.BASE;
  const answerPack = answerIsTarget ? packs.target : packs.base;
  const check = checkAnswer({ given, accepted: exercise.accepted, pack: answerPack });
  const speakText = answerIsTarget ? check.bestMatch : exercise.source;
  return { result: check.result, note: check.note, correctAnswer: check.bestMatch, speakText };
}

/** Grades a sentence built from word tiles. Order is the skill, so no typo leniency applies. */
export function gradeWordOrder({
  exercise,
  tiles,
  pack,
}: {
  exercise: WordOrderExercise;
  tiles: string[];
  pack: LanguagePack;
}): AnswerOutcome {
  const accepted = [exercise.answer, ...(exercise.alternatives ?? [])];
  const check = checkAnswer({ given: tiles.join(' '), accepted, pack, strict: true });
  return { result: check.result, note: check.note, correctAnswer: check.bestMatch, speakText: check.bestMatch };
}

/** Grades a gap fill. Always strict: gaps target articles, endings and verb forms. */
export function gradeCloze({
  exercise,
  given,
  pack,
}: {
  exercise: ClozeExercise;
  given: string;
  pack: LanguagePack;
}): AnswerOutcome {
  const check = checkAnswer({ given, accepted: exercise.accepted, pack, strict: true });
  const sentence = buildClozeSentence({ exercise, answer: check.bestMatch });
  return { result: check.result, note: check.note, correctAnswer: sentence, speakText: sentence };
}

/** Grades a dictation. */
export function gradeListenType({
  exercise,
  given,
  pack,
}: {
  exercise: ListenTypeExercise;
  given: string;
  pack: LanguagePack;
}): AnswerOutcome {
  const check = checkAnswer({ given, accepted: [exercise.text], pack });
  return { result: check.result, note: check.note, correctAnswer: exercise.text, speakText: exercise.text };
}
