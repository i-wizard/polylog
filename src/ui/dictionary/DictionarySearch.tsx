import { Search } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import { PartOfSpeech } from '../../domain/content/types';
import { entryAsVocab, searchDictionary, type DictionaryResult } from '../../domain/dictionary/dictionary';
import { useApp } from '../AppContext';
import { NounLabel } from '../components/NounLabel';
import { Speakable } from '../components/Speakable';
import { DictionaryStatus, useDictionary } from '../hooks/useDictionary';

const PART_OF_SPEECH_LABELS: Record<PartOfSpeech, string> = {
  [PartOfSpeech.NOUN]: 'noun',
  [PartOfSpeech.VERB]: 'verb',
  [PartOfSpeech.ADJECTIVE]: 'adjective',
  [PartOfSpeech.ADVERB]: 'adverb',
  [PartOfSpeech.PRONOUN]: 'pronoun',
  [PartOfSpeech.PREPOSITION]: 'preposition',
  [PartOfSpeech.CONJUNCTION]: 'conjunction',
  [PartOfSpeech.QUESTION_WORD]: 'question word',
  [PartOfSpeech.NUMBER]: 'number',
  [PartOfSpeech.INTERJECTION]: 'interjection',
  [PartOfSpeech.PHRASE]: 'phrase',
  [PartOfSpeech.ARTICLE]: 'article',
  [PartOfSpeech.DETERMINER]: 'determiner',
  [PartOfSpeech.PARTICLE]: 'particle',
};

/**
 * Search box and results for the dictionary: look up words in either
 * language, see their meaning and hear them. Used by the Dictionary tab and
 * by the dictionary sheet inside lessons.
 */
export function DictionarySearch({ autoFocus = false }: { autoFocus?: boolean }) {
  const { packs } = useApp();
  const { status, index, source } = useDictionary();
  const [query, setQuery] = useState('');
  // Keeps typing responsive while results for the previous keystroke are computed.
  const deferredQuery = useDeferredValue(query);
  const results = useMemo(
    () => (index ? searchDictionary({ index, query: deferredQuery }) : []),
    [index, deferredQuery],
  );
  const hasQuery = deferredQuery.trim().length > 0;

  return (
    <>
      <label className="dictionary-search">
        <Search size={20} aria-hidden />
        <input
          type="search"
          className="text-field"
          value={query}
          placeholder={`${packs.target.name} or ${packs.base.name} word`}
          aria-label="Search the dictionary"
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          autoFocus={autoFocus}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      {status === DictionaryStatus.LOADING && <p className="muted centered">Loading the dictionary…</p>}
      {status === DictionaryStatus.FAILED && (
        <p className="muted centered">The dictionary couldn't be loaded. Check your connection and reopen this tab.</p>
      )}
      {status === DictionaryStatus.UNAVAILABLE && (
        <p className="muted centered">There is no dictionary for this course yet.</p>
      )}

      {status === DictionaryStatus.READY && !hasQuery && (
        <section className="card card--tip">
          <p>
            Type a {packs.target.name} word (any form, e.g. <em>bin</em> finds <em>sein</em>) or an {packs.base.name} word.
            Special letters are optional: <em>fur</em> finds <em>für</em>.
          </p>
          <p>Tap the speaker to hear a word, or the snail to hear it slowly.</p>
        </section>
      )}
      {status === DictionaryStatus.READY && hasQuery && results.length === 0 && (
        <p className="muted centered">No words found for “{deferredQuery.trim()}”.</p>
      )}

      <div className="dictionary-results">
        {results.map((result, position) => (
          <DictionaryEntryCard key={`${result.entry.word}-${position}`} result={result} />
        ))}
      </div>

      {source && <p className="muted small centered">Dictionary data: {source}</p>}
    </>
  );
}

function DictionaryEntryCard({ result }: { result: DictionaryResult }) {
  const { packs } = useApp();
  const { entry, courseVocab, matchedForm } = result;
  const vocab = entryAsVocab(entry);
  const gender = packs.target.genders.find((definition) => definition.code === entry.gender);
  const details = [
    PART_OF_SPEECH_LABELS[entry.partOfSpeech],
    gender?.label,
    entry.plural && `plural ${entry.plural}`,
  ].filter(Boolean);

  return (
    <article className="card dictionary-entry">
      <div className="dictionary-entry__head">
        <Speakable text={packs.target.formatNoun(vocab)} display={<NounLabel vocab={vocab} />} size="large" />
        {courseVocab && <span className="badge">In your course</span>}
      </div>
      <p className="muted small">{details.join(' · ')}</p>
      {(entry.ipa || courseVocab?.pronunciation) && (
        <p className="dictionary-entry__pronunciation">
          {entry.ipa && <span>{entry.ipa}</span>}
          {courseVocab?.pronunciation && <span>say: {courseVocab.pronunciation}</span>}
        </p>
      )}
      {matchedForm && (
        <p className="muted small">
          “{matchedForm}” is a form of <span lang={packs.target.code}>{entry.word}</span>.
        </p>
      )}
      <ol className="dictionary-entry__meanings">
        {entry.meanings.map((meaning) => (
          <li key={meaning}>{meaning}</li>
        ))}
      </ol>
      {courseVocab?.example && (
        <div className="dictionary-entry__example">
          <Speakable text={courseVocab.example.text} />
          <span className="muted">{courseVocab.example.translation}</span>
        </div>
      )}
    </article>
  );
}
