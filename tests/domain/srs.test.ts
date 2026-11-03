import { describe, expect, it } from 'vitest';
import { AnswerResult } from '../../src/domain/grading/answerChecker';
import { buildReviewQueue } from '../../src/domain/srs/reviewQueue';
import {
  CardType,
  ReviewRating,
  createCardsForVocab,
  isNewCard,
  ratingForAnswer,
  scheduleReview,
} from '../../src/domain/srs/scheduler';
import { FIXTURE_COURSE_ID, FIXTURE_UNIT_ID, buildLearnedCard, buildNewCard, buildNounVocab, buildPhraseVocab } from '../fixtures';

const NOW = new Date('2026-11-03T09:00:00');
const EARLIER = new Date('2026-11-01T09:00:00');
const MUCH_EARLIER = new Date('2026-10-20T09:00:00');

describe('createCardsForVocab', () => {
  it('creates recognise, produce and gender cards for a noun', () => {
    const cards = createCardsForVocab({
      courseId: FIXTURE_COURSE_ID,
      unitId: FIXTURE_UNIT_ID,
      vocab: buildNounVocab(),
      languageHasGender: true,
      now: NOW,
    });
    expect(cards.map((card) => card.cardType)).toEqual([CardType.RECOGNIZE, CardType.PRODUCE, CardType.GENDER]);
    expect(cards[0].id).toBe(`${FIXTURE_COURSE_ID}:frau:RECOGNIZE`);
    expect(cards.every((card) => card.due === NOW.getTime())).toBe(true);
  });

  it('skips the gender card for non-nouns', () => {
    const cards = createCardsForVocab({
      courseId: FIXTURE_COURSE_ID,
      unitId: FIXTURE_UNIT_ID,
      vocab: buildPhraseVocab(),
      languageHasGender: true,
      now: NOW,
    });
    expect(cards.map((card) => card.cardType)).toEqual([CardType.RECOGNIZE, CardType.PRODUCE]);
  });
});

describe('scheduleReview', () => {
  it('moves the due date forward and logs the first review as new', () => {
    const card = buildNewCard({ cardType: CardType.RECOGNIZE, now: NOW });
    const { card: reviewed, log } = scheduleReview({ card, rating: ReviewRating.GOOD, now: NOW });
    expect(reviewed.due).toBeGreaterThan(NOW.getTime());
    expect(reviewed.due).toBe(reviewed.fsrs.due.getTime());
    expect(isNewCard(reviewed)).toBe(false);
    expect(log).toEqual({
      cardId: card.id,
      courseId: FIXTURE_COURSE_ID,
      rating: ReviewRating.GOOD,
      reviewedAt: NOW.getTime(),
      wasNew: true,
    });
  });

  it('schedules "again" sooner than "easy"', () => {
    const card = buildNewCard({ cardType: CardType.PRODUCE, now: NOW });
    const again = scheduleReview({ card, rating: ReviewRating.AGAIN, now: NOW }).card;
    const easy = scheduleReview({ card, rating: ReviewRating.EASY, now: NOW }).card;
    expect(again.due).toBeLessThan(easy.due);
  });
});

describe('ratingForAnswer', () => {
  it('maps answer results to ratings', () => {
    expect(ratingForAnswer(AnswerResult.CORRECT)).toBe(ReviewRating.GOOD);
    expect(ratingForAnswer(AnswerResult.ALMOST)).toBe(ReviewRating.HARD);
    expect(ratingForAnswer(AnswerResult.WRONG)).toBe(ReviewRating.AGAIN);
  });
});

describe('buildReviewQueue', () => {
  it('puts learned cards first, most overdue first, then new cards by type', () => {
    const recentlyDue = buildLearnedCard({ vocabId: 'a', due: EARLIER, now: MUCH_EARLIER });
    const longOverdue = buildLearnedCard({ vocabId: 'b', due: MUCH_EARLIER, now: MUCH_EARLIER });
    const newProduce = buildNewCard({ cardType: CardType.PRODUCE, now: NOW });
    const newRecognize = buildNewCard({ cardType: CardType.RECOGNIZE, now: NOW });

    const queue = buildReviewQueue({
      dueCards: [newProduce, recentlyDue, newRecognize, longOverdue],
      newCardsAllowed: 10,
      reviewsAllowed: 10,
    });

    expect(queue.map((card) => card.id)).toEqual([longOverdue.id, recentlyDue.id, newRecognize.id, newProduce.id]);
  });

  it('respects the new-card and total limits', () => {
    const learned = buildLearnedCard({ vocabId: 'a', due: EARLIER, now: MUCH_EARLIER });
    const newCards = [CardType.RECOGNIZE, CardType.PRODUCE, CardType.GENDER].map((cardType) => buildNewCard({ cardType, now: NOW }));

    expect(buildReviewQueue({ dueCards: [learned, ...newCards], newCardsAllowed: 1, reviewsAllowed: 10 })).toHaveLength(2);
    expect(buildReviewQueue({ dueCards: [learned, ...newCards], newCardsAllowed: 10, reviewsAllowed: 2 })).toHaveLength(2);
    expect(buildReviewQueue({ dueCards: newCards, newCardsAllowed: -3, reviewsAllowed: 10 })).toHaveLength(0);
  });
});
