/**
 * Content model shared by every course.
 *
 * Course data lives as JSON under `content/courses/<courseId>/` and is cast to
 * these types by the content repository. Nothing here is language-specific:
 * anything that depends on how a language behaves belongs in a language pack.
 */

export enum CefrLevel {
  A1 = 'A1',
  A2 = 'A2',
  B1 = 'B1',
  B2 = 'B2',
}

export enum PartOfSpeech {
  NOUN = 'NOUN',
  VERB = 'VERB',
  ADJECTIVE = 'ADJECTIVE',
  ADVERB = 'ADVERB',
  PRONOUN = 'PRONOUN',
  PREPOSITION = 'PREPOSITION',
  CONJUNCTION = 'CONJUNCTION',
  QUESTION_WORD = 'QUESTION_WORD',
  NUMBER = 'NUMBER',
  INTERJECTION = 'INTERJECTION',
  PHRASE = 'PHRASE',
}

export enum LessonKind {
  SOUNDS = 'SOUNDS',
  LEARN = 'LEARN',
  PRACTICE = 'PRACTICE',
}

export enum ExerciseType {
  TEACH = 'TEACH',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  MATCH_PAIRS = 'MATCH_PAIRS',
  TRANSLATE = 'TRANSLATE',
  WORD_ORDER = 'WORD_ORDER',
  CLOZE = 'CLOZE',
  LISTEN_CHOOSE = 'LISTEN_CHOOSE',
  LISTEN_TYPE = 'LISTEN_TYPE',
  SHADOW = 'SHADOW',
}

/** Which side of a course a piece of text is written in. */
export enum LanguageRole {
  TARGET = 'TARGET',
  BASE = 'BASE',
}

export interface CourseLevel {
  level: CefrLevel;
  unitIds: string[];
}

/** Time-of-day greetings in the target language, shown on the Today screen. */
export interface CourseGreetings {
  morning: string;
  afternoon: string;
  evening: string;
}

export interface Course {
  id: string;
  targetLanguage: string;
  baseLanguage: string;
  title: string;
  description: string;
  greetings: CourseGreetings;
  levels: CourseLevel[];
}

export interface VocabExample {
  text: string;
  translation: string;
}

export interface VocabItem {
  id: string;
  text: string;
  /** First entry is the canonical prompt for production cards, so it must be unambiguous within a course. */
  translations: string[];
  partOfSpeech: PartOfSpeech;
  /** A gender code defined by the target language pack (e.g. 'm' for German). */
  gender?: string;
  plural?: string;
  /** Learner-friendly respelling, e.g. 'MAYD-khen'. Capitals mark stress. */
  pronunciation?: string;
  /** Latin-script transliteration for non-Latin target languages. */
  romanization?: string;
  example?: VocabExample;
}

export interface GrammarNote {
  id: string;
  title: string;
  /** Light markdown: paragraphs, "- " bullets, **bold**, *italic*. */
  body: string;
  /** Optional table; the first row is the header. */
  table?: string[][];
}

export interface TeachExample {
  text: string;
  translation?: string;
  hint?: string;
}

export interface TeachExercise {
  id: string;
  type: ExerciseType.TEACH;
  title: string;
  body: string;
  examples?: TeachExample[];
}

export interface MultipleChoiceExercise {
  id: string;
  type: ExerciseType.MULTIPLE_CHOICE;
  instruction?: string;
  prompt: string;
  promptLanguage: LanguageRole;
  options: string[];
  optionsLanguage: LanguageRole;
  answerIndex: number;
}

export interface MatchPair {
  target: string;
  base: string;
}

export interface MatchPairsExercise {
  id: string;
  type: ExerciseType.MATCH_PAIRS;
  pairs: MatchPair[];
}

export interface TranslateExercise {
  id: string;
  type: ExerciseType.TRANSLATE;
  source: string;
  sourceLanguage: LanguageRole;
  /** Accepted answers in the other language. The first one is shown as the model answer. */
  accepted: string[];
}

export interface WordOrderExercise {
  id: string;
  type: ExerciseType.WORD_ORDER;
  /** Base-language meaning shown as the prompt. */
  translation: string;
  /** Target-language sentence; its tokens become the tiles. */
  answer: string;
  /** Other word orders that are also correct. */
  alternatives?: string[];
  distractors?: string[];
}

export interface ClozeExercise {
  id: string;
  type: ExerciseType.CLOZE;
  before: string;
  after: string;
  accepted: string[];
  translation: string;
  hint?: string;
}

export interface ListenChooseExercise {
  id: string;
  type: ExerciseType.LISTEN_CHOOSE;
  instruction?: string;
  options: string[];
  answerIndex: number;
}

export interface ListenTypeExercise {
  id: string;
  type: ExerciseType.LISTEN_TYPE;
  text: string;
  translation: string;
}

export interface ShadowExercise {
  id: string;
  type: ExerciseType.SHADOW;
  text: string;
  translation: string;
  hint?: string;
}

export type Exercise =
  | TeachExercise
  | MultipleChoiceExercise
  | MatchPairsExercise
  | TranslateExercise
  | WordOrderExercise
  | ClozeExercise
  | ListenChooseExercise
  | ListenTypeExercise
  | ShadowExercise;

export interface Lesson {
  id: string;
  title: string;
  kind: LessonKind;
  /** Vocab ids that become review cards when this lesson is completed. */
  introduces: string[];
  exercises: Exercise[];
}

export interface Unit {
  id: string;
  level: CefrLevel;
  title: string;
  description: string;
  icon: string;
  vocab: VocabItem[];
  grammarNotes: GrammarNote[];
  lessons: Lesson[];
}
