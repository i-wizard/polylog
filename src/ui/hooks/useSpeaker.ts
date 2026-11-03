import { useCallback } from 'react';
import { SLOW_SPEECH_RATE, speak } from '../../services/speech/speechService';
import { useApp } from '../AppContext';

/**
 * Returns a function that speaks target-language text with the learner's
 * chosen voice and speed. Pass `slow` for the slowed-down version.
 */
export function useSpeaker(): (text: string, options?: { slow?: boolean }) => void {
  const { packs, settings } = useApp();

  return useCallback(
    (text: string, options?: { slow?: boolean }) => {
      void speak({
        text,
        locale: packs.target.speechLocale,
        rate: options?.slow ? SLOW_SPEECH_RATE : settings.speechRate,
        voiceUri: settings.voiceUri,
      });
    },
    [packs.target.speechLocale, settings.speechRate, settings.voiceUri],
  );
}
