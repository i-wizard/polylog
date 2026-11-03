import type { ReactNode } from 'react';

const INLINE_PATTERN = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;

/** Renders **bold** and *italic* spans without using innerHTML. */
function renderInline(text: string): ReactNode[] {
  return text.split(INLINE_PATTERN).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

/**
 * Renders the small markdown subset used in course content: blank-line
 * separated paragraphs, "- " bullet lists, **bold** and *italic*.
 */
export function RichText({ source }: { source: string }) {
  const blocks = source.split(/\n\s*\n/);

  return (
    <div className="rich-text">
      {blocks.map((block, blockIndex) => {
        const lines = block.split('\n').filter((line) => line.trim().length > 0);
        const isList = lines.length > 0 && lines.every((line) => line.trim().startsWith('- '));
        if (isList) {
          return (
            <ul key={blockIndex}>
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{renderInline(line.trim().slice(2))}</li>
              ))}
            </ul>
          );
        }
        return <p key={blockIndex}>{renderInline(lines.join(' '))}</p>;
      })}
    </div>
  );
}
