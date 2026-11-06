import type { Scenario } from '../content/types';
import type { CoursePacks } from '../grading/exerciseGrading';
import { ChatRole, type ChatMessage, type LearnerProfile, type LessonContext } from './types';

/**
 * Prompts for the local chat model.
 *
 * System prompts depend only on the learner and the scenario, never on the
 * latest message, so they stay identical between turns and the model server
 * can reuse its cached prompt prefix — important on a slow CPU. Anything that
 * changes per turn (the current exercise) is attached to the latest message.
 */

function knownWordsLine(profile: LearnerProfile): string {
  if (profile.knownWords.length === 0) {
    return 'The learner is a complete beginner and knows almost no words yet.';
  }
  return `Words the learner already knows (prefer these): ${profile.knownWords.join(', ')}.`;
}

/** System prompt for the open tutor chat. */
export function buildTutorSystemPrompt({ packs, profile }: { packs: CoursePacks; profile: LearnerProfile }): string {
  const target = packs.target.name;
  const base = packs.base.name;
  return [
    `You are a friendly, patient ${target} tutor inside a language-learning app.`,
    `The learner speaks ${base} and is learning ${target} at CEFR level ${profile.level}.`,
    knownWordsLine(profile),
    '',
    'Rules:',
    `- Reply in the language the learner writes in. If they write ${base}, explain in ${base} with short ${target} examples. If they write ${target}, reply in simple ${target} at level ${profile.level}.`,
    `- If the learner's ${target} contains mistakes, start with one short line giving the corrected version, then answer.`,
    '- When course notes are provided, base grammar explanations on them: they are correct.',
    '- Keep replies short: at most five sentences or a short list.',
    `- Put ${target} examples in **bold**.`,
    '- Use plain text. For lists, start lines with "- ".',
    '- If you are not sure about something, say so instead of guessing.',
  ].join('\n');
}

/** System prompt for an in-character role-play. */
export function buildRolePlaySystemPrompt({
  packs,
  profile,
  scenario,
}: {
  packs: CoursePacks;
  profile: LearnerProfile;
  scenario: Scenario;
}): string {
  const target = packs.target.name;
  return [
    `You are role-playing with a ${profile.level} learner of ${target} so they can practise conversation.`,
    `Scene: ${scenario.setting}`,
    `Your role: ${scenario.aiRole}`,
    `The learner is trying to: ${scenario.goals.join('; ')}.`,
    knownWordsLine(profile),
    '',
    'Rules:',
    `- Stay in character and speak only ${target}. If the learner uses another language, reply in very simple ${target} and encourage them to try in ${target}.`,
    '- Reply with one or two short sentences, usually ending with a simple question that keeps the conversation going.',
    `- Use ${profile.level}-level language: present tense and common words.`,
    "- Do not correct the learner's mistakes; reply naturally. The app has a separate button for corrections.",
    '- Gently steer the conversation towards the learner\'s goals. Once they are all done, end the conversation politely.',
    '- Use plain text only: no translations, notes, emojis or stage directions.',
  ].join('\n');
}

/** Extra information attached to the learner's latest message only. */
export interface TurnContext {
  lessonContext?: LessonContext;
  /** Course grammar notes relevant to the question, as plain text. */
  referenceNotes?: string[];
}

/** Wraps the learner's message with what they are looking at and any relevant course notes. */
export function attachTurnContext({ text, context }: { text: string; context: TurnContext }): string {
  const lines: string[] = [];
  const { lessonContext, referenceNotes = [] } = context;
  if (lessonContext) {
    lines.push(`The learner is in the lesson "${lessonContext.lessonTitle}".`);
    if (lessonContext.notes.length > 0) {
      lines.push(`Lesson notes so far: ${lessonContext.notes.join(' | ')}`);
    }
    if (lessonContext.exercise) {
      lines.push(`Current exercise: ${lessonContext.exercise}`);
      lines.push(
        lessonContext.hasAnswered
          ? 'The learner has already answered it, so you may explain the answer fully.'
          : 'The learner has not answered it yet. Help them work it out with a hint instead of giving the answer.',
      );
    }
  }
  if (referenceNotes.length > 0) {
    lines.push(`Course notes that may help:\n${referenceNotes.join('\n\n')}`);
  }
  if (lines.length === 0) {
    return text;
  }
  return `[${lines.join('\n')}]\n\n${text}`;
}

/**
 * The full message list for a chat request: system prompt, then the recent
 * history. `context`, when given, is attached to the latest learner message.
 */
export function assembleChatMessages({
  systemPrompt,
  history,
  context,
}: {
  systemPrompt: string;
  history: ChatMessage[];
  context?: TurnContext;
}): ChatMessage[] {
  const messages: ChatMessage[] = [{ role: ChatRole.SYSTEM, content: systemPrompt }];
  history.forEach((message, index) => {
    const isLatest = index === history.length - 1;
    if (isLatest && context && message.role === ChatRole.USER) {
      messages.push({ role: message.role, content: attachTurnContext({ text: message.content, context }) });
    } else {
      messages.push({ role: message.role, content: message.content });
    }
  });
  return messages;
}

/** Messages asking for a plain translation into the learner's language. */
export function buildTranslateMessages({ packs, text }: { packs: CoursePacks; text: string }): ChatMessage[] {
  return [
    {
      role: ChatRole.SYSTEM,
      content: `Translate the ${packs.target.name} text from the user into natural ${packs.base.name}. Reply with the translation only.`,
    },
    { role: ChatRole.USER, content: text },
  ];
}

/**
 * Messages asking the model to check one learner sentence. The reply must be
 * JSON matching `SENTENCE_CHECK_SCHEMA`.
 */
export function buildCheckMessages({
  packs,
  profile,
  text,
  previousReply,
}: {
  packs: CoursePacks;
  profile: LearnerProfile;
  text: string;
  previousReply?: string;
}): ChatMessage[] {
  const target = packs.target.name;
  const replyContext = previousReply ? `It was a reply to: "${previousReply}"\n` : '';
  return [
    {
      role: ChatRole.SYSTEM,
      content: [
        `You are a careful ${target} teacher checking a sentence written by a ${profile.level} learner.`,
        `Decide whether it is correct, natural ${target}. Ignore a missing full stop.`,
        'Answer in JSON with these fields:',
        '- isCorrect: true or false',
        `- corrected: the corrected sentence in ${target} (the original if it was already correct)`,
        `- explanation: one short sentence in ${packs.base.name} that quotes the exact word you changed and says why (empty if correct)`,
      ].join('\n'),
    },
    { role: ChatRole.USER, content: `${replyContext}Learner's sentence: "${text}"` },
  ];
}

/** JSON schema the model's sentence-check reply must follow. */
export const SENTENCE_CHECK_SCHEMA = {
  type: 'object',
  properties: {
    isCorrect: { type: 'boolean' },
    corrected: { type: 'string' },
    explanation: { type: 'string' },
  },
  required: ['isCorrect', 'corrected', 'explanation'],
} as const;
