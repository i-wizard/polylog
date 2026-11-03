/**
 * Edit distance between two strings (insertions, deletions, substitutions).
 *
 * Used for typo tolerance and for picking the closest accepted answer to show
 * after a wrong attempt. Inputs are short, so the simple O(n·m) version is fine.
 */
export function levenshteinDistance({ from, to }: { from: string; to: string }): number {
  let previousRow = Array.from({ length: to.length + 1 }, (_, index) => index);

  for (let i = 1; i <= from.length; i += 1) {
    const currentRow = [i];
    for (let j = 1; j <= to.length; j += 1) {
      const substitutionCost = from[i - 1] === to[j - 1] ? 0 : 1;
      currentRow.push(
        Math.min(
          previousRow[j] + 1,
          currentRow[j - 1] + 1,
          previousRow[j - 1] + substitutionCost,
        ),
      );
    }
    previousRow = currentRow;
  }

  return previousRow[to.length];
}

/** Number of leading characters two strings share. */
export function commonPrefixLength({ first, second }: { first: string; second: string }): number {
  const limit = Math.min(first.length, second.length);
  let length = 0;
  while (length < limit && first[length] === second[length]) {
    length += 1;
  }
  return length;
}
