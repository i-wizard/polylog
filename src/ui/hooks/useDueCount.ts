import { useLiveQuery } from 'dexie-react-hooks';
import { loadReviewQueue } from '../../services/learning/learningService';
import { useApp } from '../AppContext';

/** Number of cards in today's review queue, kept live as reviews are done. */
export function useDueCount(): number | undefined {
  const { course, settings } = useApp();
  return useLiveQuery(
    async () => (await loadReviewQueue({ courseId: course.id, settings, now: new Date() })).length,
    [course.id, settings],
  );
}
