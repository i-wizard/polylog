import { useMemo, useState } from 'react';
import { LanguageRole, type MultipleChoiceExercise } from '../../domain/content/types';
import { gradeChoice } from '../../domain/grading/exerciseGrading';
import { shuffle } from '../../utils/random';
import { useApp } from '../AppContext';
import { Speakable } from '../components/Speakable';
import { useSpeaker } from '../hooks/useSpeaker';
import { CheckButton } from './CheckButton';
import type { ExerciseViewProps } from './exerciseViewProps';

/** Choose one option. Target-language options are spoken when tapped. */
export function MultipleChoiceView({ exercise, isLocked, onSubmit }: ExerciseViewProps<MultipleChoiceExercise>) {
  const { packs } = useApp();
  const speakTarget = useSpeaker();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const shuffledIndices = useMemo(
    () => shuffle({ items: exercise.options.map((_, index) => index) }),
    [exercise.options],
  );

  const promptIsTarget = exercise.promptLanguage === LanguageRole.TARGET;
  const optionsAreTarget = exercise.optionsLanguage === LanguageRole.TARGET;
  const instruction = exercise.instruction ?? (promptIsTarget ? 'What does this mean?' : `How do you say this in ${packs.target.name}?`);

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
    if (optionsAreTarget) {
      speakTarget(exercise.options[index]);
    }
  };

  const handleCheck = () => {
    if (selectedIndex === null) {
      return;
    }
    const correctOption = exercise.options[exercise.answerIndex];
    let speakText: string | undefined;
    if (optionsAreTarget) {
      speakText = correctOption;
    } else if (promptIsTarget) {
      speakText = exercise.prompt;
    }
    onSubmit(
      gradeChoice({ selectedIndex, answerIndex: exercise.answerIndex, correctAnswer: correctOption, speakText }),
    );
  };

  return (
    <>
      <div className="exercise-body">
        <p className="exercise-kicker">{instruction}</p>
        <div className="exercise-prompt">
          {promptIsTarget ? <Speakable text={exercise.prompt} size="large" /> : <span>{exercise.prompt}</span>}
        </div>
        <div className="option-list">
          {shuffledIndices.map((index) => (
            <button
              key={index}
              type="button"
              className={`option${selectedIndex === index ? ' is-selected' : ''}`}
              disabled={isLocked}
              lang={optionsAreTarget ? packs.target.code : packs.base.code}
              onClick={() => handleSelect(index)}
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
