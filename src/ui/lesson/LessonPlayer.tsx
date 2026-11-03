import { X } from 'lucide-react';
import { useState } from 'react';
import type { Lesson } from '../../domain/content/types';
import { AnswerResult } from '../../domain/grading/answerChecker';
import type { AnswerOutcome } from '../../domain/grading/exerciseGrading';
import {
  createLessonSession,
  currentAttemptKey,
  currentExercise,
  isSessionFinished,
  recordAnswer,
  sessionProgress,
  summarizeSession,
  type LessonResult,
} from '../../domain/session/lessonSession';
import { stopSpeaking } from '../../services/speech/speechService';
import { FeedbackSheet } from '../components/FeedbackSheet';
import { ProgressBar } from '../components/ProgressBar';
import { ExerciseView, SELF_COMPLETING_TYPES } from '../exercises/ExerciseView';
import { useSpeaker } from '../hooks/useSpeaker';

/**
 * Runs a lesson: shows exercises one at a time, gives feedback, re-queues
 * mistakes, and reports the result when every exercise has been passed.
 * Persistence is left to the caller via `onComplete`.
 */
export function LessonPlayer({
  lesson,
  onExit,
  onComplete,
}: {
  lesson: Lesson;
  onExit: () => void;
  onComplete: (result: LessonResult) => void;
}) {
  const speakTarget = useSpeaker();
  const [session, setSession] = useState(() => createLessonSession(lesson));
  const [outcome, setOutcome] = useState<AnswerOutcome | null>(null);
  const exercise = currentExercise(session);

  const advance = (isCorrect: boolean) => {
    const nextSession = recordAnswer({ session, isCorrect });
    setSession(nextSession);
    setOutcome(null);
    if (isSessionFinished(nextSession)) {
      onComplete(summarizeSession(nextSession));
    }
  };

  const handleSubmit = (submitted: AnswerOutcome) => {
    if (exercise && SELF_COMPLETING_TYPES.has(exercise.type)) {
      advance(true);
      return;
    }
    setOutcome(submitted);
    // Speak inside the tap handler so iOS allows the audio.
    if (submitted.speakText) {
      speakTarget(submitted.speakText);
    }
  };

  const handleExit = () => {
    if (session.completedIds.length === 0 || window.confirm('Leave this lesson? Your progress in it will be lost.')) {
      stopSpeaking();
      onExit();
    }
  };

  return (
    <div className="lesson-player">
      <header className="lesson-player__header">
        <button type="button" className="icon-button" aria-label="Leave lesson" onClick={handleExit}>
          <X size={24} />
        </button>
        <ProgressBar value={sessionProgress(session)} label="Lesson progress" />
      </header>
      <main className="lesson-player__main">
        {exercise && (
          <ExerciseView
            key={currentAttemptKey(session)}
            exercise={exercise}
            isLocked={outcome !== null}
            onSubmit={handleSubmit}
          />
        )}
      </main>
      {outcome && <FeedbackSheet outcome={outcome} onContinue={() => advance(outcome.result !== AnswerResult.WRONG)} />}
    </div>
  );
}
