import { useState } from 'react';
import { LanguageRole, type TranslateExercise } from '../../domain/content/types';
import { gradeTranslate } from '../../domain/grading/exerciseGrading';
import { useApp } from '../AppContext';
import { AnswerInput } from '../components/AnswerInput';
import { Speakable } from '../components/Speakable';
import { CheckButton } from './CheckButton';
import type { ExerciseViewProps } from './exerciseViewProps';

/** Type a translation, in either direction. */
export function TranslateView({ exercise, isLocked, onSubmit }: ExerciseViewProps<TranslateExercise>) {
  const { packs } = useApp();
  const [answer, setAnswer] = useState('');
  const sourceIsTarget = exercise.sourceLanguage === LanguageRole.TARGET;
  const answerPack = sourceIsTarget ? packs.base : packs.target;

  const handleCheck = () => {
    if (answer.trim().length === 0 || isLocked) {
      return;
    }
    onSubmit(gradeTranslate({ exercise, given: answer, packs }));
  };

  return (
    <>
      <div className="exercise-body">
        <p className="exercise-kicker">Translate into {answerPack.name}</p>
        <div className="exercise-prompt">
          {sourceIsTarget ? <Speakable text={exercise.source} size="large" /> : <span>{exercise.source}</span>}
        </div>
        <AnswerInput
          value={answer}
          onChange={setAnswer}
          onEnter={handleCheck}
          specialCharacters={answerPack.specialCharacters}
          placeholder={`Type in ${answerPack.name}`}
          disabled={isLocked}
          lang={answerPack.code}
        />
      </div>
      <CheckButton isLocked={isLocked} isReady={answer.trim().length > 0} onCheck={handleCheck} />
    </>
  );
}
