import { useState } from 'react';

import { noneLabel } from '../../shared/config.js';
import { Modal } from './Modal.jsx';

export function Help({ open, onClose, desk, fields, onStartOver }) {
  const [confirming, setConfirming] = useState(false);
  const [erasing, setErasing] = useState(false);

  async function erase() {
    setErasing(true);
    await onStartOver();
    setErasing(false);
    setConfirming(false);
  }

  function close() {
    setConfirming(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={close} title="How Cosmo Desk works">
      <div className="cd-help body-small">
        <section>
          <h3 className="heading-xxxsmall">Your task</h3>
          <p>{desk.brief}</p>
          <p>It is now {desk.now}. Times on cases are when each one arrived.</p>
        </section>
        <section>
          <h3 className="heading-xxxsmall">Triaging a case</h3>
          <ol>
            <li>
              Pick a case from the queue on the left (the arrow keys move through it) and read the
              requester's message.
            </li>
            <li>
              Set its {fields.category.label.toLowerCase()}, {fields.priority.label.toLowerCase()} and{' '}
              {fields.owner.label.toLowerCase()} using the routing guide.
            </li>
            <li>
              Choose an {fields.escalation.label.toLowerCase()} target, or “{noneLabel(fields)}”. An
              escalated case needs a one-line reason.
            </li>
            <li>
              If the case repeats one already in the queue, set “Duplicate of” to the earliest case. A
              merged case needs nothing else.
            </li>
            <li>Cases marked “Reply needed” also need a written reply to the requester.</li>
          </ol>
        </section>
        <section>
          <h3 className="heading-xxxsmall">The routing guide</h3>
          <p>
            Open it from the Routing guide tab, or with “Show guide” above a case to keep it next to
            the case on a wide screen. “Reply rules” on a reply jumps to the rules for writing it.
          </p>
        </section>
        <section>
          <h3 className="heading-xxxsmall">Statuses</h3>
          <ul>
            <li>New: nothing set yet.</li>
            <li>In progress: some fields are still empty.</li>
            <li>Reply needed: triaged, but the reply is still empty.</li>
            <li>Merged: marked as a duplicate of another case.</li>
            <li>Done: everything is filled in.</li>
          </ul>
          <p>Statuses show what is filled in, not whether it is right.</p>
        </section>
        <section>
          <h3 className="heading-xxxsmall">Saving</h3>
          <p>Every change saves automatically. The header shows when everything is saved.</p>
        </section>
        <section>
          <h3 className="heading-xxxsmall">Start over</h3>
          {confirming ? (
            <div className="cd-confirm">
              <p>This erases every decision and reply in this session. It cannot be undone.</p>
              <div className="cd-confirm-actions">
                <button
                  type="button"
                  className="button button-small button-danger"
                  disabled={erasing}
                  onClick={() => void erase()}
                >
                  {erasing ? 'Erasing…' : 'Erase my work'}
                </button>
                <button
                  type="button"
                  className="button button-small button-secondary"
                  onClick={() => setConfirming(false)}
                >
                  Keep my work
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="button button-small button-secondary"
              onClick={() => setConfirming(true)}
            >
              Start over…
            </button>
          )}
        </section>
      </div>
    </Modal>
  );
}
