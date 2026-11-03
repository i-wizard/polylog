import { useMemo, useState } from 'react';
import type { ListenChooseExercise } from '../../domain/content/types';
import { gradeChoice } from '../../domain/grading/exerciseGrading';
import { shuffle } from '../../utils/random';
import { useApp } from '../AppContext';
import { CheckButton } from './CheckButton';
import { ListenButtons } from './ListenButtons';
import type { ExerciseViewProps } from './exerciseViewProps';

/** Hear a word or sentence and pick what was said — used for minimal pairs. */
export function ListenChooseView({ exercise, isLocked, onSubmit }: ExerciseViewProps<ListenChooseExercise>) {
  const { packs } = useApp();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const shuffledIndices = useMemo(
    () => shuffle({ items: exercise.options.map((_, index) => index) }),
    [exercise.options],
  );
  const spokenText = exercise.options[exercise.answerIndex];

  const handleCheck = () => {
    if (selectedIndex === null) {
      return;
    }
    onSubmit(
      gradeChoice({ selectedIndex, answerIndex: exercise.answerIndex, correctAnswer: spokenText, speakText: spokenText }),
    );
  };

  return (
    <>
      <div className="exercise-body">
        <p className="exercise-kicker">{exercise.instruction ?? 'What do you hear?'}</p>
        <ListenButtons text={spokenText} />
        <div className="option-list" lang={packs.target.code}>
          {shuffledIndices.map((index) => (
            <button
              key={index}
              type="button"
              className={`option${selectedIndex === index ? ' is-selected' : ''}`}
              disabled={isLocked}
              onClick={() => setSelectedIndex(index)}
            >
              {exercise.options[index]}
            </button>
          ))}
        </div>
      </div>
      <CheckButton isLocked={isLocked} isReady={selectedIndex !== null} onCheck={handleCheck} />
    </>
  );
}
