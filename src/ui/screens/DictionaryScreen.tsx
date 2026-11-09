import { DictionarySearch } from '../dictionary/DictionarySearch';

/** Dictionary tab: look up words in either language, see their meaning and hear them. */
export function DictionaryScreen() {
  return (
    <div className="screen">
      <header className="screen-header">
        <h1 className="screen-title">Dictionary</h1>
      </header>
      <DictionarySearch />
    </div>
  );
}
