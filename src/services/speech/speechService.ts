import { Logger } from '../../utils/logger';

export const SLOW_SPEECH_RATE = 0.6;

const VOICE_LOAD_TIMEOUT_MS = 1500;
const QUALITY_VOICE_PATTERN = /premium|enhanced|neural|natural/i;

/** True when the browser can speak text. */
export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function matchesLocale({ voice, locale }: { voice: SpeechSynthesisVoice; locale: string }): boolean {
  const language = locale.split('-')[0].toLowerCase();
  return voice.lang.replace('_', '-').toLowerCase().startsWith(language);
}

/**
 * Voices available for a locale. Browsers load voices asynchronously
 * (iOS especially), so this waits briefly for the list to populate.
 */
export async function listVoices(locale: string): Promise<SpeechSynthesisVoice[]> {
  if (!isSpeechSupported()) {
    return [];
  }
  let voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) {
    voices = await new Promise<SpeechSynthesisVoice[]>((resolve) => {
      const timeout = window.setTimeout(() => resolve(window.speechSynthesis.getVoices()), VOICE_LOAD_TIMEOUT_MS);
      window.speechSynthesis.addEventListener(
        'voiceschanged',
        () => {
          window.clearTimeout(timeout);
          resolve(window.speechSynthesis.getVoices());
        },
        { once: true },
      );
    });
  }
  return voices.filter((voice) => matchesLocale({ voice, locale }));
}

/**
 * Picks the voice to use: the learner's choice if still installed, otherwise
 * an enhanced/premium voice (much more natural on iOS), otherwise any match.
 */
function pickVoice({
  voices,
  preferredUri,
}: {
  voices: SpeechSynthesisVoice[];
  preferredUri?: string;
}): SpeechSynthesisVoice | undefined {
  const preferred = voices.find((voice) => voice.voiceURI === preferredUri);
  if (preferred) {
    return preferred;
  }
  return voices.find((voice) => QUALITY_VOICE_PATTERN.test(voice.name)) ?? voices[0];
}

/** Speaks text aloud, interrupting anything already playing. */
export async function speak({
  text,
  locale,
  rate,
  voiceUri,
}: {
  text: string;
  locale: string;
  rate: number;
  voiceUri?: string;
}): Promise<void> {
  if (!isSpeechSupported()) {
    Logger.warn('Speech synthesis not supported; cannot play audio', { text });
    return;
  }
  // Creating the utterance before awaiting keeps iOS treating this as user-initiated.
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = locale;
  utterance.rate = rate;
  window.speechSynthesis.cancel();

  const voices = await listVoices(locale);
  const voice = pickVoice({ voices, preferredUri: voiceUri });
  if (voice) {
    utterance.voice = voice;
  } else {
    Logger.warn('No installed voice for locale; using browser default', { locale });
  }
  window.speechSynthesis.speak(utterance);
}

/** Stops any speech in progress. */
export function stopSpeaking(): void {
  if (isSpeechSupported()) {
    window.speechSynthesis.cancel();
  }
}

/**
 * iOS only allows speech after a user gesture. Speaking an empty utterance on
 * the first tap unlocks it, so later automatic playback (after "Check") works.
 */
export function unlockSpeechOnFirstInteraction(): void {
  if (!isSpeechSupported()) {
    return;
  }
  const unlock = () => {
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
    window.removeEventListener('pointerdown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
}
