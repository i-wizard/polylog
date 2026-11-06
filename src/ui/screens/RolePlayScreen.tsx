import { ChevronLeft, RotateCcw } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { isScenarioUnlocked, rolePlayConversation } from '../../domain/ai/chatContext';
import { buildRolePlaySystemPrompt } from '../../domain/ai/prompts';
import { ChatRole, type ChatMessage } from '../../domain/ai/types';
import type { Scenario } from '../../domain/content/types';
import { listScenarios } from '../../services/content/contentRepository';
import { useApp } from '../AppContext';
import { ChatPanel } from '../chat/ChatPanel';
import { Speakable } from '../components/Speakable';
import { useChat } from '../hooks/useChat';
import { useLearnerProfile } from '../hooks/useLearnerProfile';
import { useSentenceActions } from '../hooks/useSentenceActions';
import { useProgress } from '../hooks/useProgress';

/** A role-play conversation with an AI character, chosen from the Chat tab. */
export function RolePlayScreen() {
  const { scenarioId } = useParams();
  const { course, units, settings } = useApp();
  const { completedLessonIds, isLoaded } = useProgress();
  const scenario = listScenarios(course.id).find((candidate) => candidate.id === scenarioId);

  if (!isLoaded) {
    return <div className="screen centered-message">Loading…</div>;
  }
  if (!scenario) {
    return <div className="screen centered-message">This role-play doesn't exist.</div>;
  }
  if (!isScenarioUnlocked({ scenario, units, completedLessonIds, unlockAll: settings.unlockAll })) {
    return <div className="screen centered-message">Finish its unit first to unlock this role-play.</div>;
  }
  return <RolePlay scenario={scenario} />;
}

function RolePlay({ scenario }: { scenario: Scenario }) {
  const navigate = useNavigate();
  const { course, packs } = useApp();
  const profile = useLearnerProfile();
  const conversation = useMemo(
    () => rolePlayConversation({ courseId: course.id, scenarioId: scenario.id }),
    [course.id, scenario.id],
  );
  const systemPrompt = useMemo(() => buildRolePlaySystemPrompt({ packs, profile, scenario }), [packs, profile, scenario]);
  const leadingMessages = useMemo<ChatMessage[]>(
    () => [{ role: ChatRole.ASSISTANT, content: scenario.opening.text }],
    [scenario.opening.text],
  );
  const chat = useChat({ conversation, systemPrompt, leadingMessages });

  const actions = useSentenceActions();

  const handleRestart = () => {
    if (window.confirm('Start this conversation again from the beginning?')) {
      chat.restart();
    }
  };

  return (
    <div className="chat-screen">
      <header className="chat-screen__header">
        <button type="button" className="icon-button" aria-label="Back to Chat" onClick={() => navigate('/chat')}>
          <ChevronLeft size={26} />
        </button>
        <h1 className="chat-screen__title">
          {scenario.icon} {scenario.title}
        </h1>
        <button
          type="button"
          className="icon-button icon-button--subtle"
          aria-label="Restart conversation"
          disabled={chat.messages.length <= leadingMessages.length}
          onClick={handleRestart}
        >
          <RotateCcw size={20} />
        </button>
      </header>
      <ChatPanel
        chat={chat}
        placeholder={`Reply in ${packs.target.name}…`}
        isTargetLanguage
        actions={actions}
        intro={<ScenarioBrief scenario={scenario} />}
      />
    </div>
  );
}

function ScenarioBrief({ scenario }: { scenario: Scenario }) {
  return (
    <details className="card scenario-brief">
      <summary>
        <strong>Your goals</strong> · {scenario.goals.length} things to do
      </summary>
      <p className="muted small">{scenario.setting}</p>
      <ul className="scenario-brief__goals">
        {scenario.goals.map((goal) => (
          <li key={goal}>{goal}</li>
        ))}
      </ul>
      <h2 className="card__subtitle">Useful phrases</h2>
      <ul className="example-list">
        {scenario.usefulPhrases.map((phrase) => (
          <li key={phrase.text} className="example-list__item">
            <Speakable text={phrase.text} />
            <span className="example-list__translation">{phrase.translation}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
