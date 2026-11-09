import { useEffect, useState } from 'react';
import { PartOfSpeech, type VocabItem } from '../../domain/content/types';
import { AnswerResult, checkAnswer } from '../../domain/grading/answerChecker';
import type { AnswerOutcome } from '../../domain/grading/exerciseGrading';
import { CardType, ratingForAnswer, ReviewRating } from '../../domain/srs/scheduler';
import { useApp } from '../AppContext';
import { AnswerInput } from '../components/AnswerInput';
import { FeedbackSheet } from '../components/FeedbackSheet';
import { ListenFirstPrompt } from '../components/ListenFirstPrompt';
import { NounLabel } from '../components/NounLabel';
import { Speakable } from '../components/Speakable';
import { CheckButton } from '../exercises/CheckButton';
import { useSpeaker } from '../hooks/useSpeaker';

const SELF_RATINGS = [
  { rating: ReviewRating.AGAIN, label: 'Again' },
  { rating: ReviewRating.HARD, label: 'Hard' },
  { rating: ReviewRating.GOOD, label: 'Good' },
  { rating: ReviewRating.EASY, label: 'Easy' },
];

interface CardViewProps {
  vocab: VocabItem;
  onRated: (rating: ReviewRating) => void;
}

/** Renders the right interaction for a review card's type. */
export function ReviewCardView({ cardType, vocab, onRated }: CardViewProps & { cardType: CardType }) {
  switch (cardType) {
    case CardType.RECOGNIZE:
      return <RecognizeCard vocab={vocab} onRated={onRated} />;
    case CardType.PRODUCE:
      return <ProduceCard vocab={vocab} onRated={onRated} />;
    case CardType.GENDER:
      return <GenderCard vocab={vocab} onRated={onRated} />;
  }
}

/** Hear/see the word, recall its meaning, reveal, then rate yourself honestly. */
function RecognizeCard({ vocab, onRated }: CardViewProps) {
  const { packs } = useApp();
  const speakTarget = useSpeaker();
  const [isRevealed, setIsRevealed] = useState(false);
  const spokenForm = packs.target.formatNoun(vocab);

  useEffect(() => {
    speakTarget(spokenForm);
  }, [speakTarget, spokenForm]);

  return (
    <>
      <div className="exercise-body">
        <p className="exercise-kicker">What does this mean?</p>
        <div className="exercise-prompt">
          <ListenFirstPrompt text={spokenForm} display={<NounLabel vocab={vocab} />} isLocked={isRevealed} />
        </div>
        {isRevealed && (
          <div className="card reveal">
            <p className="reveal__answer">{vocab.translations.join(' / ')}</p>
            {vocab.example && (
              <>
                <Speakable text={vocab.example.text} />
                <p className="muted">{vocab.example.translation}</p>
              </>
            )}
          </div>
        )}
      </div>
      <div className="exercise-footer">
        {isRevealed ? (
          <div className="rating-row">
            {SELF_RATINGS.map(({ rating, label }) => (
              <button
                key={rating}
                type="button"
                className={`button rating rating--${rating.toLowerCase()}`}
                onClick={() => onRated(rating)}
              >
                {label}
              </button>
            ))}
          </div>
        ) : (
          <button type="button" className="button button--primary button--block" onClick={() => setIsRevealed(true)}>
            Show answer
          </button>
        )}
      </div>
    </>
  );
}

/** See the meaning, type the word (nouns with their article). */
function ProduceCard({ vocab, onRated }: CardViewProps) {
  const { packs } = useApp();
  const speakTarget = useSpeaker();
  const [answer, setAnswer] = useState('');
  const [outcome, setOutcome] = useState<AnswerOutcome | null>(null);
  const expected = packs.target.formatNoun(vocab);
  const needsArticle = vocab.partOfSpeech === PartOfSpeech.NOUN && packs.target.genders.length > 0;

  const handleCheck = () => {
    if (answer.trim().length === 0 || outcome) {
      return;
    }
    const check = checkAnswer({ given: answer, accepted: [expected], pack: packs.target });
    setOutcome({ result: check.result, note: check.note, correctAnswer: expected, speakText: expected });
    speakTarget(expected);
  };

  return (
    <>
      <div className="exercise-body">
        <p className="exercise-kicker">How do you say this in {packs.target.name}?</p>
        <div className="exercise-prompt">
          <span>{vocab.translations[0]}</span>
        </div>
        {needsArticle && <p className="exercise-hint">Include the article ({packs.target.genders.map((g) => g.article).join(' / ')}).</p>}
        <AnswerInput
          value={answer}
          onChange={setAnswer}
          onEnter={handleCheck}
          specialCharacters={packs.target.specialCharacters}
          placeholder={`Type in ${packs.target.name}`}
          disabled={outcome !== null}
          lang={packs.target.code}
        />
      </div>
      <CheckButton isLocked={outcome !== null} isReady={answer.trim().length > 0} onCheck={handleCheck} />
      {outcome && <FeedbackSheet outcome={outcome} onContinue={() => onRated(ratingForAnswer(outcome.result))} />}
    </>
  );
}

/** See a noun without its article and pick the right one. */
function GenderCard({ vocab, onRated }: CardViewProps) {
  const { packs } = useApp();
  const speakTarget = useSpeaker();
  const [outcome, setOutcome] = useState<AnswerOutcome | null>(null);
  const expected = packs.target.formatNoun(vocab);

  const handleChoice = (genderCode: string) => {
    if (outcome) {
      return;
    }
    const result = genderCode === vocab.gender ? AnswerResult.CORRECT : AnswerResult.WRONG;
    setOutcome({ result, correctAnswer: expected, speakText: expected });
    speakTarget(expected);
  };

  return (
    <>
      <div className="exercise-body">
        <p className="exercise-kicker">Which article?</p>
        <div className="exercise-prompt">
          <span className="big-word" lang={packs.target.code}>
            {vocab.text}
          </span>
          <span className="muted">{vocab.translations[0]}</span>
        </div>
        <div className="gender-row">
          {packs.target.genders.map((gender) => (
            <button
              key={gender.code}
              type="button"
              className="button gender-button"
              style={{ borderColor: `var(--${gender.colorToken})`, color: `var(--${gender.colorToken})` }}
              disabled={outcome !== null}
              onClick={() => handleChoice(gender.code)}
            >
              {gender.article}
            </button>
          ))}
        </div>
      </div>
      {outcome && <FeedbackSheet outcome={outcome} onContinue={() => onRated(ratingForAnswer(outcome.result))} />}
    </>
  );
}
