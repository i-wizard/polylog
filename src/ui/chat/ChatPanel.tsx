import { useEffect, useRef, type ReactNode } from 'react';
import { AiStatus, ChatRole, type ChatMessage } from '../../domain/ai/types';
import { useAiStatus } from '../hooks/useAiStatus';
import type { ChatState } from '../hooks/useChat';
import { AiStatusNotice } from './AiStatusNotice';
import { ChatBubble, type BubbleActions } from './ChatBubble';
import { ChatComposer } from './ChatComposer';

function previousAiLine(messages: ChatMessage[], index: number): string | undefined {
  const previous = messages[index - 1];
  return previous?.role === ChatRole.ASSISTANT ? previous.content : undefined;
}

/**
 * The shared body of every AI chat: connection notice, message thread,
 * streaming reply, error with retry, and the input pinned at the bottom.
 * Screens add their own header around it.
 */
export function ChatPanel({
  chat,
  placeholder,
  isTargetLanguage,
  actions,
  intro,
}: {
  chat: ChatState;
  placeholder: string;
  isTargetLanguage: boolean;
  actions?: BubbleActions;
  /** Shown above the messages, e.g. role-play goals or a tutor welcome. */
  intro?: ReactNode;
}) {
  const { status, recheck } = useAiStatus();
  const endRef = useRef<HTMLDivElement>(null);
  const { messages, streamingText, error } = chat;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, streamingText, error]);

  return (
    <div className="chat-panel">
      <AiStatusNotice status={status} onRetry={recheck} />
      {intro}
      <div className="chat-thread" aria-live="polite">
        {messages.map((message, index) => (
          <ChatBubble key={index} message={message} replyTo={previousAiLine(messages, index)} actions={actions} />
        ))}
        {streamingText !== null && (
          <div className="chat-bubble chat-bubble--ai">
            {streamingText ? <p className="chat-bubble__text">{streamingText}</p> : <span className="typing-dots" aria-label="Thinking" />}
          </div>
        )}
        {error && (
          <div className="chat-error" role="alert">
            <span>{error}</span>
            <button type="button" className="button button--small button--secondary" onClick={chat.retry}>
              Retry
            </button>
          </div>
        )}
        <p className="muted small centered">AI replies come from your Mac and may contain mistakes.</p>
        <div ref={endRef} />
      </div>
      <ChatComposer
        placeholder={placeholder}
        isDisabled={status !== AiStatus.ONLINE}
        isReplying={chat.isReplying}
        isTargetLanguage={isTargetLanguage}
        onSend={chat.send}
        onStop={chat.stop}
      />
    </div>
  );
}
