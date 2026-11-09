import { Mic, Play, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ShadowExercise } from '../../domain/content/types';
import { AnswerResult } from '../../domain/grading/answerChecker';
import { AudioRecorder, isRecordingSupported } from '../../services/speech/audioRecorder';
import { Logger } from '../../utils/logger';
import { MouthShapeGuides } from '../components/MouthShapeGuides';
import { ListenFirstPrompt } from '../components/ListenFirstPrompt';
import { useSpeaker } from '../hooks/useSpeaker';
import { CheckButton } from './CheckButton';
import type { ExerciseViewProps } from './exerciseViewProps';

enum RecordingState {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  RECORDED = 'RECORDED',
}

/**
 * Shadowing: listen to a native model, record yourself saying the same thing,
 * then play both back to compare. Self-assessed, so it always counts as done.
 */
export function ShadowView({ exercise, isLocked, onSubmit }: ExerciseViewProps<ShadowExercise>) {
  const speakTarget = useSpeaker();
  const recorderRef = useRef(new AudioRecorder());
  const [state, setState] = useState(RecordingState.IDLE);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canRecord = isRecordingSupported();

  useEffect(() => {
    const recorder = recorderRef.current;
    return () => {
      recorder.releaseMicrophone();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (recordingUrl) {
        URL.revokeObjectURL(recordingUrl);
      }
    };
  }, [recordingUrl]);

  const startRecording = async () => {
    setError(null);
    try {
      await recorderRef.current.start();
      setState(RecordingState.RECORDING);
    } catch (recordError) {
      Logger.warn('Could not start recording', recordError);
      setError('Microphone unavailable. Allow microphone access in Settings → Safari (or for this app) and try again.');
    }
  };

  const stopRecording = async () => {
    const url = await recorderRef.current.stop();
    setRecordingUrl(url);
    setState(RecordingState.RECORDED);
  };

  const playRecording = () => {
    if (recordingUrl) {
      void new Audio(recordingUrl).play();
    }
  };

  return (
    <>
      <div className="exercise-body">
        <p className="exercise-kicker">Listen, then say it yourself</p>
        <div className="exercise-prompt">
          <ListenFirstPrompt text={exercise.text} isLocked={isLocked} />
        </div>
        <p className="exercise-translation">{exercise.translation}</p>
        {exercise.hint && <p className="exercise-hint">{exercise.hint}</p>}
        {exercise.mouthShapes && exercise.mouthShapes.length > 0 && <MouthShapeGuides guides={exercise.mouthShapes} />}

        {canRecord ? (
          <div className="shadow-controls">
            {state === RecordingState.RECORDING ? (
              <button type="button" className="record-button is-recording" onClick={stopRecording}>
                <Square size={22} /> Stop
              </button>
            ) : (
              <button type="button" className="record-button" onClick={startRecording} disabled={isLocked}>
                <Mic size={22} /> {state === RecordingState.RECORDED ? 'Record again' : 'Record'}
              </button>
            )}
            {state === RecordingState.RECORDED && (
              <div className="shadow-compare">
                <button type="button" className="button button--secondary" onClick={() => speakTarget(exercise.text)}>
                  <Play size={18} /> Model
                </button>
                <button type="button" className="button button--secondary" onClick={playRecording}>
                  <Play size={18} /> You
                </button>
              </div>
            )}
            {error && <p className="exercise-hint">{error}</p>}
          </div>
        ) : (
          <p className="exercise-hint">Recording isn't supported in this browser — say it aloud along with the audio.</p>
        )}
      </div>
      <CheckButton
        isLocked={isLocked}
        isReady={state !== RecordingState.RECORDING}
        label="Done"
        onCheck={() => onSubmit({ result: AnswerResult.CORRECT })}
      />
    </>
  );
}
