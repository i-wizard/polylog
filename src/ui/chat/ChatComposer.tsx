import { SendHorizontal, Square } from 'lucide-react';
import { useState, type FormEvent } from 'react';

/**
 * Message input pinned to the bottom of a chat. While a reply streams, the
 * send button becomes a stop button.
 */
export function ChatComposer({
  placeholder,
  isDisabled,
  isReplying,
  isTargetLanguage,
  onSend,
  onStop,
}: {
  placeholder: string;
  isDisabled: boolean;
  isReplying: boolean;
  /** Turns off autocorrect, which would "fix" target-language words into the keyboard's language. */
  isTargetLanguage: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}) {
  const [text, setText] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (isReplying) {
      onStop();
      return;
    }
    if (!text.trim()) return;
    onSend(text);
    setText('');
  };

  return (
    <form className="chat-composer" onSubmit={handleSubmit}>
      <input
        className="text-field chat-composer__input"
        value={text}
        placeholder={placeholder}
        disabled={isDisabled}
        enterKeyHint="send"
        autoCapitalize="sentences"
        autoCorrect={isTargetLanguage ? 'off' : 'on'}
        spellCheck={!isTargetLanguage}
        onChange={(event) => setText(event.target.value)}
      />
      <button
        type="submit"
        className="button button--primary chat-composer__send"
        disabled={isDisabled || (!isReplying && !text.trim())}
        aria-label={isReplying ? 'Stop reply' : 'Send'}
      >
        {isReplying ? <Square size={18} /> : <SendHorizontal size={20} />}
      </button>
    </form>
  );
}
