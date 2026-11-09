import { X } from 'lucide-react';
import { DictionarySearch } from '../dictionary/DictionarySearch';

/**
 * Full-screen dictionary inside a lesson, so the learner can look a word up
 * mid-quiz. Like the lesson notes, it sits on top of the current exercise,
 * which keeps its state underneath.
 */
export function DictionarySheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="lesson-notes" role="dialog" aria-modal="true" aria-labelledby="dictionary-sheet-title">
      <div className="lesson-notes__inner">
        <header className="lesson-notes__header">
          <h1 id="dictionary-sheet-title" className="lesson-notes__title">
            Dictionary
          </h1>
          <button type="button" className="icon-button" aria-label="Close dictionary" onClick={onClose}>
            <X size={24} />
          </button>
        </header>
        <DictionarySearch autoFocus />
      </div>
    </div>
  );
}
