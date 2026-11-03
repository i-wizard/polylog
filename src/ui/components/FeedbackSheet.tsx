import { AnswerNote, AnswerResult } from '../../domain/grading/answerChecker';
import type { AnswerOutcome } from '../../domain/grading/exerciseGrading';
import { Speakable } from './Speakable';

const RESULT_TITLE: Record<AnswerResult, string> = {
  [AnswerResult.CORRECT]: 'Richtig! Correct',
  [AnswerResult.ALMOST]: 'Almost — accepted',
  [AnswerResult.WRONG]: 'Not quite',
};

const NOTE_TEXT: Record<AnswerNote, string> = {
  [AnswerNote.CAPITALIZATION]: 'Watch the capitals: every German noun starts with a capital letter.',
  [AnswerNote.SPECIAL_CHARACTER]: 'Use the special letters (ä, ö, ü, ß) rather than ae, oe, ue, ss.',
  [AnswerNote.TYPO]: 'Small typo — check the spelling below.',
};

/**
 * Bottom sheet shown after an answer is checked: verdict, model answer with
 * audio, an explanatory note, and the Continue button.
 */
export function FeedbackSheet({ outcome, onContinue }: { outcome: AnswerOutcome; onContinue: () => void }) {
  const showAnswer = outcome.correctAnswer && outcome.result !== AnswerResult.CORRECT;

  return (
    <div className={`feedback-sheet feedback-sheet--${outcome.result.toLowerCase()}`} role="status">
      <p className="feedback-sheet__title">{RESULT_TITLE[outcome.result]}</p>
      {outcome.note && <p className="feedback-sheet__note">{NOTE_TEXT[outcome.note]}</p>}
      {showAnswer && (
        <div className="feedback-sheet__answer">
          <span className="feedback-sheet__label">Correct answer</span>
          {outcome.speakText === outcome.correctAnswer && outcome.speakText ? (
            <Speakable text={outcome.speakText} />
          ) : (
            <span>{outcome.correctAnswer}</span>
          )}
        </div>
      )}
      <button type="button" className="button button--primary button--block" onClick={onContinue} autoFocus>
        Continue
      </button>
    </div>
  );
}
