import type { VocabItem } from '../../domain/content/types';
import { useApp } from '../AppContext';

/**
 * A vocab item as it should be memorised. Nouns show their article in the
 * gender colour (der = blue, die = red, das = green for German).
 */
export function NounLabel({ vocab }: { vocab: VocabItem }) {
  const { packs } = useApp();
  const gender = packs.target.genders.find((definition) => definition.code === vocab.gender);

  if (!gender) {
    return <span>{vocab.text}</span>;
  }
  return (
    <span className="noun-label" style={{ color: `var(--${gender.colorToken})` }}>
      {packs.target.formatNoun(vocab)}
    </span>
  );
}
