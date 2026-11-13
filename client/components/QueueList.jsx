import { useEffect, useRef } from 'react';

import { optionLabel } from '../../shared/config.js';
import { STATUS, caseStatus } from '../lib/status.js';
import { Icon, channelIcon } from './Icon.jsx';

export const FILTERS = [
  ['todo', 'To do'],
  ['done', 'Done'],
  ['all', 'All'],
];

export function isOpenStatus(status) {
  return status === 'new' || status === 'progress';
}

function priorityLabel(fields, entry) {
  if (!entry?.priority || entry.duplicateOf) return null;
  return optionLabel(fields, 'priority', entry.priority);
}

export function QueueList({ cases, fields, work, selectedId, filter, onFilterChange, onSelect, focusRequest, resizeHandle }) {
  const listRef = useRef(null);
  const rows = cases.map((item) => ({ item, status: caseStatus(work.cases[item.id]) }));
  const counts = {
    todo: rows.filter((row) => isOpenStatus(row.status)).length,
    done: rows.filter((row) => !isOpenStatus(row.status)).length,
    all: rows.length,
  };
  const matches = (row) =>
    filter === 'all' || (filter === 'todo' ? isOpenStatus(row.status) : !isOpenStatus(row.status));
  const anyMatch = rows.some(matches);
  const visible = anyMatch ? rows.filter((row) => matches(row) || row.item.id === selectedId) : [];

  useEffect(() => {
    if (focusRequest === 0) return;
    listRef.current?.querySelector(`[data-case="${CSS.escape(selectedId)}"]`)?.focus();
    // Focus follows a Back request only, not every selection change.
  }, [focusRequest]);

  function onKeyDown(event) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const fromId = event.target.closest('[data-case]')?.dataset.case ?? selectedId;
    const index = visible.findIndex((row) => row.item.id === fromId);
    const next = visible[index + (event.key === 'ArrowDown' ? 1 : -1)];
    if (!next) return;
    event.preventDefault();
    onSelect(next.item.id, { keepList: true });
    listRef.current?.querySelector(`[data-case="${CSS.escape(next.item.id)}"]`)?.focus();
  }

  return (
    <nav className="cd-list" aria-label="Case queue">
      {resizeHandle}
      <div className="cd-list-head">
        <div className="cd-filter" role="group" aria-label="Show">
          {FILTERS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="cd-filter-option body-xxsmall"
              aria-pressed={filter === id}
              onClick={() => onFilterChange(id)}
            >
              {label}
              <span className="cd-filter-count">{counts[id]}</span>
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="cd-list-empty body-small">
          <Icon name={filter === 'todo' ? 'sparkle' : 'status-new'} size={24} />
          <p>{filter === 'todo' ? 'Nothing left to do. Every case is handled.' : 'No cases are done yet.'}</p>
          <button type="button" className="cd-link-button body-xsmall" onClick={() => onFilterChange('all')}>
            Show all cases
          </button>
        </div>
      ) : (
        <ol className="cd-list-items" ref={listRef} onKeyDown={onKeyDown}>
          {visible.map(({ item, status }) => {
            const entry = work.cases[item.id];
            const priority = priorityLabel(fields, entry);
            const selected = item.id === selectedId;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  data-case={item.id}
                  tabIndex={selected ? 0 : -1}
                  className={`cd-row cd-row-${status}`}
                  aria-current={selected ? 'true' : undefined}
                  onClick={() => onSelect(item.id)}
                >
                  <span className={`cd-row-status cd-status-${status}`} title={STATUS[status].label}>
                    <Icon name={STATUS[status].icon} />
                    <span className="cd-visually-hidden">{STATUS[status].label}: </span>
                  </span>
                  <span className="cd-row-main">
                    <span className="cd-row-meta body-xxsmall">
                      <span className="cd-row-id">{item.id}</span>
                      <Icon name={channelIcon(item.channel)} size={12} />
                      <span className="cd-row-time">{item.received}</span>
                    </span>
                    <span className="cd-row-subject body-small">{item.subject}</span>
                    <span className="cd-row-foot body-xxsmall">
                      <span className="cd-ellipsis">{item.requester.name}</span>
                      {entry?.reply?.trim() && (
                        <span className="cd-row-reply" title="Reply written">
                          <Icon name="reply" size={12} />
                          <span className="cd-visually-hidden">Reply written</span>
                        </span>
                      )}
                      {status === 'merged' && (
                        <span className="cd-row-flag cd-row-flag-quiet">Merged into {entry.duplicateOf}</span>
                      )}
                      {priority && <span className="cd-row-priority">{priority}</span>}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </nav>
  );
}
