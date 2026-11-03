import { Snail, Volume2 } from 'lucide-react';
import { useEffect } from 'react';
import { useSpeaker } from '../hooks/useSpeaker';

/**
 * Large play / play-slowly buttons for listening exercises. Plays once on
 * mount so the learner hears the audio without an extra tap.
 */
export function ListenButtons({ text }: { text: string }) {
  const speakTarget = useSpeaker();

  useEffect(() => {
    speakTarget(text);
  }, [speakTarget, text]);

  return (
    <div className="listen-buttons">
      <button type="button" className="listen-button" aria-label="Play audio" onClick={() => speakTarget(text)}>
        <Volume2 size={36} />
      </button>
      <button
        type="button"
        className="listen-button listen-button--slow"
        aria-label="Play audio slowly"
        onClick={() => speakTarget(text, { slow: true })}
      >
        <Snail size={28} />
      </button>
    </div>
  );
}
