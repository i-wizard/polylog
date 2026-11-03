import { useRef } from 'react';

/**
 * Single-line answer field with a row of special-character keys (ä ö ü ß …).
 *
 * The keys insert at the cursor, because the iPhone keyboard hides umlauts
 * behind a long-press.
 */
export function AnswerInput({
  value,
  onChange,
  onEnter,
  specialCharacters,
  placeholder,
  disabled,
  lang,
}: {
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
  specialCharacters: string[];
  placeholder: string;
  disabled: boolean;
  lang: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const insertCharacter = (character: string) => {
    const input = inputRef.current;
    const start = input?.selectionStart ?? value.length;
    const end = input?.selectionEnd ?? value.length;
    const nextValue = value.slice(0, start) + character + value.slice(end);
    onChange(nextValue);
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(start + character.length, start + character.length);
    });
  };

  return (
    <div className="answer-input">
      <input
        ref={inputRef}
        className="text-field"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        lang={lang}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="done"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            onEnter();
          }
        }}
      />
      {specialCharacters.length > 0 && (
        <div className="special-keys" aria-label="Special characters">
          {specialCharacters.map((character) => (
            <button
              key={character}
              type="button"
              className="special-key"
              disabled={disabled}
              // Keep focus (and the iPhone keyboard) on the input.
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => insertCharacter(character)}
            >
              {character}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
