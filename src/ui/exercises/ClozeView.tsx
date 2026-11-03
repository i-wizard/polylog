import { useState } from 'react';
import type { ClozeExercise } from '../../domain/content/types';
import { gradeCloze } from '../../domain/grading/exerciseGrading';
import { useApp } from '../AppContext';
import { AnswerInput } from '../components/AnswerInput';
import { CheckButton } from './CheckButton';
import type { ExerciseViewProps } from './exerciseViewProps';

/** Fill the gap in a sentence. Graded strictly: the gap is the grammar point. */
export function ClozeView({ exercise, isLocked, onSubmit }: ExerciseViewProps<ClozeExercise>) {
  const { packs } = useApp();
  const [answer, setAnswer] = useState('');

  const handleCheck = () => {
    if (answer.trim().length === 0 || isLocked) {
      return;
    }
    onSubmit(gradeCloze({ exercise, given: answer, pack: packs.target }));
  };

  return (
    <>
      <div className="exercise-body">
        <p className="exercise-kicker">Fill the gap</p>
        <p className="cloze-sentence" lang={packs.target.code}>
          {exercise.before} <span className="cloze-gap">{answer.trim() || '____'}</span> {exercise.after}
        </p>
        <p className="exercise-translation">{exercise.translation}</p>
        {exercise.hint && <p className="exercise-hint">Hint: {exercise.hint}</p>}
        <AnswerInput
          value={answer}
          onChange={setAnswer}
          onEnter={handleCheck}
          specialCharacters={packs.target.specialCharacters}
          placeholder="Missing word"
          disabled={isLocked}
          lang={packs.target.code}
        />
      </div>
      <CheckButton isLocked={isLocked} isReady={answer.trim().length > 0} onCheck={handleCheck} />
    </>
  );
}
