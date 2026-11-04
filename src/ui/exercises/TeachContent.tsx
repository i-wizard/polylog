import type { TeachExercise } from '../../domain/content/types';
import { MouthShapeGuides } from '../components/MouthShapeGuides';
import { RichText } from '../components/RichText';
import { Speakable } from '../components/Speakable';

/**
 * The readable part of a teaching card: title, explanation, lip drawings and
 * audio examples. Shared by the lesson card itself and the lesson notes sheet.
 */
export function TeachContent({ exercise }: { exercise: TeachExercise }) {
  return (
    <>
      <h2 className="exercise-title">{exercise.title}</h2>
      <RichText source={exercise.body} />
      {exercise.mouthShapes && exercise.mouthShapes.length > 0 && <MouthShapeGuides guides={exercise.mouthShapes} />}
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
    </>
  );
}
