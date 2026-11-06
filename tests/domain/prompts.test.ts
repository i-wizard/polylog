import { describe, expect, it } from 'vitest';
import {
  assembleChatMessages,
  attachTurnContext,
  buildCheckMessages,
  buildRolePlaySystemPrompt,
  buildTutorSystemPrompt,
} from '../../src/domain/ai/prompts';
import { ChatRole, type LearnerProfile, type LessonContext } from '../../src/domain/ai/types';
import { GERMAN_ENGLISH_PACKS, buildScenario } from '../fixtures';

const PROFILE: LearnerProfile = { level: 'A1', knownWords: ['der Kaffee', 'trinken'] };
const SYSTEM_PROMPT = 'You are a tutor.';
const HINT_FIRST_RULE = 'Help them work it out with a hint instead of giving the answer';
const LESSON_CONTEXT: LessonContext = {
  lessonTitle: 'Drinks',
  notes: [],
  exercise: 'Translate "coffee" from English into German.',
  hasAnswered: false,
};

describe('buildTutorSystemPrompt', () => {
  it('replies in the language the learner writes in, at their level', () => {
    const prompt = buildTutorSystemPrompt({ packs: GERMAN_ENGLISH_PACKS, profile: PROFILE });
    expect(prompt).toContain('Reply in the language the learner writes in');
    expect(prompt).toContain('reply in simple German at level A1');
    expect(prompt).toContain('der Kaffee, trinken');
    expect(prompt).toContain('base grammar explanations on them');
  });
});

describe('buildRolePlaySystemPrompt', () => {
  it('briefs the AI on the scene, role, goals and known words', () => {
    const prompt = buildRolePlaySystemPrompt({ packs: GERMAN_ENGLISH_PACKS, profile: PROFILE, scenario: buildScenario() });
    expect(prompt).toContain('Scene: A small café in Vienna.');
    expect(prompt).toContain('Your role: A friendly waiter.');
    expect(prompt).toContain('Order a drink; Ask for the bill');
    expect(prompt).toContain('speak only German');
    expect(prompt).toContain('der Kaffee, trinken');
  });
});

describe('assembleChatMessages', () => {
  const history = [
    { role: ChatRole.ASSISTANT, content: 'Hallo!' },
    { role: ChatRole.USER, content: 'How do I say coffee?' },
  ];

  it('puts the system prompt first and keeps the history in order', () => {
    const messages = assembleChatMessages({ systemPrompt: SYSTEM_PROMPT, history });
    expect(messages).toEqual([{ role: ChatRole.SYSTEM, content: SYSTEM_PROMPT }, ...history]);
  });

  it('attaches the lesson context with the hint-first rule to the latest learner message only', () => {
    const messages = assembleChatMessages({ systemPrompt: SYSTEM_PROMPT, history, context: { lessonContext: LESSON_CONTEXT } });
    expect(messages[0].content).toBe(SYSTEM_PROMPT);
    expect(messages[1].content).toBe('Hallo!');
    expect(messages[2].content).toContain('Current exercise: Translate "coffee"');
    expect(messages[2].content).toContain(HINT_FIRST_RULE);
    expect(messages[2].content.endsWith('How do I say coffee?')).toBe(true);
  });

  it('allows the full answer once the learner has answered', () => {
    const messages = assembleChatMessages({
      systemPrompt: SYSTEM_PROMPT,
      history,
      context: { lessonContext: { ...LESSON_CONTEXT, hasAnswered: true } },
    });
    expect(messages[2].content).not.toContain(HINT_FIRST_RULE);
    expect(messages[2].content).toContain('you may explain the answer fully');
  });
});

describe('attachTurnContext', () => {
  it('adds course notes for the tutor to explain from', () => {
    const content = attachTurnContext({ text: 'Why einen?', context: { referenceNotes: ['The accusative: ein becomes einen.'] } });
    expect(content).toBe('[Course notes that may help:\nThe accusative: ein becomes einen.]\n\nWhy einen?');
  });

  it('leaves the message alone when there is no context', () => {
    expect(attachTurnContext({ text: 'Hallo', context: {} })).toBe('Hallo');
  });
});

describe('buildCheckMessages', () => {
  it('includes the sentence and the line it replied to', () => {
    const messages = buildCheckMessages({
      packs: GERMAN_ENGLISH_PACKS,
      profile: PROFILE,
      text: 'Ich möchte ein Kaffee',
      previousReply: 'Was möchten Sie?',
    });
    expect(messages[0].role).toBe(ChatRole.SYSTEM);
    expect(messages[1].content).toContain('It was a reply to: "Was möchten Sie?"');
    expect(messages[1].content).toContain('"Ich möchte ein Kaffee"');
  });
});
