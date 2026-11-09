import { useLiveQuery } from 'dexie-react-hooks';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Course, Unit } from '../domain/content/types';
import type { CoursePacks } from '../domain/grading/exerciseGrading';
import { getLanguagePack } from '../languages/registry';
import { getCourse, loadCourseUnits } from '../services/content/contentRepository';
import { prepareSpeech } from '../services/speech/speechService';
import type { AppSettings } from '../services/storage/db';
import { DEFAULT_SETTINGS, getSettings } from '../services/storage/settingsRepository';
import { Logger } from '../utils/logger';

interface CourseData {
  course: Course;
  units: Unit[];
  packs: CoursePacks;
}

interface AppContextValue extends CourseData {
  settings: AppSettings;
}

const AppContext = createContext<AppContextValue | null>(null);

/**
 * Loads settings (live) and the active course with all its units, and makes
 * them available to every screen. Renders a loading state until ready.
 */
export function AppProvider({ children }: { children: ReactNode }) {
  const settings = useLiveQuery(getSettings, [], DEFAULT_SETTINGS);
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const activeCourseId = settings.activeCourseId;
  const speechLocale = courseData?.packs.target.speechLocale;
  const voiceUri = settings.voiceUri;

  useEffect(() => {
    if (!speechLocale) {
      return undefined;
    }
    return prepareSpeech({ locale: speechLocale, voiceUri });
  }, [speechLocale, voiceUri]);

  useEffect(() => {
    let cancelled = false;
    const course = getCourse(activeCourseId);
    const packs = { target: getLanguagePack(course.targetLanguage), base: getLanguagePack(course.baseLanguage) };
    loadCourseUnits(course)
      .then((units) => {
        if (!cancelled) {
          setCourseData({ course, units, packs });
        }
      })
      .catch((error: unknown) => {
        Logger.error('Failed to load course content', { activeCourseId, error });
        setLoadError('Could not load course content. Check your connection and reload.');
      });
    return () => {
      cancelled = true;
    };
  }, [activeCourseId]);

  const value = useMemo(() => (courseData ? { ...courseData, settings } : null), [courseData, settings]);

  if (loadError) {
    return <div className="screen centered-message">{loadError}</div>;
  }
  if (!value) {
    return <div className="screen centered-message">Loading…</div>;
  }
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/** Access to settings, the active course, its units and language packs. */
export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) {
    throw new Error('useApp must be used inside <AppProvider>');
  }
  return value;
}
