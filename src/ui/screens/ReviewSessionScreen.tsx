import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { VocabItem } from '../../domain/content/types';
import { ReviewRating, type ReviewCard } from '../../domain/srs/scheduler';
import { loadReviewQueue, submitReview } from '../../services/learning/learningService';
import { stopSpeaking } from '../../services/speech/speechService';
import { Logger } from '../../utils/logger';
import { useApp } from '../AppContext';
import { ProgressBar } from '../components/ProgressBar';
import { ReviewCardView } from '../review/ReviewCardView';

/**
 * Works through today's review queue. Cards rated "Again" go to the back of
 * the queue so they're seen once more before the session ends.
 */
export function ReviewSessionScreen() {
  const navigate = useNavigate();
  const { course, units, settings } = useApp();
  const [queue, setQueue] = useState<ReviewCard[] | null>(null);
  const [initialSize, setInitialSize] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const vocabByKey = useMemo(() => {
    const map = new Map<string, VocabItem>();
    for (const unit of units) {
      for (const vocab of unit.vocab) {
        map.set(`${unit.id}/${vocab.id}`, vocab);
      }
    }
    return map;
  }, [units]);

  useEffect(() => {
    loadReviewQueue({ courseId: course.id, settings, now: new Date() }).then((cards) => {
      // Content may have been edited since a card was created; skip cards whose word is gone.
      const playable = cards.filter((candidate) => vocabByKey.has(`${candidate.unitId}/${candidate.vocabId}`));
      if (playable.length < cards.length) {
        Logger.warn('Skipping review cards with missing vocab', { skipped: cards.length - playable.length });
      }
      setQueue(playable);
      setInitialSize(playable.length);
    });
  }, [course.id, settings, vocabByKey]);

  if (queue === null) {
    return <div className="screen centered-message">Loading…</div>;
  }

  const card = queue[0];
  if (!card) {
    return (
      <div className="screen lesson-summary">
        <h1 className="lesson-summary__title">Fertig!</h1>
        <p className="muted">{reviewedCount} reviews done. +{reviewedCount} XP</p>
        <div className="screen-footer">
          <button type="button" className="button button--primary button--block" onClick={() => navigate('/')}>
            Continue
          </button>
        </div>
      </div>
    );
  }

  const vocab = vocabByKey.get(`${card.unitId}/${card.vocabId}`) as VocabItem;

  const handleRated = async (rating: ReviewRating) => {
    if (isSaving) {
      return;
    }
    setIsSaving(true);
    try {
      const updated = await submitReview({ card, rating, now: new Date() });
      const rest = queue.slice(1);
      setQueue(rating === ReviewRating.AGAIN ? [...rest, updated] : rest);
      setReviewedCount(reviewedCount + 1);
    } catch (error) {
      Logger.error('Failed to save review', { cardId: card.id, error });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExit = () => {
    stopSpeaking();
    navigate('/review');
  };

  return (
    <div className="lesson-player">
      <header className="lesson-player__header">
        <button type="button" className="icon-button" aria-label="End review" onClick={handleExit}>
          <X size={24} />
        </button>
        <ProgressBar value={initialSize === 0 ? 1 : Math.min(reviewedCount / initialSize, 1)} label="Review progress" />
      </header>
      <main className="lesson-player__main">
        <ReviewCardView key={`${card.id}#${reviewedCount}`} cardType={card.cardType} vocab={vocab} onRated={handleRated} />
      </main>
    </div>
  );
}
