import { Check, ChevronRight, Lock, NotebookText } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Unit } from '../../domain/content/types';
import { LessonStatus } from '../../domain/progress/pathProgress';
import { useApp } from '../AppContext';
import { useProgress } from '../hooks/useProgress';

/** The course path: CEFR levels, their units, and each unit's lessons. */
export function PathScreen() {
  const { course, units } = useApp();
  const { statuses } = useProgress();
  const unitsById = new Map(units.map((unit) => [unit.id, unit]));

  return (
    <div className="screen">
      <header className="screen-header">
        <h1 className="screen-title">Path</h1>
      </header>
      {course.levels.map((level) => (
        <section key={level.level} className="level">
          <h2 className="level__title">{level.level}</h2>
          {level.unitIds.length === 0 && <p className="muted">Coming soon.</p>}
          {level.unitIds
            .map((unitId) => unitsById.get(unitId))
            .filter((unit): unit is Unit => unit !== undefined)
            .map((unit) => (
              <UnitCard key={unit.id} unit={unit} statuses={statuses} />
            ))}
        </section>
      ))}
    </div>
  );
}

function UnitCard({ unit, statuses }: { unit: Unit; statuses: Map<string, LessonStatus> }) {
  const completedCount = unit.lessons.filter((lesson) => statuses.get(lesson.id) === LessonStatus.COMPLETED).length;

  return (
    <article className="card unit-card">
      <header className="unit-card__header">
        <span className="unit-card__icon" aria-hidden>
          {unit.icon}
        </span>
        <div className="unit-card__heading">
          <h3 className="card__title">{unit.title}</h3>
          <p className="muted">{unit.description}</p>
        </div>
      </header>
      <p className="muted unit-card__count">
        {completedCount} / {unit.lessons.length} lessons
      </p>
      <ol className="lesson-list">
        {unit.lessons.map((lesson) => {
          const status = statuses.get(lesson.id) ?? LessonStatus.LOCKED;
          if (status === LessonStatus.LOCKED) {
            return (
              <li key={lesson.id} className="lesson-row is-locked">
                <Lock size={18} aria-label="Locked" />
                <span>{lesson.title}</span>
              </li>
            );
          }
          return (
            <li key={lesson.id}>
              <Link to={`/lesson/${unit.id}/${lesson.id}`} className={`lesson-row is-${status.toLowerCase()}`}>
                {status === LessonStatus.COMPLETED ? (
                  <Check size={18} aria-label="Completed" />
                ) : (
                  <span className="lesson-row__dot" />
                )}
                <span>{lesson.title}</span>
                <ChevronRight size={18} className="lesson-row__chevron" />
              </Link>
            </li>
          );
        })}
      </ol>
      {unit.grammarNotes.length > 0 && (
        <Link to={`/unit/${unit.id}/notes`} className="button button--secondary button--small">
          <NotebookText size={16} /> Notes & grammar
        </Link>
      )}
    </article>
  );
}
