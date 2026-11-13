import { useEffect, useRef, useState } from 'react';

import { noneLabel } from '../../shared/config.js';
import { STATUS } from '../lib/status.js';
import { Icon } from './Icon.jsx';

const STATUS_HELP = {
  new: 'Nothing set yet',
  progress: 'Some decisions still empty',
  merged: 'Marked as a duplicate',
  done: 'Everything filled in',
};

export function Help({ open, onClose, desk, fields, onStartOver }) {
  const dialogRef = useRef(null);
  const [confirming, setConfirming] = useState(false);
  const [erasing, setErasing] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  async function erase() {
    setErasing(true);
    await onStartOver();
    setErasing(false);
    setConfirming(false);
  }

  return (
    <dialog
      ref={dialogRef}
      className="cd-dialog"
      aria-labelledby="cd-help-title"
      onClose={() => {
        setConfirming(false);
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current.close();
      }}
    >
      <div className="cd-dialog-frame">
        <header className="cd-dialog-head">
          <span className="cd-dialog-icon" aria-hidden="true">
            <Icon name="help" size={20} />
          </span>
          <h2 id="cd-help-title" className="heading-xxsmall">
            How Cosmo Desk works
          </h2>
          <button
            type="button"
            className="cd-icon-button"
            aria-label="Close help"
            onClick={() => dialogRef.current?.close()}
          >
            <Icon name="close" />
          </button>
        </header>

        <div className="cd-dialog-body body-small">
          <section className="cd-help-brief">
            <span className="cd-chip body-xxsmall">
              <Icon name="clock" size={12} />
              Now: {desk.now}
            </span>
            <p>{desk.brief}</p>
          </section>

          <section className="cd-help-section">
            <h3 className="body-small cd-strong">Work each case</h3>
            <ol className="cd-help-steps">
              <li>
                <span className="cd-step">1</span>
                <span>Read the requester's message. Case times show when each one arrived.</span>
              </li>
              <li>
                <span className="cd-step">2</span>
                <span>
                  Pick the {fields.category.label.toLowerCase()}, {fields.priority.label.toLowerCase()} and{' '}
                  {fields.owner.label.toLowerCase()} the routing guide calls for.
                </span>
              </li>
              <li>
                <span className="cd-step">3</span>
                <span>
                  Choose an {fields.escalation.label.toLowerCase()} target or “{noneLabel(fields)}”. An
                  escalation needs a one-line reason.
                </span>
              </li>
              <li>
                <span className="cd-step">4</span>
                <span>
                  A repeat of an earlier case? Search for that case in “Duplicate of”; a merged case
                  needs nothing else.
                </span>
              </li>
              <li>
                <span className="cd-step">5</span>
                <span>
                  Decide whether the requester needs a reply; the routing guide says when. Use “Write a
                  reply” under the case, and “Reply rules” for what to write.
                </span>
              </li>
            </ol>
          </section>

          <section className="cd-help-section">
            <h3 className="body-small cd-strong">Statuses</h3>
            <ul className="cd-help-legend">
              {Object.entries(STATUS).map(([key, status]) => (
                <li key={key}>
                  <span className={`cd-status-${key}`}>
                    <Icon name={status.icon} />
                  </span>
                  <span>
                    <strong>{status.label}</strong>
                    <span className="cd-muted"> · {STATUS_HELP[key]}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="cd-muted body-xsmall">Statuses show what is filled in, not whether it is right.</p>
          </section>

          <section className="cd-help-section">
            <h3 className="body-small cd-strong">Shortcuts</h3>
            <ul className="cd-help-keys body-xsmall">
              <li>
                <kbd>↑</kbd> <kbd>↓</kbd> move through the queue
              </li>
              <li>
                <kbd>Enter</kbd> picks a case in “Duplicate of”
              </li>
              <li>
                <kbd>Esc</kbd> closes lists and this window
              </li>
            </ul>
          </section>
        </div>

        <footer className="cd-dialog-foot body-xsmall">
          {confirming ? (
            <>
              <span className="cd-dialog-warning">
                <Icon name="alert" />
                Erase every decision and reply? This cannot be undone.
              </span>
              <span className="cd-dialog-actions">
                <button
                  type="button"
                  className="button button-xsmall button-secondary"
                  onClick={() => setConfirming(false)}
                >
                  Keep my work
                </button>
                <button
                  type="button"
                  className="button button-xsmall button-danger"
                  disabled={erasing}
                  onClick={() => void erase()}
                >
                  {erasing ? 'Erasing…' : 'Erase my work'}
                </button>
              </span>
            </>
          ) : (
            <>
              <span className="cd-muted cd-icon-text">
                <Icon name="check" />
                Every change saves automatically.
              </span>
              <button type="button" className="cd-link-button cd-danger-link" onClick={() => setConfirming(true)}>
                Start over…
              </button>
            </>
          )}
        </footer>
      </div>
    </dialog>
  );
}
