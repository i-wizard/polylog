import { ExerciseType, type Exercise } from '../../domain/content/types';
import type { AnswerOutcome } from '../../domain/grading/exerciseGrading';
import { ClozeView } from './ClozeView';
import { ListenChooseView } from './ListenChooseView';
import { ListenTypeView } from './ListenTypeView';
import { MatchPairsView } from './MatchPairsView';
import { MultipleChoiceView } from './MultipleChoiceView';
import { ShadowView } from './ShadowView';
import { TeachView } from './TeachView';
import { TranslateView } from './TranslateView';
import { WordOrderView } from './WordOrderView';

/** Exercise types that complete without a feedback sheet (nothing to correct). */
export const SELF_COMPLETING_TYPES = new Set([ExerciseType.TEACH, ExerciseType.MATCH_PAIRS, ExerciseType.SHADOW]);

/** Picks the renderer for an exercise type. */
export function ExerciseView({
  exercise,
  isLocked,
  onSubmit,
}: {
  exercise: Exercise;
  isLocked: boolean;
  onSubmit: (outcome: AnswerOutcome) => void;
}) {
  switch (exercise.type) {
    case ExerciseType.TEACH:
      return <TeachView exercise={exercise} isLocked={isLocked} onSubmit={onSubmit} />;
    case ExerciseType.MULTIPLE_CHOICE:
      return <MultipleChoiceView exercise={exercise} isLocked={isLocked} onSubmit={onSubmit} />;
    case ExerciseType.MATCH_PAIRS:
      return <MatchPairsView exercise={exercise} isLocked={isLocked} onSubmit={onSubmit} />;
    case ExerciseType.TRANSLATE:
      return <TranslateView exercise={exercise} isLocked={isLocked} onSubmit={onSubmit} />;
    case ExerciseType.WORD_ORDER:
      return <WordOrderView exercise={exercise} isLocked={isLocked} onSubmit={onSubmit} />;
    case ExerciseType.CLOZE:
      return <ClozeView exercise={exercise} isLocked={isLocked} onSubmit={onSubmit} />;
    case ExerciseType.LISTEN_CHOOSE:
      return <ListenChooseView exercise={exercise} isLocked={isLocked} onSubmit={onSubmit} />;
    case ExerciseType.LISTEN_TYPE:
      return <ListenTypeView exercise={exercise} isLocked={isLocked} onSubmit={onSubmit} />;
    case ExerciseType.SHADOW:
      return <ShadowView exercise={exercise} isLocked={isLocked} onSubmit={onSubmit} />;
  }
}
