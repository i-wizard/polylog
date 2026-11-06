import { db, SETTINGS_ID, type AppSettings } from './db';

export const DEFAULT_COURSE_ID = 'de-en';

export const DEFAULT_SETTINGS: AppSettings = {
  id: SETTINGS_ID,
  activeCourseId: DEFAULT_COURSE_ID,
  dailyGoalXp: 30,
  speechRate: 0.9,
  newCardsPerDay: 20,
  reviewsPerDay: 100,
  unlockAll: false,
  ollamaModel: 'gemma3:4b',
};

/** Reads settings, filling in defaults for any field added after the record was saved. */
export async function getSettings(): Promise<AppSettings> {
  const stored = await db.settings.get(SETTINGS_ID);
  return { ...DEFAULT_SETTINGS, ...stored };
}

/** Saves a partial settings change. */
export async function updateSettings(changes: Partial<Omit<AppSettings, 'id'>>): Promise<void> {
  const current = await getSettings();
  await db.settings.put({ ...current, ...changes });
}
