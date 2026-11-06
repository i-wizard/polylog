import { ChevronRight, Lock, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { isScenarioUnlocked } from '../../domain/ai/chatContext';
import { AiStatus } from '../../domain/ai/types';
import { listScenarios } from '../../services/content/contentRepository';
import { useApp } from '../AppContext';
import { AiStatusNotice } from '../chat/AiStatusNotice';
import { useProgress } from '../hooks/useProgress';

/** Chat tab: the tutor and the list of role-plays, which unlock unit by unit. */
export function ChatScreen() {
  const { course, units, settings, packs } = useApp();
  const { completedLessonIds } = useProgress();
  const scenarios = listScenarios(course.id);

  return (
    <div className="screen">
      <header className="screen-header">
        <h1 className="screen-title">Chat</h1>
      </header>

      {!settings.ollamaUrl && <AiStatusNotice status={AiStatus.NOT_CONFIGURED} />}

      <Link to="/chat/tutor" className="task task--primary">
        <Sparkles className="task__icon" />
        <span className="task__text">
          <span className="task__title">Ask the tutor</span>
          <span className="muted">Grammar, words, anything — in {packs.base.name} or {packs.target.name}</span>
        </span>
        <ChevronRight />
      </Link>

      <h2 className="level__title">ROLE-PLAYS</h2>
      <div className="task-list">
        {scenarios.map((scenario) => {
          const unit = units.find((candidate) => candidate.id === scenario.unitId);
          const isUnlocked = isScenarioUnlocked({ scenario, units, completedLessonIds, unlockAll: settings.unlockAll });
          if (!isUnlocked) {
            return (
              <div key={scenario.id} className="task is-locked" aria-disabled="true">
                <Lock className="task__icon" />
                <span className="task__text">
                  <span className="task__title">{scenario.title}</span>
                  <span className="muted">Finish “{unit?.title ?? scenario.unitId}” to unlock</span>
                </span>
              </div>
            );
          }
          return (
            <Link key={scenario.id} to={`/chat/roleplay/${scenario.id}`} className="task">
              <span className="task__emoji" aria-hidden>
                {scenario.icon}
              </span>
              <span className="task__text">
                <span className="task__title">{scenario.title}</span>
                <span className="muted">{scenario.goals.join(' · ')}</span>
              </span>
              <ChevronRight />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
