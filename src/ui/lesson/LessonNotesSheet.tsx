import { X } from 'lucide-react';
import type { TeachExercise } from '../../domain/content/types';
import { TeachContent } from '../exercises/TeachContent';

/**
 * Full-screen overlay with the teaching cards already read in this lesson,
 * so the learner can look something up mid-quiz without leaving the lesson.
 * It sits on top of the current exercise, which keeps its state underneath.
 */
export function LessonNotesSheet({ notes, onClose }: { notes: TeachExercise[]; onClose: () => void }) {
  return (
    <div className="lesson-notes" role="dialog" aria-modal="true" aria-labelledby="lesson-notes-title">
      <div className="lesson-notes__inner">
        <header className="lesson-notes__header">
          <h1 id="lesson-notes-title" className="lesson-notes__title">
            Lesson notes
          </h1>
          <button type="button" className="icon-button" aria-label="Close notes" onClick={onClose} autoFocus>
            <X size={24} />
          </button>
        </header>
        {notes.map((note) => (
          <section key={note.id} className="lesson-notes__card">
            <TeachContent exercise={note} />
          </section>
        ))}
        <button type="button" className="button button--primary button--block" onClick={onClose}>
          Back to the question
        </button>
      </div>
    </div>
  );
}
