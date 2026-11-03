import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { countCards } from '../../services/storage/cardRepository';
import { useApp } from '../AppContext';
import { useDueCount } from '../hooks/useDueCount';

/** Review tab: how many cards are due, and the button to start. */
export function ReviewScreen() {
  const { course } = useApp();
  const dueCount = useDueCount();
  const totalCards = useLiveQuery(() => countCards(course.id), [course.id]);

  return (
    <div className="screen">
      <header className="screen-header">
        <h1 className="screen-title">Review</h1>
      </header>
      <section className="card">
        <div className="stat-row">
          <div className="stat">
            <span className="stat__value">{dueCount ?? '…'}</span>
            <span className="stat__label">due now</span>
          </div>
          <div className="stat">
            <span className="stat__value">{totalCards ?? '…'}</span>
            <span className="stat__label">cards in deck</span>
          </div>
        </div>
        <p className="muted">
          Cards come back just before you'd forget them. A few minutes every day beats a long session once a week.
        </p>
      </section>
      {dueCount ? (
        <Link to="/review/session" className="button button--primary button--block">
          Start review
        </Link>
      ) : (
        <p className="muted centered">
          {totalCards ? 'All caught up — come back later.' : 'Finish a lesson to add words to your deck.'}
        </p>
      )}
    </div>
  );
}
