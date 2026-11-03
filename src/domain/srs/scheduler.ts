import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type Grade } from 'ts-fsrs';
import type { VocabItem } from '../content/types';
import { PartOfSpeech } from '../content/types';
import { AnswerResult } from '../grading/answerChecker';

export enum CardType {
  /** See/hear the target word, recall its meaning. Self-rated. */
  RECOGNIZE = 'RECOGNIZE',
  /** See the meaning, type the target word. Auto-graded. */
  PRODUCE = 'PRODUCE',
  /** See a noun, pick its article. Auto-graded. */
  GENDER = 'GENDER',
}

/** App-level rating so the UI never depends on the FSRS library directly. */
export enum ReviewRating {
  AGAIN = 'AGAIN',
  HARD = 'HARD',
  GOOD = 'GOOD',
  EASY = 'EASY',
}

export interface ReviewCard {
  id: string;
  courseId: string;
  unitId: string;
  vocabId: string;
  cardType: CardType;
  /** Due time in epoch ms, duplicated from `fsrs.due` so IndexedDB can index it. */
  due: number;
  fsrs: Card;
}

export interface ReviewLogEntry {
  cardId: string;
  courseId: string;
  rating: ReviewRating;
  reviewedAt: number;
  /** True when this was the card's first review; used to enforce the daily new-card limit. */
  wasNew: boolean;
}

const FSRS_RATING: Record<ReviewRating, Grade> = {
  [ReviewRating.AGAIN]: Rating.Again,
  [ReviewRating.HARD]: Rating.Hard,
  [ReviewRating.GOOD]: Rating.Good,
  [ReviewRating.EASY]: Rating.Easy,
};

const scheduler = fsrs(generatorParameters({ enable_fuzz: true }));

export function buildCardId({ courseId, vocabId, cardType }: { courseId: string; vocabId: string; cardType: CardType }): string {
  return `${courseId}:${vocabId}:${cardType}`;
}

/**
 * Creates the review cards a vocab item should have once it has been taught.
 *
 * Every item gets recognition and production cards; nouns also get a gender
 * card when the target language has grammatical gender.
 */
export function createCardsForVocab({
  courseId,
  unitId,
  vocab,
  languageHasGender,
  now,
}: {
  courseId: string;
  unitId: string;
  vocab: VocabItem;
  languageHasGender: boolean;
  now: Date;
}): ReviewCard[] {
  const cardTypes = [CardType.RECOGNIZE, CardType.PRODUCE];
  if (languageHasGender && vocab.partOfSpeech === PartOfSpeech.NOUN && vocab.gender) {
    cardTypes.push(CardType.GENDER);
  }

  return cardTypes.map((cardType) => {
    const fsrsCard = createEmptyCard(now);
    return {
      id: buildCardId({ courseId, vocabId: vocab.id, cardType }),
      courseId,
      unitId,
      vocabId: vocab.id,
      cardType,
      due: fsrsCard.due.getTime(),
      fsrs: fsrsCard,
    };
  });
}

/** True for cards that have never been reviewed. */
export function isNewCard(card: ReviewCard): boolean {
  return card.fsrs.state === State.New;
}

/** Applies a rating to a card and returns its next state plus a log entry. */
export function scheduleReview({
  card,
  rating,
  now,
}: {
  card: ReviewCard;
  rating: ReviewRating;
  now: Date;
}): { card: ReviewCard; log: ReviewLogEntry } {
  const next = scheduler.next(card.fsrs, now, FSRS_RATING[rating]);
  return {
    card: { ...card, fsrs: next.card, due: next.card.due.getTime() },
    log: {
      cardId: card.id,
      courseId: card.courseId,
      rating,
      reviewedAt: now.getTime(),
      wasNew: isNewCard(card),
    },
  };
}

/** Maps an auto-graded answer to a rating: a flagged-but-accepted answer is "hard". */
export function ratingForAnswer(result: AnswerResult): ReviewRating {
  if (result === AnswerResult.CORRECT) {
    return ReviewRating.GOOD;
  }
  if (result === AnswerResult.ALMOST) {
    return ReviewRating.HARD;
  }
  return ReviewRating.AGAIN;
}
