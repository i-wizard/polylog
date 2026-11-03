import { CardType, isNewCard, type ReviewCard } from './scheduler';

/** Recognition first, production last: you see a word before you must produce it. */
const NEW_CARD_TYPE_ORDER: Record<CardType, number> = {
  [CardType.RECOGNIZE]: 0,
  [CardType.GENDER]: 1,
  [CardType.PRODUCE]: 2,
};

/**
 * Orders due cards into today's review session.
 *
 * Reviews of already-learned cards come first (most overdue first), then new
 * cards up to the remaining daily allowance. New cards are grouped by card
 * type so the three cards of one word are not shown back to back.
 */
export function buildReviewQueue({
  dueCards,
  newCardsAllowed,
  reviewsAllowed,
}: {
  dueCards: ReviewCard[];
  newCardsAllowed: number;
  reviewsAllowed: number;
}): ReviewCard[] {
  const learned: ReviewCard[] = [];
  const fresh: ReviewCard[] = [];
  for (const card of dueCards) {
    if (isNewCard(card)) {
      fresh.push(card);
    } else {
      learned.push(card);
    }
  }

  learned.sort((first, second) => first.due - second.due);
  fresh.sort(
    (first, second) =>
      NEW_CARD_TYPE_ORDER[first.cardType] - NEW_CARD_TYPE_ORDER[second.cardType] || first.due - second.due,
  );

  const queue = [...learned, ...fresh.slice(0, Math.max(newCardsAllowed, 0))];
  return queue.slice(0, Math.max(reviewsAllowed, 0));
}
