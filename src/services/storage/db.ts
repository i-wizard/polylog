import Dexie, { type EntityTable } from 'dexie';
import type { Conversation } from '../../domain/ai/types';
import type { DailyActivity } from '../../domain/progress/progress';
import type { ReviewCard, ReviewLogEntry } from '../../domain/srs/scheduler';

export const SETTINGS_ID = 'app';

export interface AppSettings {
  id: string;
  activeCourseId: string;
  dailyGoalXp: number;
  /** Multiplier for normal speech; slow mode uses SLOW_SPEECH_RATE. */
  speechRate: number;
  voiceUri?: string;
  /** Hides target-language question text until tapped, so questions are heard before they are read. */
  listenFirst: boolean;
  newCardsPerDay: number;
  reviewsPerDay: number;
  /** Lets every lesson be opened regardless of progress. */
  unlockAll: boolean;
  lastExportAt?: number;
  /** Address of the learner's Ollama server, e.g. the https tunnel address printed by tools/start-ai.sh. AI features are hidden until set. */
  ollamaUrl?: string;
  ollamaModel: string;
}

export interface LessonProgress {
  courseId: string;
  lessonId: string;
  unitId: string;
  firstCompletedAt: number;
  lastCompletedAt: number;
  bestAccuracy: number;
  timesCompleted: number;
}

export interface StoredReviewLog extends ReviewLogEntry {
  id?: number;
}

/**
 * IndexedDB schema. Never edit an existing version: add a new
 * `this.version(n)` with an upgrade function instead.
 */
export class PolylogDatabase extends Dexie {
  settings!: EntityTable<AppSettings, 'id'>;
  lessonProgress!: Dexie.Table<LessonProgress, [string, string]>;
  cards!: EntityTable<ReviewCard, 'id'>;
  reviewLogs!: EntityTable<StoredReviewLog, 'id'>;
  dailyActivity!: Dexie.Table<DailyActivity, [string, string]>;
  conversations!: EntityTable<Conversation, 'id'>;

  constructor() {
    super('polylog');
    this.version(1).stores({
      settings: 'id',
      lessonProgress: '[courseId+lessonId], courseId',
      cards: 'id, courseId, [courseId+due], [courseId+vocabId]',
      reviewLogs: '++id, cardId, courseId, reviewedAt',
      dailyActivity: '[courseId+date], courseId',
    });
    this.version(2).stores({
      conversations: 'id, courseId, updatedAt',
    });
  }
}

export const db = new PolylogDatabase();
