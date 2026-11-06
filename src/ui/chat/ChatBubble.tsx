import { CheckCircle2, Languages, Snail, SpellCheck, Volume2 } from 'lucide-react';
import { useState } from 'react';
import { ChatRole, type ChatMessage, type SentenceCheck } from '../../domain/ai/types';
import type { SentenceActions } from '../hooks/useSentenceActions';
import { describeAiError } from '../../services/ai/chatService';
import { useApp } from '../AppContext';
import { RichText } from '../components/RichText';
import { useSpeaker } from '../hooks/useSpeaker';

/**
 * Extra help on messages. With `translate`, AI lines are treated as
 * target-language speech (role-plays); with `check`, the learner's lines can be checked.
 */
export type BubbleActions = Partial<SentenceActions>;

/** Models often write "* item" bullets; the content renderer expects "- item". */
function toRichTextSource(text: string): string {
  return text.replace(/^(\s*)\* /gm, '$1- ');
}

/**
 * One chat message. In role-plays, AI lines can be heard and translated, and
 * the learner's own lines can be checked for mistakes.
 */
export function ChatBubble({
  message,
  replyTo,
  actions,
}: {
  message: ChatMessage;
  replyTo?: string;
  actions?: BubbleActions;
}) {
  const isLearner = message.role === ChatRole.USER;
  const translate = actions?.translate;
  const check = actions?.check;
  const isPlainText = isLearner || translate !== undefined;
  return (
    <div className={`chat-bubble ${isLearner ? 'chat-bubble--learner' : 'chat-bubble--ai'}`}>
      {isPlainText ? <p className="chat-bubble__text">{message.content}</p> : <RichText source={toRichTextSource(message.content)} />}
      {isLearner && check && <CheckAction text={message.content} replyTo={replyTo} check={check} />}
      {!isLearner && translate && <AiLineActions text={message.content} translate={translate} />}
    </div>
  );
}

function AiLineActions({ text, translate }: { text: string; translate: SentenceActions['translate'] }) {
  const speakTarget = useSpeaker();
  const { packs } = useApp();
  const [translation, setTranslation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleTranslate = async () => {
    setIsLoading(true);
    try {
      setTranslation(await translate(text));
    } catch (error) {
      setTranslation(describeAiError(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="chat-bubble__actions">
        <button type="button" className="icon-button" aria-label="Play" onClick={() => speakTarget(text)}>
          <Volume2 size={18} />
        </button>
        <button type="button" className="icon-button icon-button--subtle" aria-label="Play slowly" onClick={() => speakTarget(text, { slow: true })}>
          <Snail size={16} />
        </button>
        {translation === null && (
          <button type="button" className="chat-action" disabled={isLoading} onClick={() => void handleTranslate()}>
            <Languages size={16} aria-hidden /> {isLoading ? 'Translating…' : `Translate to ${packs.base.name}`}
          </button>
        )}
      </div>
      {translation !== null && <p className="chat-bubble__note">{translation}</p>}
    </>
  );
}

function CheckAction({
  text,
  replyTo,
  check,
}: {
  text: string;
  replyTo?: string;
  check: SentenceActions['check'];
}) {
  const { packs } = useApp();
  const [result, setResult] = useState<SentenceCheck | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCheck = async () => {
    setIsLoading(true);
    setFailure(null);
    try {
      setResult(await check({ text, replyTo }));
    } catch (error) {
      setFailure(describeAiError(error));
    } finally {
      setIsLoading(false);
    }
  };

  if (result) {
    return result.isCorrect ? (
      <p className="chat-bubble__note">
        <CheckCircle2 size={16} aria-hidden /> Looks right!
      </p>
    ) : (
      <div className="chat-bubble__note">
        <strong>{result.corrected}</strong>
        {result.explanation && <span>{result.explanation}</span>}
      </div>
    );
  }
  return (
    <div className="chat-bubble__actions">
      <button type="button" className="chat-action" disabled={isLoading} onClick={() => void handleCheck()}>
        <SpellCheck size={16} aria-hidden /> {isLoading ? 'Checking…' : `Check my ${packs.target.name}`}
      </button>
      {failure && <span className="chat-bubble__error">{failure}</span>}
    </div>
  );
}
