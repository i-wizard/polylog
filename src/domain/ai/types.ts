/** Role of a chat message. Values match the roles chat models expect. */
export enum ChatRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
}

/** The two AI chat experiences. */
export enum ChatMode {
  /** In-character conversation in the target language, based on a scenario. */
  ROLE_PLAY = 'ROLE_PLAY',
  /** Open questions to a tutor, in either language. */
  TUTOR = 'TUTOR',
}

/** Whether the learner's AI server can be used right now. */
export enum AiStatus {
  NOT_CONFIGURED = 'NOT_CONFIGURED',
  CHECKING = 'CHECKING',
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  MODEL_MISSING = 'MODEL_MISSING',
}

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

/** A message as stored in a conversation, with the time it was written. */
export interface StoredChatMessage extends ChatMessage {
  createdAt: number;
}

/** Identifies a conversation and what it is about. */
export interface ConversationRef {
  id: string;
  courseId: string;
  mode: ChatMode;
  scenarioId?: string;
}

/** A saved chat, so it survives iOS closing the app. */
export interface Conversation extends ConversationRef {
  messages: StoredChatMessage[];
  updatedAt: number;
}

/** The learner's level and vocabulary, used to keep AI replies understandable. */
export interface LearnerProfile {
  level: string;
  knownWords: string[];
}

/** Result of checking one learner sentence. */
export interface SentenceCheck {
  isCorrect: boolean;
  corrected: string;
  explanation: string;
}
