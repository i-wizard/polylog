import { Logger } from '../../utils/logger';

/** iOS Safari records AAC in MP4; most other browsers prefer WebM/Opus. */
const PREFERRED_MIME_TYPES = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'];

/** True when the browser can record from the microphone. */
export function isRecordingSupported(): boolean {
  return typeof window !== 'undefined' && 'MediaRecorder' in window && !!navigator.mediaDevices?.getUserMedia;
}

function pickMimeType(): string | undefined {
  return PREFERRED_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

/**
 * Records one microphone clip at a time for shadowing practice.
 *
 * Recordings stay in memory as object URLs and are never stored or uploaded.
 */
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];

  /** Asks for microphone access (first time only) and starts recording. */
  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = pickMimeType();
    this.mediaRecorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);
    this.chunks = [];
    this.mediaRecorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
      }
    });
    this.mediaRecorder.start();
    Logger.debug('Recording started', { mimeType });
  }

  /** Stops recording and returns a playable object URL for the clip. */
  async stop(): Promise<string> {
    const recorder = this.mediaRecorder;
    if (!recorder) {
      throw new Error('Recorder was not started');
    }
    const stopped = new Promise<void>((resolve) => recorder.addEventListener('stop', () => resolve(), { once: true }));
    recorder.stop();
    await stopped;
    this.releaseMicrophone();
    const blob = new Blob(this.chunks, { type: recorder.mimeType });
    return URL.createObjectURL(blob);
  }

  /** Releases the microphone so the iOS recording indicator turns off. */
  releaseMicrophone(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.mediaRecorder = null;
  }
}
