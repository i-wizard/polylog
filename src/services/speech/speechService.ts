import { Logger } from '../../utils/logger';

export const SLOW_SPEECH_RATE = 0.6;

/** How long to keep asking for voices before giving up (iOS can take a few seconds after launch). */
const VOICE_LOAD_TIMEOUT_MS = 5000;
const VOICE_POLL_INTERVAL_MS = 250;
const QUALITY_VOICE_PATTERN = /premium|enhanced|neural|natural/i;

/** Every installed voice, filled once at startup by `preloadVoices`. */
let loadedVoices: SpeechSynthesisVoice[] | null = null;
let voicesLoading: Promise<SpeechSynthesisVoice[]> | null = null;

/** True when the browser can speak text. */
export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function matchesLocale({ voice, locale }: { voice: SpeechSynthesisVoice; locale: string }): boolean {
  const language = locale.split('-')[0].toLowerCase();
  return voice.lang.replace('_', '-').toLowerCase().startsWith(language);
}

/**
 * Waits for the browser's voice list. Browsers fill it asynchronously, and
 * iOS often neither returns it on the first call nor fires `voiceschanged`,
 * so the list is both listened for and polled.
 */
function waitForVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const startedAt = Date.now();
    let pollTimer = 0;

    const finish = (voices: SpeechSynthesisVoice[]) => {
      window.clearTimeout(pollTimer);
      synth.removeEventListener('voiceschanged', handleChange);
      resolve(voices);
    };
    const handleChange = () => {
      const voices = synth.getVoices();
      if (voices.length > 0) {
        finish(voices);
      }
    };
    const poll = () => {
      const voices = synth.getVoices();
      if (voices.length > 0 || Date.now() - startedAt >= VOICE_LOAD_TIMEOUT_MS) {
        finish(voices);
        return;
      }
      pollTimer = window.setTimeout(poll, VOICE_POLL_INTERVAL_MS);
    };

    synth.addEventListener('voiceschanged', handleChange);
    poll();
  });
}

/**
 * Starts loading the voice list so the first tap on a speaker button plays
 * straight away instead of waiting for it. Safe to call more than once.
 */
export function preloadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!isSpeechSupported()) {
    return Promise.resolve([]);
  }
  if (!voicesLoading) {
    voicesLoading = waitForVoices().then((voices) => {
      // An empty list means the browser hasn't loaded them yet; allow a later retry.
      if (voices.length > 0) {
        loadedVoices = voices;
      } else {
        voicesLoading = null;
        Logger.warn('No speech voices available yet');
      }
      Logger.debug('Speech voices loaded', { count: voices.length });
      return voices;
    });
  }
  return voicesLoading;
}

/** Voices available for a locale. */
export async function listVoices(locale: string): Promise<SpeechSynthesisVoice[]> {
  const voices = loadedVoices ?? (await preloadVoices());
  return voices.filter((voice) => matchesLocale({ voice, locale }));
}

/**
 * Picks the voice to use: the learner's choice if still installed, otherwise
 * an enhanced/premium voice (much more natural on iOS), otherwise any match.
 */
function pickVoice({
  voices,
  locale,
  preferredUri,
}: {
  voices: SpeechSynthesisVoice[];
  locale: string;
  preferredUri?: string;
}): SpeechSynthesisVoice | undefined {
  const localeVoices = voices.filter((voice) => matchesLocale({ voice, locale }));
  const preferred = localeVoices.find((voice) => voice.voiceURI === preferredUri);
  if (preferred) {
    return preferred;
  }
  return localeVoices.find((voice) => QUALITY_VOICE_PATTERN.test(voice.name)) ?? localeVoices[0];
}

function playUtterance({ utterance, voices, locale, voiceUri }: {
  utterance: SpeechSynthesisUtterance;
  voices: SpeechSynthesisVoice[];
  locale: string;
  voiceUri?: string;
}): void {
  const voice = pickVoice({ voices, locale, preferredUri: voiceUri });
  if (voice) {
    utterance.voice = voice;
  } else {
    Logger.warn('No installed voice for locale; using browser default', { locale });
  }
  window.speechSynthesis.speak(utterance);
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
  // Creating the utterance before any await keeps iOS treating this as user-initiated.
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = locale;
  utterance.rate = rate;
  window.speechSynthesis.cancel();

  // Voices are normally preloaded, so this plays without waiting.
  const voices = loadedVoices ?? (await preloadVoices());
  playUtterance({ utterance, voices, locale, voiceUri });
}

/** Stops any speech in progress. */
export function stopSpeaking(): void {
  if (isSpeechSupported()) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Gets speech ready before the learner first needs it.
 *
 * Loads the voice list now, and on the first tap anywhere speaks a silent
 * utterance with the voice that will be used. iOS only allows speech after a
 * user gesture, so this unlocks later automatic playback (after "Check"), and
 * it makes iOS load the voice then rather than on the first speaker tap.
 * Returns a function that cancels the pending warm-up.
 */
export function prepareSpeech({ locale, voiceUri }: { locale: string; voiceUri?: string }): () => void {
  if (!isSpeechSupported()) {
    return () => undefined;
  }
  void preloadVoices();
  const warmUp = () => {
    window.removeEventListener('pointerdown', warmUp, true);
    const utterance = new SpeechSynthesisUtterance(' ');
    utterance.lang = locale;
    utterance.volume = 0;
    playUtterance({ utterance, voices: loadedVoices ?? [], locale, voiceUri });
  };
  window.addEventListener('pointerdown', warmUp, true);
  return () => window.removeEventListener('pointerdown', warmUp, true);
}
