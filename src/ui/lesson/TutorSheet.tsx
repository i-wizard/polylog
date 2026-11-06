import { X } from 'lucide-react';
import type { LessonContext } from '../../domain/ai/types';
import { TutorChat } from '../chat/TutorChat';

/**
 * The tutor as a full-screen overlay inside a lesson. Like the lesson notes,
 * it sits on top of the current exercise, which keeps its state underneath.
 */
export function TutorSheet({ lessonContext, onClose }: { lessonContext: LessonContext; onClose: () => void }) {
  return (
    <div className="chat-overlay" role="dialog" aria-modal="true" aria-label="Ask the tutor">
      <TutorChat
        lessonContext={lessonContext}
        closeButton={
          <button type="button" className="icon-button" aria-label="Back to the lesson" onClick={onClose}>
            <X size={24} />
          </button>
        }
      />
    </div>
  );
}
