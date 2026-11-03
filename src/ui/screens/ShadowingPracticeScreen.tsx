import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Unit } from '../../domain/content/types';
import { buildShadowingLesson } from '../../domain/practice/shadowingPractice';
import { completeShadowingPractice } from '../../services/learning/learningService';
import { useApp } from '../AppContext';
import { useProgress } from '../hooks/useProgress';
import { LessonPlayer } from '../lesson/LessonPlayer';

const SHADOWING_SENTENCE_COUNT = 5;

/** A short shadowing set built from sentences in lessons already completed. */
export function ShadowingPracticeScreen() {
  const { units } = useApp();
  const { completedLessonIds, isLoaded } = useProgress();

  if (!isLoaded) {
    return <div className="screen centered-message">Loading…</div>;
  }
  return <ShadowingPractice units={units} completedLessonIds={completedLessonIds} />;
}

/** Picks the sentences once on mount so re-renders never reshuffle mid-practice. */
function ShadowingPractice({ units, completedLessonIds }: { units: Unit[]; completedLessonIds: Set<string> }) {
  const navigate = useNavigate();
  const { course } = useApp();
  const [lesson] = useState(() => buildShadowingLesson({ units, completedLessonIds, count: SHADOWING_SENTENCE_COUNT }));

  if (!lesson) {
    return <div className="screen centered-message">Finish a lesson first — shadowing uses sentences you've learned.</div>;
  }

  const handleComplete = async () => {
    await completeShadowingPractice({ courseId: course.id, sentenceCount: lesson.exercises.length, now: new Date() });
    navigate('/');
  };

  return <LessonPlayer lesson={lesson} onExit={() => navigate('/')} onComplete={handleComplete} />;
}
