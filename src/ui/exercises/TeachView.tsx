import type { TeachExercise } from '../../domain/content/types';
import { AnswerResult } from '../../domain/grading/answerChecker';
import { RichText } from '../components/RichText';
import { Speakable } from '../components/Speakable';
import { CheckButton } from './CheckButton';
import type { ExerciseViewProps } from './exerciseViewProps';

/** An explanation card with tappable audio examples. Nothing to grade. */
export function TeachView({ exercise, isLocked, onSubmit }: ExerciseViewProps<TeachExercise>) {
  return (
    <>
      <div className="exercise-body">
        <p className="exercise-kicker">New</p>
        <h2 className="exercise-title">{exercise.title}</h2>
        <RichText source={exercise.body} />
        {exercise.examples && exercise.examples.length > 0 && (
          <ul className="example-list">
            {exercise.examples.map((example) => (
              <li key={example.text} className="example-list__item">
                <Speakable text={example.text} />
                {example.translation && <span className="example-list__translation">{example.translation}</span>}
                {example.hint && <span className="example-list__hint">{example.hint}</span>}
              </li>
            ))}
          </ul>
        )}
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
