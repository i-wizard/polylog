import { CardType, createCardsForVocab, scheduleReview, ReviewRating, type ReviewCard } from '../../src/domain/srs/scheduler';
import { buildNounVocab } from './content';

export const FIXTURE_COURSE_ID = 'test-course';
export const FIXTURE_UNIT_ID = 'unit-1';

/** A never-reviewed card of the given type, due at `now`. */
export function buildNewCard({ cardType, now, vocabId = 'frau' }: { cardType: CardType; now: Date; vocabId?: string }): ReviewCard {
  const cards = createCardsForVocab({
    courseId: FIXTURE_COURSE_ID,
    unitId: FIXTURE_UNIT_ID,
    vocab: buildNounVocab({ id: vocabId }),
    languageHasGender: true,
    now,
  });
  return cards.find((card) => card.cardType === cardType) as ReviewCard;
}

/** A card that has been reviewed once (so it is no longer "new"), forced due at `due`. */
export function buildLearnedCard({ vocabId, due, now }: { vocabId: string; due: Date; now: Date }): ReviewCard {
  const fresh = buildNewCard({ cardType: CardType.RECOGNIZE, now, vocabId });
  const reviewed = scheduleReview({ card: fresh, rating: ReviewRating.GOOD, now }).card;
  return { ...reviewed, due: due.getTime(), fsrs: { ...reviewed.fsrs, due } };
}
