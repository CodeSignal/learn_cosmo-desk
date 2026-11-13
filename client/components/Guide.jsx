import { useEffect, useRef } from 'react';

import { Icon } from './Icon.jsx';

function GuideBlock({ block }) {
  if (block.type === 'paragraph') return <p className="body-small">{block.text}</p>;
  if (block.type === 'list') {
    return (
      <ul className="body-small cd-guide-list">
        {block.items.map((entry) => (
          <li key={entry}>{entry}</li>
        ))}
      </ul>
    );
  }
  return (
    <div className="table-scroll cd-guide-table">
      <table className="table body-xsmall">
        <thead>
          <tr>
            {block.columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row) => (
            <tr key={row.join('|')}>
              {row.map((cell, index) => (
                <td key={`${index}-${cell}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Guide({ guide, compact = false, focus = null, onClose }) {
  const rootRef = useRef(null);

  useEffect(() => {
    if (!focus) return;
    rootRef.current
      ?.querySelector(`[data-section="${CSS.escape(focus.id)}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focus]);

  function jumpTo(sectionId) {
    rootRef.current
      ?.querySelector(`[data-section="${CSS.escape(sectionId)}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div ref={rootRef} className={`cd-guide${compact ? ' cd-guide-compact' : ''}`}>
      <div className="cd-guide-head">
        <h2 className={compact ? 'heading-xxxsmall cd-icon-text' : 'heading-xsmall'}>
          {compact && <Icon name="book" />}
          {guide.title}
        </h2>
        {onClose && (
          <button type="button" className="cd-icon-button" aria-label="Hide guide" onClick={onClose}>
            <Icon name="close" />
          </button>
        )}
      </div>
      <nav className="cd-guide-toc" aria-label="Guide sections">
        {guide.sections.map((section) => (
          <button
            key={section.id}
            type="button"
            className="cd-guide-chip body-xxsmall"
            onClick={() => jumpTo(section.id)}
          >
            {section.title}
          </button>
        ))}
      </nav>
      {guide.sections.map((section) => (
        <section key={section.id} data-section={section.id} className="cd-guide-section">
          <h3 className={compact ? 'body-small cd-strong' : 'heading-xxxsmall'}>{section.title}</h3>
          {section.blocks.map((block, index) => (
            <GuideBlock key={`${section.id}-${index}`} block={block} />
          ))}
        </section>
      ))}
    </div>
  );
}
