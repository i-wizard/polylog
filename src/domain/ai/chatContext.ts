import {
  CefrLevel,
  ExerciseType,
  LanguageRole,
  PartOfSpeech,
  type Exercise,
  type GrammarNote,
  type Lesson,
  type Scenario,
  type TeachExercise,
  type Unit,
} from '../content/types';
import type { CoursePacks } from '../grading/exerciseGrading';
import { ChatMode, type ChatMessage, type ConversationRef, type LearnerProfile, type LessonContext } from './types';

/** How many earlier messages are sent with each request; older ones are dropped to keep CPU replies fast. */
export const CHAT_HISTORY_LIMIT = 16;

/** Teaching-card text is trimmed so a long lesson doesn't bloat every tutor request. */
const NOTE_CHARACTER_LIMIT = 400;

/** Course notes attached to a tutor question. Each one adds several seconds of prompt processing on a CPU. */
const REFERENCE_NOTE_LIMIT = 1;

/**
 * Minimum relevance for a note to be attached. A word found in only one note
 * of a ~25-note course scores about 3, so this needs at least one distinctive match.
 */
const MIN_NOTE_RELEVANCE = 2.5;

/** The single ongoing tutor conversation of a course. */
export function tutorConversation(courseId: string): ConversationRef {
  return { id: `${courseId}:tutor`, courseId, mode: ChatMode.TUTOR };
}

/** The saved conversation for one role-play scenario. */
export function rolePlayConversation({ courseId, scenarioId }: { courseId: string; scenarioId: string }): ConversationRef {
  return { id: `${courseId}:roleplay:${scenarioId}`, courseId, mode: ChatMode.ROLE_PLAY, scenarioId };
}

/**
 * The learner's level and the words they have been taught so far.
 *
 * Nouns are listed with their article (via the language pack) because that is
 * how the AI should use them. The level is that of the most advanced unit with
 * a completed lesson, defaulting to the course's first level.
 */
export function buildLearnerProfile({
  units,
  completedLessonIds,
  packs,
}: {
  units: Unit[];
  completedLessonIds: Set<string>;
  packs: CoursePacks;
}): LearnerProfile {
  const knownWords = new Set<string>();
  let level: string = units[0]?.level ?? CefrLevel.A1;

  for (const unit of units) {
    const vocabById = new Map(unit.vocab.map((item) => [item.id, item]));
    for (const lesson of unit.lessons) {
      if (!completedLessonIds.has(lesson.id)) continue;
      level = unit.level;
      for (const vocabId of lesson.introduces) {
        const vocab = vocabById.get(vocabId);
        if (!vocab) continue;
        knownWords.add(vocab.partOfSpeech === PartOfSpeech.NOUN ? packs.target.formatNoun(vocab) : vocab.text);
      }
    }
  }
  return { level, knownWords: [...knownWords] };
}

/** A scenario opens once every lesson of its unit is done, or always when everything is unlocked. */
export function isScenarioUnlocked({
  scenario,
  units,
  completedLessonIds,
  unlockAll,
}: {
  scenario: Scenario;
  units: Unit[];
  completedLessonIds: Set<string>;
  unlockAll: boolean;
}): boolean {
  if (unlockAll) {
    return true;
  }
  const unit = units.find((candidate) => candidate.id === scenario.unitId);
  if (!unit) {
    return false;
  }
  return unit.lessons.every((lesson) => completedLessonIds.has(lesson.id));
}

/** The latest messages, oldest first, capped so prompts stay small. */
export function recentMessages<T extends ChatMessage>(messages: T[], limit: number = CHAT_HISTORY_LIMIT): T[] {
  return messages.slice(-limit);
}

function languageName({ role, packs }: { role: LanguageRole; packs: CoursePacks }): string {
  return role === LanguageRole.TARGET ? packs.target.name : packs.base.name;
}

function otherLanguageName({ role, packs }: { role: LanguageRole; packs: CoursePacks }): string {
  return role === LanguageRole.TARGET ? packs.base.name : packs.target.name;
}

function quoteList(items: string[]): string {
  return items.map((item) => `"${item}"`).join(', ');
}

/**
 * Describes an exercise in plain words so the tutor can help with it.
 *
 * The answer is only included once the learner has answered: small models
 * leak answers they are told to keep secret, so they are simply not told.
 */
export function describeExercise({
  exercise,
  packs,
  includeAnswer,
}: {
  exercise: Exercise;
  packs: CoursePacks;
  includeAnswer: boolean;
}): string {
  const answer = (text: string) => (includeAnswer ? ` Correct answer: "${text}".` : '');
  switch (exercise.type) {
    case ExerciseType.TEACH:
      return `Teaching card "${exercise.title}": ${exercise.body.slice(0, NOTE_CHARACTER_LIMIT)}`;
    case ExerciseType.MULTIPLE_CHOICE:
      return (
        `Multiple choice. Question (${languageName({ role: exercise.promptLanguage, packs })}): "${exercise.prompt}". ` +
        `Options: ${quoteList(exercise.options)}.${answer(exercise.options[exercise.answerIndex])}`
      );
    case ExerciseType.MATCH_PAIRS:
      return `Match the pairs: ${exercise.pairs.map((pair) => `"${pair.target}" = "${pair.base}"`).join(', ')}.`;
    case ExerciseType.TRANSLATE:
      return (
        `Translate "${exercise.source}" from ${languageName({ role: exercise.sourceLanguage, packs })} ` +
        `into ${otherLanguageName({ role: exercise.sourceLanguage, packs })}.${answer(exercise.accepted[0])}`
      );
    case ExerciseType.WORD_ORDER:
      return `Put word tiles in order to say "${exercise.translation}" in ${packs.target.name}.${answer(exercise.answer)}`;
    case ExerciseType.CLOZE:
      return (
        `Fill the gap: "${exercise.before} ___ ${exercise.after}" (meaning: "${exercise.translation}").` +
        answer(exercise.accepted[0])
      );
    case ExerciseType.LISTEN_CHOOSE:
      return (
        `Listening: the learner hears a word and picks it from ${quoteList(exercise.options)}.` +
        answer(exercise.options[exercise.answerIndex])
      );
    case ExerciseType.LISTEN_TYPE:
      return `Dictation: the learner hears "${exercise.text}" ("${exercise.translation}") and types it.`;
    case ExerciseType.SHADOW:
      return `Pronunciation practice: say "${exercise.text}" ("${exercise.translation}") aloud.${exercise.hint ? ` Tip shown: ${exercise.hint}` : ''}`;
  }
}

/** What the in-lesson tutor needs to know about where the learner is. */
export function buildLessonContext({
  lesson,
  exercise,
  hasAnswered,
  notes,
  packs,
}: {
  lesson: Lesson;
  exercise: Exercise | null;
  hasAnswered: boolean;
  notes: TeachExercise[];
  packs: CoursePacks;
}): LessonContext {
  return {
    lessonTitle: lesson.title,
    notes: notes.map((note) => `${note.title}: ${note.body.slice(0, NOTE_CHARACTER_LIMIT)}`),
    exercise:
      exercise && exercise.type !== ExerciseType.TEACH
        ? describeExercise({ exercise, packs, includeAnswer: hasAnswered })
        : undefined,
    hasAnswered,
  };
}

function wordsOf(text: string): string[] {
  return text.toLowerCase().match(/\p{L}{3,}/gu) ?? [];
}

/** A grammar note as plain text, table included, for the tutor to read. */
export function formatGrammarNote(note: GrammarNote): string {
  const table = note.table ? `\n${note.table.map((row) => row.join(' | ')).join('\n')}` : '';
  return `${note.title}: ${note.body}${table}`;
}

/**
 * The course grammar notes most relevant to a question, best first.
 *
 * Small local models explain grammar unreliably, so the tutor is given the
 * course's own (reviewed) notes to explain from. Words are weighted by how
 * rare they are across notes, so common words in any language count for
 * little without needing a stop-word list.
 */
export function findRelevantGrammarNotes({ question, units }: { question: string; units: Unit[] }): GrammarNote[] {
  const notes = units.flatMap((unit) => unit.grammarNotes);
  const noteWords = notes.map((note) => new Set(wordsOf(formatGrammarNote(note))));
  const noteCountByWord = new Map<string, number>();
  for (const words of noteWords) {
    for (const word of words) {
      noteCountByWord.set(word, (noteCountByWord.get(word) ?? 0) + 1);
    }
  }

  const questionWords = new Set(wordsOf(question));
  const scored: { note: GrammarNote; score: number }[] = [];
  notes.forEach((note, index) => {
    let score = 0;
    for (const word of questionWords) {
      if (noteWords[index].has(word)) {
        score += Math.log(notes.length / (noteCountByWord.get(word) ?? 1));
      }
    }
    if (score >= MIN_NOTE_RELEVANCE) {
      scored.push({ note, score });
    }
  });

  scored.sort((first, second) => second.score - first.score);
  return scored.slice(0, REFERENCE_NOTE_LIMIT).map((entry) => entry.note);
}
