import { Snail, Volume2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useApp } from '../AppContext';
import { useSpeaker } from '../hooks/useSpeaker';

/**
 * Target-language text with "play" and "play slowly" buttons.
 *
 * Every piece of target-language text the learner reads should go through
 * this component so it can always be heard.
 */
export function Speakable({
  text,
  display,
  size = 'normal',
  extraButton,
}: {
  text: string;
  /** Optional rendered content (e.g. a coloured noun); defaults to `text`. */
  display?: ReactNode;
  size?: 'normal' | 'large';
  /** Another button shown after the play buttons, e.g. to show or hide the text. */
  extraButton?: ReactNode;
}) {
  const speakTarget = useSpeaker();
  const { packs } = useApp();

  return (
    <span className={`speakable speakable--${size}`}>
      <button
        type="button"
        className="icon-button"
        aria-label={`Play "${text}"`}
        onClick={() => speakTarget(text)}
      >
        <Volume2 size={size === 'large' ? 22 : 18} />
      </button>
      <button
        type="button"
        className="icon-button icon-button--subtle"
        aria-label={`Play "${text}" slowly`}
        onClick={() => speakTarget(text, { slow: true })}
      >
        <Snail size={size === 'large' ? 20 : 16} />
      </button>
      {extraButton}
      <span className="speakable__text" lang={packs.target.code}>
        {display ?? text}
      </span>
    </span>
  );
}
