import type { TeachExercise } from '../../domain/content/types';
import { ListenFirstPrompt } from '../components/ListenFirstPrompt';
import { MouthShapeGuides } from '../components/MouthShapeGuides';
import { RichText } from '../components/RichText';
import { Speakable } from '../components/Speakable';

/**
 * The readable part of a teaching card: title, explanation, lip drawings and
 * audio examples. Shared by the lesson card itself and the lesson notes sheet.
 *
 * With `isListenFirst`, the examples follow the "Listen first" setting so the
 * learner hears new words before reading them; the notes sheet, used for
 * looking things up, always shows them.
 */
export function TeachContent({ exercise, isListenFirst = false }: { exercise: TeachExercise; isListenFirst?: boolean }) {
  return (
    <>
      <h2 className="exercise-title">{exercise.title}</h2>
      <RichText source={exercise.body} />
      {exercise.mouthShapes && exercise.mouthShapes.length > 0 && <MouthShapeGuides guides={exercise.mouthShapes} />}
      {exercise.examples && exercise.examples.length > 0 && (
        <ul className="example-list">
          {exercise.examples.map((example) => (
            <li key={example.text} className="example-list__item">
              {isListenFirst ? (
                <ListenFirstPrompt text={example.text} isLocked={false} size="normal" />
              ) : (
                <Speakable text={example.text} />
              )}
              {example.translation && <span className="example-list__translation">{example.translation}</span>}
              {example.hint && <span className="example-list__hint">{example.hint}</span>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
