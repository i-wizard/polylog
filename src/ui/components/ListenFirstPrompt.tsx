import { Eye } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useApp } from '../AppContext';
import { Speakable } from './Speakable';

/**
 * Target-language text in a lesson, for listening practice.
 *
 * With the "Listen first" setting on, the text stays hidden behind a
 * "Show text" button so the learner hears it before reading it. It is
 * revealed on tap, and always once the answer has been checked.
 */
export function ListenFirstPrompt({
  text,
  display,
  isLocked,
  size = 'large',
}: {
  text: string;
  /** Optional rendered content once shown (e.g. a coloured noun); defaults to `text`. */
  display?: ReactNode;
  /** True once the answer has been checked or revealed. */
  isLocked: boolean;
  size?: 'normal' | 'large';
}) {
  const { settings } = useApp();
  const [isRevealed, setIsRevealed] = useState(false);

  if (!settings.listenFirst || isRevealed || isLocked) {
    return <Speakable text={text} display={display} size={size} />;
  }
  return (
    <Speakable
      text={text}
      size={size}
      display={
        <button type="button" className="reveal-text" onClick={() => setIsRevealed(true)}>
          <Eye size={18} aria-hidden /> Show text
        </button>
      }
    />
  );
}
