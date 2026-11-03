import type { VocabItem } from '../../domain/content/types';
import type { LessonResult } from '../../domain/session/lessonSession';
import { NounLabel } from '../components/NounLabel';
import { Speakable } from '../components/Speakable';
import { useApp } from '../AppContext';

/** End-of-lesson screen: accuracy, XP earned and the words now in review. */
export function LessonSummary({
  result,
  xpEarned,
  newWords,
  onDone,
}: {
  result: LessonResult;
  xpEarned: number;
  newWords: VocabItem[];
  onDone: () => void;
}) {
  const { packs } = useApp();
  const accuracy = result.totalExercises === 0 ? 100 : Math.round((result.firstTryCorrect / result.totalExercises) * 100);

  return (
    <div className="screen lesson-summary">
      <h1 className="lesson-summary__title">{result.isPerfect ? 'Perfekt!' : 'Gut gemacht!'}</h1>
      <p className="muted">Lesson complete</p>
      <div className="stat-row">
        <div className="stat">
          <span className="stat__value">+{xpEarned}</span>
          <span className="stat__label">XP</span>
        </div>
        <div className="stat">
          <span className="stat__value">{accuracy}%</span>
          <span className="stat__label">first-try accuracy</span>
        </div>
      </div>
      {newWords.length > 0 && (
        <section className="card">
          <h2 className="card__title">Added to your review deck</h2>
          <ul className="word-list">
            {newWords.map((word) => (
              <li key={word.id} className="word-list__item">
                <Speakable text={packs.target.formatNoun(word)} display={<NounLabel vocab={word} />} />
                <span className="muted">{word.translations[0]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="screen-footer">
        <button type="button" className="button button--primary button--block" onClick={onDone}>
          Continue
        </button>
      </div>
    </div>
  );
}
