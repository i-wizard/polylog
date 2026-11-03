import { useMemo, useState } from 'react';
import type { WordOrderExercise } from '../../domain/content/types';
import { gradeWordOrder } from '../../domain/grading/exerciseGrading';
import { shuffle } from '../../utils/random';
import { useApp } from '../AppContext';
import { CheckButton } from './CheckButton';
import type { ExerciseViewProps } from './exerciseViewProps';

interface Tile {
  id: number;
  text: string;
}

/** Build the sentence by tapping word tiles; tap a placed tile to take it back. */
export function WordOrderView({ exercise, isLocked, onSubmit }: ExerciseViewProps<WordOrderExercise>) {
  const { packs } = useApp();
  const tiles = useMemo<Tile[]>(() => {
    const words = [...packs.target.tokenize(exercise.answer), ...(exercise.distractors ?? [])];
    return shuffle({ items: words.map((text, id) => ({ id, text })) });
  }, [exercise.answer, exercise.distractors, packs.target]);
  const [placedIds, setPlacedIds] = useState<number[]>([]);

  const placedTiles = placedIds.map((id) => tiles.find((tile) => tile.id === id) as Tile);

  const handleCheck = () => {
    onSubmit(gradeWordOrder({ exercise, tiles: placedTiles.map((tile) => tile.text), pack: packs.target }));
  };

  return (
    <>
      <div className="exercise-body">
        <p className="exercise-kicker">Build the sentence</p>
        <div className="exercise-prompt">
          <span>{exercise.translation}</span>
        </div>
        <div className="tile-answer" aria-label="Your sentence" lang={packs.target.code}>
          {placedTiles.map((tile) => (
            <button
              key={tile.id}
              type="button"
              className="tile"
              disabled={isLocked}
              onClick={() => setPlacedIds(placedIds.filter((id) => id !== tile.id))}
            >
              {tile.text}
            </button>
          ))}
        </div>
        <div className="tile-bank" lang={packs.target.code}>
          {tiles.map((tile) => {
            const isPlaced = placedIds.includes(tile.id);
            return (
              <button
                key={tile.id}
                type="button"
                className={`tile${isPlaced ? ' is-placed' : ''}`}
                disabled={isLocked || isPlaced}
                onClick={() => setPlacedIds([...placedIds, tile.id])}
              >
                {tile.text}
              </button>
            );
          })}
        </div>
      </div>
      <CheckButton isLocked={isLocked} isReady={placedIds.length > 0} onCheck={handleCheck} />
    </>
  );
}
