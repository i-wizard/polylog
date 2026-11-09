import { Download, Upload } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { DAILY_GOAL_OPTIONS } from '../../domain/progress/progress';
import { listCourses } from '../../services/content/contentRepository';
import { exportProgress, importProgress, resetProgress, type ProgressBackup } from '../../services/storage/backupService';
import { saveFile } from '../../services/storage/fileTransfer';
import { updateSettings } from '../../services/storage/settingsRepository';
import { isSpeechSupported, listVoices } from '../../services/speech/speechService';
import { toLocalDateKey } from '../../utils/date';
import { Logger } from '../../utils/logger';
import { useApp } from '../AppContext';
import { AiSettingsCard } from '../chat/AiSettingsCard';
import { useSpeaker } from '../hooks/useSpeaker';

const NEW_CARD_OPTIONS = [10, 20, 30];

/** Learner preferences, voice setup, and progress backup. */
export function SettingsScreen() {
  const { settings, packs, course } = useApp();
  const courses = listCourses();

  return (
    <div className="screen">
      <header className="screen-header">
        <h1 className="screen-title">Settings</h1>
      </header>

      {courses.length > 1 && (
        <section className="card">
          <h2 className="card__title">Course</h2>
          <select
            className="select"
            value={course.id}
            onChange={(event) => void updateSettings({ activeCourseId: event.target.value })}
          >
            {courses.map((option) => (
              <option key={option.id} value={option.id}>
                {option.title}
              </option>
            ))}
          </select>
        </section>
      )}

      <section className="card">
        <h2 className="card__title">Daily goal</h2>
        <div className="segmented">
          {DAILY_GOAL_OPTIONS.map((goal) => (
            <button
              key={goal}
              type="button"
              className={`segmented__option${settings.dailyGoalXp === goal ? ' is-selected' : ''}`}
              onClick={() => void updateSettings({ dailyGoalXp: goal })}
            >
              {goal} XP
            </button>
          ))}
        </div>
        <h3 className="card__subtitle">New words per day</h3>
        <div className="segmented">
          {NEW_CARD_OPTIONS.map((count) => (
            <button
              key={count}
              type="button"
              className={`segmented__option${settings.newCardsPerDay === count ? ' is-selected' : ''}`}
              onClick={() => void updateSettings({ newCardsPerDay: count })}
            >
              {count}
            </button>
          ))}
        </div>
      </section>

      <VoiceSettings locale={packs.target.speechLocale} languageName={packs.target.name} sampleText={course.greetings.afternoon} />

      <section className="card">
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.unlockAll}
            onChange={(event) => void updateSettings({ unlockAll: event.target.checked })}
          />
          <span>
            <strong>Unlock all lessons</strong>
            <span className="muted"> — open any lesson regardless of progress</span>
          </span>
        </label>
      </section>

      <AiSettingsCard />

      <BackupSettings />

      <p className="muted centered">Polylog {__APP_VERSION__}</p>
    </div>
  );
}

function VoiceSettings({
  locale,
  languageName,
  sampleText,
}: {
  locale: string;
  languageName: string;
  sampleText: string;
}) {
  const { settings } = useApp();
  const speakTarget = useSpeaker();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    void listVoices(locale).then(setVoices);
  }, [locale]);

  if (!isSpeechSupported()) {
    return (
      <section className="card">
        <h2 className="card__title">Voice</h2>
        <p className="muted">This browser can't speak text aloud.</p>
      </section>
    );
  }

  return (
    <section className="card">
      <h2 className="card__title">Voice</h2>
      <label className="field">
        <span>{languageName} voice</span>
        <select
          className="select"
          value={settings.voiceUri ?? ''}
          onChange={(event) => void updateSettings({ voiceUri: event.target.value || undefined })}
        >
          <option value="">Automatic (best available)</option>
          {voices.map((voice) => (
            <option key={voice.voiceURI} value={voice.voiceURI}>
              {voice.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Speed: {settings.speechRate.toFixed(2)}×</span>
        <input
          type="range"
          min={0.6}
          max={1.1}
          step={0.05}
          value={settings.speechRate}
          onChange={(event) => void updateSettings({ speechRate: Number(event.target.value) })}
        />
      </label>
      <button type="button" className="button button--secondary" onClick={() => speakTarget(sampleText)}>
        Test voice
      </button>
      <label className="toggle">
        <input
          type="checkbox"
          checked={settings.listenFirst}
          onChange={(event) => void updateSettings({ listenFirst: event.target.checked })}
        />
        <span>
          <strong>Listen first</strong>
          <span className="muted"> — hide {languageName} questions until you tap "Show text"</span>
        </span>
      </label>
      <p className="muted small">
        For a much more natural voice on iPhone: Settings → Accessibility → Spoken Content → Voices → {languageName}, then
        download an <em>Enhanced</em> or <em>Premium</em> voice and pick it above.
      </p>
    </section>
  );
}

function BackupSettings() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleExport = async () => {
    const now = new Date();
    const backup = await exportProgress(now);
    const file = new File([JSON.stringify(backup)], `polylog-backup-${toLocalDateKey(now)}.json`, {
      type: 'application/json',
    });
    await saveFile({ file });
    await updateSettings({ lastExportAt: now.getTime() });
    setMessage('Backup created.');
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !window.confirm('Replace ALL current progress with this backup?')) {
      return;
    }
    try {
      const backup = JSON.parse(await file.text()) as ProgressBackup;
      await importProgress(backup);
      setMessage('Backup restored.');
    } catch (error) {
      Logger.error('Import failed', error);
      setMessage('That file could not be restored. Is it a Polylog backup?');
    }
  };

  const handleReset = async () => {
    if (window.confirm('Delete all progress, review cards and streaks? This cannot be undone.')) {
      await resetProgress();
      setMessage('Progress reset.');
    }
  };

  return (
    <section className="card">
      <h2 className="card__title">Backup</h2>
      <p className="muted small">Progress is stored only on this device. Export a backup now and then.</p>
      <div className="button-row">
        <button type="button" className="button button--secondary" onClick={() => void handleExport()}>
          <Download size={18} /> Export
        </button>
        <button type="button" className="button button--secondary" onClick={() => fileInputRef.current?.click()}>
          <Upload size={18} /> Import
        </button>
        <input ref={fileInputRef} type="file" accept="application/json,.json" hidden onChange={handleImport} />
      </div>
      {message && <p className="small">{message}</p>}
      <button type="button" className="button button--danger button--small" onClick={() => void handleReset()}>
        Reset all progress
      </button>
    </section>
  );
}
