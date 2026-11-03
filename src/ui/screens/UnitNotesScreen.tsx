import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import type { GrammarNote } from '../../domain/content/types';
import { NounLabel } from '../components/NounLabel';
import { RichText } from '../components/RichText';
import { Speakable } from '../components/Speakable';
import { useApp } from '../AppContext';

/** A unit's grammar notes plus its full word list with audio. */
export function UnitNotesScreen() {
  const { unitId = '' } = useParams();
  const navigate = useNavigate();
  const { units, packs } = useApp();
  const unit = units.find((candidate) => candidate.id === unitId);

  if (!unit) {
    return <div className="screen centered-message">Unit not found.</div>;
  }

  return (
    <div className="screen">
      <header className="screen-header screen-header--back">
        <button type="button" className="icon-button" aria-label="Back" onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </button>
        <h1 className="screen-title">{unit.title}</h1>
      </header>

      {unit.grammarNotes.map((note) => (
        <GrammarNoteCard key={note.id} note={note} />
      ))}

      {unit.vocab.length > 0 && (
        <section className="card">
          <h2 className="card__title">Words</h2>
          <ul className="word-list">
            {unit.vocab.map((word) => (
              <li key={word.id} className="word-list__item">
                <Speakable text={packs.target.formatNoun(word)} display={<NounLabel vocab={word} />} />
                <span className="muted">
                  {word.translations.join(' / ')}
                  {word.plural && ` · pl. ${word.plural}`}
                  {word.pronunciation && ` · [${word.pronunciation}]`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function GrammarNoteCard({ note }: { note: GrammarNote }) {
  const [header, ...rows] = note.table ?? [];
  return (
    <section className="card">
      <h2 className="card__title">{note.title}</h2>
      <RichText source={note.body} />
      {header && (
        <div className="table-scroll">
          <table className="grammar-table">
            <thead>
              <tr>
                {header.map((cell) => (
                  <th key={cell}>{cell}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
