import { ChevronRight, Flame, Layers, Mic, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CourseGreetings } from '../../domain/content/types';
import { findNextLesson } from '../../domain/progress/pathProgress';
import { useApp } from '../AppContext';
import { ProgressBar } from '../components/ProgressBar';
import { useDueCount } from '../hooks/useDueCount';
import { useProgress } from '../hooks/useProgress';

const BACKUP_REMINDER_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

function greetingFor({ greetings, hour }: { greetings: CourseGreetings; hour: number }): string {
  if (hour < 11) return greetings.morning;
  if (hour < 18) return greetings.afternoon;
  return greetings.evening;
}

/** iOS keeps data of home-screen apps much more reliably than of Safari tabs. */
function isRunningAsInstalledApp(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia('(display-mode: standalone)').matches;
}

/** Home tab: today's plan (review, next lesson, shadowing), goal and streak. */
export function TodayScreen() {
  const { course, units, settings } = useApp();
  const { statuses, completedLessonIds, todayXp, streak } = useProgress();
  const dueCount = useDueCount();
  const nextLesson = findNextLesson({ units, statuses });
  const hasProgress = completedLessonIds.size > 0;
  const needsBackup =
    hasProgress && (!settings.lastExportAt || Date.now() - settings.lastExportAt > BACKUP_REMINDER_DAYS * DAY_MS);

  return (
    <div className="screen">
      <header className="screen-header">
        <div>
          <h1 className="screen-title">{greetingFor({ greetings: course.greetings, hour: new Date().getHours() })}</h1>
          <p className="muted">{course.title}</p>
        </div>
        <div className="streak" aria-label={`${streak} day streak`}>
          <Flame size={20} />
          <span>{streak}</span>
        </div>
      </header>

      {!isRunningAsInstalledApp() && (
        <section className="card card--tip">
          <p>
            <strong>Install the app:</strong> in Safari tap Share → <em>Add to Home Screen</em>. It then works offline
            and your progress is kept safely.
          </p>
        </section>
      )}

      <section className="card">
        <div className="card__row">
          <h2 className="card__title">Daily goal</h2>
          <span className="muted">
            {Math.min(todayXp, settings.dailyGoalXp)} / {settings.dailyGoalXp} XP
          </span>
        </div>
        <ProgressBar value={todayXp / settings.dailyGoalXp} label="Daily goal progress" />
      </section>

      <nav className="task-list" aria-label="Today's tasks">
        <Link to="/review" className="task">
          <Layers className="task__icon" />
          <span className="task__text">
            <span className="task__title">Review</span>
            <span className="muted">{dueCount === undefined ? '…' : `${dueCount} cards due`}</span>
          </span>
          <ChevronRight />
        </Link>

        {nextLesson ? (
          <Link to={`/lesson/${nextLesson.unit.id}/${nextLesson.lesson.id}`} className="task task--primary">
            <BookOpen className="task__icon" />
            <span className="task__text">
              <span className="task__title">Next lesson</span>
              <span>
                {nextLesson.unit.title} · {nextLesson.lesson.title}
              </span>
            </span>
            <ChevronRight />
          </Link>
        ) : (
          <div className="task">
            <BookOpen className="task__icon" />
            <span className="task__text">
              <span className="task__title">All lessons done</span>
              <span className="muted">New units are on the way.</span>
            </span>
          </div>
        )}

        {hasProgress && (
          <Link to="/practice/shadowing" className="task">
            <Mic className="task__icon" />
            <span className="task__text">
              <span className="task__title">Shadowing</span>
              <span className="muted">Say 5 sentences you've learned</span>
            </span>
            <ChevronRight />
          </Link>
        )}
      </nav>

      {needsBackup && (
        <section className="card card--tip">
          <p>
            It's been a while since your last backup. <Link to="/settings">Export your progress</Link> so it can't be lost.
          </p>
        </section>
      )}
    </div>
  );
}
