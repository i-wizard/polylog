import { Trash2 } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { tutorConversation } from '../../domain/ai/chatContext';
import { buildTutorSystemPrompt } from '../../domain/ai/prompts';
import { useApp } from '../AppContext';
import { useChat } from '../hooks/useChat';
import { useLearnerProfile } from '../hooks/useLearnerProfile';
import { useSentenceActions } from '../hooks/useSentenceActions';
import { ChatPanel } from './ChatPanel';

/** The tutor conversation with its header, shown from the Chat tab. */
export function TutorChat({
  closeButton,
}: {
  /** Back or close button for the header, supplied by the surrounding screen or sheet. */
  closeButton: ReactNode;
}) {
  const { course, packs, units } = useApp();
  const profile = useLearnerProfile();
  const conversation = useMemo(() => tutorConversation(course.id), [course.id]);
  const systemPrompt = useMemo(() => buildTutorSystemPrompt({ packs, profile }), [packs, profile]);
  const chat = useChat({ conversation, systemPrompt, referenceUnits: units });
  const actions = useSentenceActions();

  const handleClear = () => {
    if (window.confirm('Clear the whole tutor conversation?')) {
      chat.restart();
    }
  };

  return (
    <div className="chat-screen">
      <header className="chat-screen__header">
        {closeButton}
        <h1 className="chat-screen__title">Ask the tutor</h1>
        <button
          type="button"
          className="icon-button icon-button--subtle"
          aria-label="Clear conversation"
          disabled={chat.messages.length === 0}
          onClick={handleClear}
        >
          <Trash2 size={20} />
        </button>
      </header>
      <ChatPanel
        chat={chat}
        placeholder={`Ask in ${packs.base.name} or ${packs.target.name}…`}
        isTargetLanguage={false}
        actions={{ check: actions.check }}
        intro={
          chat.messages.length === 0 && (
            <p className="muted chat-intro">
              Ask anything about {packs.target.name}: grammar, words, how to say something, or just chat in{' '}
              {packs.target.name}.
            </p>
          )
        }
      />
    </div>
  );
}
