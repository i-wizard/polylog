import { useState } from 'react';
import type { ListenTypeExercise } from '../../domain/content/types';
import { gradeListenType } from '../../domain/grading/exerciseGrading';
import { useApp } from '../AppContext';
import { AnswerInput } from '../components/AnswerInput';
import { CheckButton } from './CheckButton';
import { ListenButtons } from './ListenButtons';
import type { ExerciseViewProps } from './exerciseViewProps';

/** Dictation: hear a sentence and type it. */
export function ListenTypeView({ exercise, isLocked, onSubmit }: ExerciseViewProps<ListenTypeExercise>) {
  const { packs } = useApp();
  const [answer, setAnswer] = useState('');

  const handleCheck = () => {
    if (answer.trim().length === 0 || isLocked) {
      return;
    }
    onSubmit(gradeListenType({ exercise, given: answer, pack: packs.target }));
  };

  return (
    <>
      <div className="exercise-body">
        <p className="exercise-kicker">Type what you hear</p>
        <ListenButtons text={exercise.text} />
        {isLocked && <p className="exercise-translation">{exercise.translation}</p>}
        <AnswerInput
          value={answer}
          onChange={setAnswer}
          onEnter={handleCheck}
          specialCharacters={packs.target.specialCharacters}
          placeholder={`Type in ${packs.target.name}`}
          disabled={isLocked}
          lang={packs.target.code}
        />
      </div>
      <CheckButton isLocked={isLocked} isReady={answer.trim().length > 0} onCheck={handleCheck} />
    </>
  );
}
