import type { TeachExercise } from '../../domain/content/types';
import { AnswerResult } from '../../domain/grading/answerChecker';
import { CheckButton } from './CheckButton';
import type { ExerciseViewProps } from './exerciseViewProps';
import { TeachContent } from './TeachContent';

/** An explanation card with tappable audio examples. Nothing to grade. */
export function TeachView({ exercise, isLocked, onSubmit }: ExerciseViewProps<TeachExercise>) {
  return (
    <>
      <div className="exercise-body">
        <p className="exercise-kicker">New</p>
        <TeachContent exercise={exercise} isListenFirst />
      </div>
      <CheckButton
        isLocked={isLocked}
        isReady
        label="Continue"
        onCheck={() => onSubmit({ result: AnswerResult.CORRECT })}
      />
    </>
  );
}
