/**
 * The primary action at the bottom of an exercise. Hidden once the answer is
 * locked, because the feedback sheet takes its place.
 */
export function CheckButton({
  isLocked,
  isReady,
  onCheck,
  label = 'Check',
}: {
  isLocked: boolean;
  isReady: boolean;
  onCheck: () => void;
  label?: string;
}) {
  if (isLocked) {
    return null;
  }
  return (
    <div className="exercise-footer">
      <button type="button" className="button button--primary button--block" disabled={!isReady} onClick={onCheck}>
        {label}
      </button>
    </div>
  );
}
