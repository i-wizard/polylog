const SENTENCE_PUNCTUATION = /[.,!?;:¡¿"«»„“”]/g;

/**
 * Default tokenizer for languages that separate words with spaces.
 *
 * Strips sentence punctuation so word tiles show bare words ("Anna." → "Anna").
 * Languages without spaces (Japanese, Chinese) supply their own tokenizer.
 */
export function whitespaceTokenize(sentence: string): string[] {
  return sentence
    .replace(SENTENCE_PUNCTUATION, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 0);
}
