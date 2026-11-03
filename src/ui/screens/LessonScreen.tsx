import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { findLesson } from '../../domain/progress/pathProgress';
import type { LessonResult } from '../../domain/session/lessonSession';
import { completeLesson, type LessonCompletion } from '../../services/learning/learningService';
import { Logger } from '../../utils/logger';
import { useApp } from '../AppContext';
import { LessonPlayer } from '../lesson/LessonPlayer';
import { LessonSummary } from '../lesson/LessonSummary';

/** Route wrapper that runs a course lesson and saves the result. */
export function LessonScreen() {
  const { unitId = '', lessonId = '' } = useParams();
  const navigate = useNavigate();
  const { course, units, packs } = useApp();
  const [summary, setSummary] = useState<{ result: LessonResult; completion: LessonCompletion } | null>(null);
  const location = findLesson({ units, unitId, lessonId });

  if (!location) {
    return <div className="screen centered-message">Lesson not found.</div>;
  }

  const handleComplete = async (result: LessonResult) => {
    try {
      const completion = await completeLesson({
        courseId: course.id,
        unit: location.unit,
        lesson: location.lesson,
        result,
        targetPack: packs.target,
        now: new Date(),
      });
      setSummary({ result, completion });
    } catch (error) {
      Logger.error('Failed to save lesson completion', { lessonId, error });
      window.alert('Your progress could not be saved. Please try the lesson again.');
      navigate('/path');
    }
  };

  if (summary) {
    return (
      <LessonSummary
        result={summary.result}
        xpEarned={summary.completion.xpEarned}
        newWords={summary.completion.newWords}
        onDone={() => navigate('/')}
      />
    );
  }

  return <LessonPlayer lesson={location.lesson} onExit={() => navigate(-1)} onComplete={handleComplete} />;
}
