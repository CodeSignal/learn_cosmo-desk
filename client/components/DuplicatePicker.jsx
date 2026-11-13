import { useId, useRef, useState } from 'react';

import { Icon } from './Icon.jsx';

function matches(item, query) {
  const text = `${item.id} ${item.subject} ${item.requester.name} ${item.body}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => text.includes(word));
}

export function DuplicatePicker({ targets, value, onChange }) {
  const inputId = useId();
  const listId = useId();
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const selected = targets.find((item) => item.id === value) ?? null;
  const results = targets.filter((item) => matches(item, query));
  const activeItem = results[Math.min(active, results.length - 1)] ?? null;

  function openList() {
    setQuery('');
    setActive(Math.max(0, targets.findIndex((item) => item.id === value)));
    setOpen(true);
  }

  function choose(id) {
    onChange(id);
    setOpen(false);
    setQuery('');
  }

  function onKeyDown(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        openList();
        return;
      }
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((index) => Math.min(Math.max(index + step, 0), Math.max(results.length - 1, 0)));
    } else if (event.key === 'Enter' && open) {
      event.preventDefault();
      if (activeItem) choose(activeItem.id);
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
      setQuery('');
    }
  }

  return (
    <div className="cd-duplicate">
      <label htmlFor={inputId} className="cd-field-label body-xsmall">
        <Icon name="merge" />
        Duplicate of
      </label>
      <div className="cd-combo">
        <Icon name="search" className="cd-combo-icon" />
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          className="input cd-combo-input body-small"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && activeItem ? `${listId}-${activeItem.id}` : undefined}
          autoComplete="off"
          placeholder={selected ? '' : 'Not a duplicate. Type to search cases…'}
          value={open ? query : selected ? `${selected.id} · ${selected.subject}` : ''}
          onFocus={openList}
          onClick={() => !open && openList()}
          onBlur={() => {
            setOpen(false);
            setQuery('');
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        {selected && !open && (
          <button
            type="button"
            className="cd-icon-button cd-combo-clear"
            aria-label="Not a duplicate"
            title="Not a duplicate"
            onClick={() => onChange(null)}
          >
            <Icon name="close" />
          </button>
        )}
        {open && (
          // Choosing with the mouse must not blur the input first, or the list closes before the click lands.
          <ul id={listId} role="listbox" className="cd-combo-list" onMouseDown={(event) => event.preventDefault()}>
            {results.length === 0 ? (
              <li className="cd-combo-empty body-xsmall">No case matches “{query}”.</li>
            ) : (
              results.map((item) => (
                <li
                  key={item.id}
                  id={`${listId}-${item.id}`}
                  role="option"
                  aria-selected={item.id === value}
                  className={`cd-combo-option${item === activeItem ? ' cd-combo-option-active' : ''}`}
                  onMouseEnter={() => setActive(results.indexOf(item))}
                  onClick={() => choose(item.id)}
                >
                  <span className="cd-combo-option-top body-xxsmall">
                    <strong>{item.id}</strong>
                    <span>{item.requester.name}</span>
                    <span className="cd-combo-time">{item.received}</span>
                  </span>
                  <span className="body-small cd-combo-subject">{item.subject}</span>
                  {item.id === value && <Icon name="check" className="cd-combo-check" />}
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
