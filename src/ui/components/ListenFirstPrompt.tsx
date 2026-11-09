import { Eye, EyeOff } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useApp } from '../AppContext';
import { Speakable } from './Speakable';

/**
 * Target-language text in a lesson, for listening practice.
 *
 * With the "Listen first" setting on, the text starts hidden and an eye
 * button next to the play buttons shows or hides it, so the learner hears
 * it before reading it. Once the answer has been checked it is always shown.
 */
export function ListenFirstPrompt({
  text,
  display,
  isLocked,
  size = 'large',
}: {
  text: string;
  /** Optional rendered content (e.g. a coloured noun); defaults to `text`. */
  display?: ReactNode;
  /** True once the answer has been checked or revealed. */
  isLocked: boolean;
  size?: 'normal' | 'large';
}) {
  const { settings } = useApp();
  const [isRevealed, setIsRevealed] = useState(false);

  if (!settings.listenFirst || isLocked) {
    return <Speakable text={text} display={display} size={size} />;
  }
  const iconSize = size === 'large' ? 20 : 16;
  return (
    <Speakable
      text={text}
      size={size}
      display={isRevealed ? display : ''}
      extraButton={
        <button
          type="button"
          className="icon-button icon-button--subtle"
          aria-label={isRevealed ? 'Hide text' : 'Show text'}
          aria-pressed={isRevealed}
          onClick={() => setIsRevealed(!isRevealed)}
        >
          {isRevealed ? <EyeOff size={iconSize} /> : <Eye size={iconSize} />}
        </button>
      }
    />
  );
}
