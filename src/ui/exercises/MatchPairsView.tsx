import { useMemo, useState } from 'react';
import type { MatchPairsExercise } from '../../domain/content/types';
import { AnswerResult } from '../../domain/grading/answerChecker';
import { shuffle } from '../../utils/random';
import { useApp } from '../AppContext';
import { useSpeaker } from '../hooks/useSpeaker';
import type { ExerciseViewProps } from './exerciseViewProps';

const WRONG_FLASH_MS = 600;

/**
 * Tap a target word, then its meaning (or the other way round). The exercise
 * completes when every pair is matched; mismatches just flash.
 */
export function MatchPairsView({ exercise, isLocked, onSubmit }: ExerciseViewProps<MatchPairsExercise>) {
  const { packs } = useApp();
  const speakTarget = useSpeaker();
  const targetOrder = useMemo(() => shuffle({ items: exercise.pairs.map((_, index) => index) }), [exercise.pairs]);
  const baseOrder = useMemo(() => shuffle({ items: exercise.pairs.map((_, index) => index) }), [exercise.pairs]);

  const [selectedTarget, setSelectedTarget] = useState<number | null>(null);
  const [selectedBase, setSelectedBase] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrongPair, setWrongPair] = useState<[number, number] | null>(null);

  const tryMatch = ({ target, base }: { target: number | null; base: number | null }) => {
    if (target === null || base === null) {
      return;
    }
    setSelectedTarget(null);
    setSelectedBase(null);
    if (target !== base) {
      setWrongPair([target, base]);
      window.setTimeout(() => setWrongPair(null), WRONG_FLASH_MS);
      return;
    }
    const nextMatched = new Set(matched).add(target);
    setMatched(nextMatched);
    if (nextMatched.size === exercise.pairs.length) {
      onSubmit({ result: AnswerResult.CORRECT });
    }
  };

  const handleTarget = (index: number) => {
    speakTarget(exercise.pairs[index].target);
    setSelectedTarget(index);
    tryMatch({ target: index, base: selectedBase });
  };

  const handleBase = (index: number) => {
    setSelectedBase(index);
    tryMatch({ target: selectedTarget, base: index });
  };

  const tileClass = ({ index, selected, side }: { index: number; selected: number | null; side: 0 | 1 }) => {
    const classes = ['option', 'option--compact'];
    if (matched.has(index)) classes.push('is-matched');
    if (selected === index) classes.push('is-selected');
    if (wrongPair && wrongPair[side] === index) classes.push('is-wrong');
    return classes.join(' ');
  };

  return (
    <div className="exercise-body">
      <p className="exercise-kicker">Match the pairs</p>
      <div className="match-grid">
        <div className="match-column">
          {targetOrder.map((index) => (
            <button
              key={index}
              type="button"
              lang={packs.target.code}
              className={tileClass({ index, selected: selectedTarget, side: 0 })}
              disabled={isLocked || matched.has(index)}
              onClick={() => handleTarget(index)}
            >
              {exercise.pairs[index].target}
            </button>
          ))}
        </div>
        <div className="match-column">
          {baseOrder.map((index) => (
            <button
              key={index}
              type="button"
              className={tileClass({ index, selected: selectedBase, side: 1 })}
              disabled={isLocked || matched.has(index)}
              onClick={() => handleBase(index)}
            >
              {exercise.pairs[index].base}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
