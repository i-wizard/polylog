/**
 * Returns a shuffled copy (Fisher–Yates).
 *
 * `random` is injectable so tests can make shuffles deterministic.
 */
export function shuffle<T>({ items, random = Math.random }: { items: T[]; random?: () => number }): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}
