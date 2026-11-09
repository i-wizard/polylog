import { Eye } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useApp } from '../AppContext';
import { Speakable } from './Speakable';

/**
 * A target-language question prompt for listening practice.
 *
 * With the "Listen first" setting on, the text stays hidden behind a
 * "Show text" button so the learner hears it before reading it. It is
 * revealed on tap, and always once the answer has been checked.
 */
export function ListenFirstPrompt({
  text,
  display,
  isLocked,
}: {
  text: string;
  /** Optional rendered content once shown (e.g. a coloured noun); defaults to `text`. */
  display?: ReactNode;
  /** True once the answer has been checked or revealed. */
  isLocked: boolean;
}) {
  const { settings } = useApp();
  const [isRevealed, setIsRevealed] = useState(false);

  if (!settings.listenFirst || isRevealed || isLocked) {
    return <Speakable text={text} display={display} size="large" />;
  }
  return (
    <Speakable
      text={text}
      size="large"
      display={
        <button type="button" className="reveal-text" onClick={() => setIsRevealed(true)}>
          <Eye size={18} aria-hidden /> Show text
        </button>
      }
    />
  );
}
