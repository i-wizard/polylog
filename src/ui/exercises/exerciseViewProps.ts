import type { Exercise } from '../../domain/content/types';
import type { AnswerOutcome } from '../../domain/grading/exerciseGrading';

/** Props shared by every exercise renderer. */
export interface ExerciseViewProps<T extends Exercise> {
  exercise: T;
  /** True once the answer has been checked; inputs must be read-only. */
  isLocked: boolean;
  onSubmit: (outcome: AnswerOutcome) => void;
}
