import { useId } from 'react';

import { FIELD_KEYS, NOT_ESCALATED, noneLabel } from '../../shared/config.js';
import { TEXT_LIMITS, emptyEntry, isTriaged, mergedInto } from '../../shared/work.js';
import { missingParts } from '../lib/status.js';
import { Icon, channelIcon } from './Icon.jsx';

function initials(name) {
  const parts = name.trim().split(/\s+/);
  return `${parts[0][0] ?? ''}${parts.length > 1 ? parts[parts.length - 1][0] : ''}`.toUpperCase();
}

function PillGroup({ label, value, options, onChange }) {
  const name = useId();
  return (
    <fieldset className="cd-pills">
      <legend className="cd-field-label body-xsmall">{label}</legend>
      <div className="cd-pill-row">
        {options.map((option) => {
          const checked = value === option.id;
          return (
            <label key={option.id} className={`cd-pill body-xsmall${checked ? ' cd-pill-on' : ''}`}>
              <input
                type="radio"
                name={name}
                value={option.id}
                checked={checked}
                onChange={() => onChange(option.id)}
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function DuplicateField({ item, cases, work, value, onChange }) {
  const id = useId();
  const children = mergedInto(work, item.id);
  if (children.length > 0) {
    return (
      <p className="cd-merge-note body-xsmall">
        <Icon name="merge" />
        {children.join(', ')} {children.length === 1 ? 'is' : 'are'} merged into this case, so it
        cannot be merged itself.
      </p>
    );
  }
  const targets = cases.filter((other) => other.id !== item.id && !work.cases[other.id]?.duplicateOf);
  return (
    <div className="cd-duplicate">
      <label htmlFor={id} className="cd-field-label body-xsmall">
        <Icon name="merge" />
        Duplicate of
      </label>
      <select
        id={id}
        className="input cd-select"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">Not a duplicate</option>
        {targets.map((other) => (
          <option key={other.id} value={other.id}>
            {other.id} · {other.subject}
          </option>
        ))}
      </select>
    </div>
  );
}

export function CaseDetail({
  item,
  position,
  cases,
  fields,
  work,
  onChange,
  onBack,
  onPrevious,
  onNext,
  nextLabel,
  allDone,
  guideOpen,
  onToggleGuide,
  onShowReplyRules,
}) {
  const entry = work.cases[item.id];
  const current = entry ?? emptyEntry();
  const titleId = useId();
  const reasonId = useId();
  const replyId = useId();
  const missing = missingParts(fields, item, entry);
  const merged = Boolean(current.duplicateOf);
  const escalated = Boolean(current.escalation) && current.escalation !== NOT_ESCALATED;
  const decided = FIELD_KEYS.filter((key) => current[key]).length;
  const triaged = isTriaged(entry);

  return (
    <section className="cd-detail" aria-labelledby={titleId}>
      <div className="cd-toolbar">
        <button type="button" className="button button-xsmall button-text cd-back cd-icon-text" onClick={onBack}>
          <Icon name="chevron-left" />
          Queue
        </button>
        <div className="cd-stepper">
          <button
            type="button"
            className="cd-icon-button"
            aria-label="Previous case"
            disabled={!onPrevious}
            onClick={onPrevious}
          >
            <Icon name="chevron-left" />
          </button>
          <span className="body-xxsmall cd-muted">
            Case {position.index + 1} of {position.total}
          </span>
          <button
            type="button"
            className="cd-icon-button"
            aria-label="Next case in the queue"
            disabled={!position.hasNext}
            onClick={position.onNextInQueue}
          >
            <Icon name="chevron-right" />
          </button>
        </div>
        <button
          type="button"
          className="button button-xsmall button-tertiary cd-icon-text cd-guide-toggle"
          aria-pressed={guideOpen}
          onClick={onToggleGuide}
        >
          <Icon name="book" />
          {guideOpen ? 'Hide guide' : 'Show guide'}
        </button>
      </div>

      <div className="cd-detail-scroll">
        <header className="cd-detail-header">
          <span className="cd-detail-id body-xsmall">
            {item.id}
            <span className="cd-chip body-xxsmall">
              <Icon name={channelIcon(item.channel)} size={12} />
              {item.channel}
            </span>
          </span>
          <h2 id={titleId} tabIndex={-1} className="heading-xxsmall cd-detail-title">
            {item.subject}
          </h2>
        </header>

        <article className="cd-card cd-message">
          <div className="cd-message-head">
            <span className="cd-avatar body-xsmall" aria-hidden="true">
              {initials(item.requester.name)}
            </span>
            <div className="cd-message-who">
              <span className="body-small cd-strong">{item.requester.name}</span>
              {item.requester.detail && (
                <span className="body-xxsmall cd-muted">{item.requester.detail}</span>
              )}
            </div>
            <span className="cd-message-time body-xxsmall cd-muted">
              <Icon name="clock" size={12} />
              {item.received}
            </span>
          </div>
          <p className="body-medium cd-message-body">{item.body}</p>
        </article>

        <section className="cd-card" aria-label="Triage">
          <div className="cd-card-head">
            <h3 className="heading-xxxsmall">Triage</h3>
            <span className={`cd-card-state body-xxsmall${triaged ? ' cd-card-state-done' : ''}`}>
              {merged ? (
                <>
                  <Icon name="merge" size={14} /> Merged into {current.duplicateOf}
                </>
              ) : triaged ? (
                <>
                  <Icon name="check" size={14} /> Complete
                </>
              ) : (
                `${decided} of ${FIELD_KEYS.length} decided`
              )}
            </span>
          </div>

          <DuplicateField
            item={item}
            cases={cases}
            work={work}
            value={current.duplicateOf}
            onChange={(duplicateOf) => onChange({ duplicateOf })}
          />

          {merged ? (
            <p className="cd-merge-note body-xsmall">
              A merged case keeps no routing of its own. Choose “Not a duplicate” to route it
              separately.
            </p>
          ) : (
            <div className="cd-decisions">
              <PillGroup
                label={fields.category.label}
                value={current.category}
                options={fields.category.options}
                onChange={(category) => onChange({ category })}
              />
              <PillGroup
                label={fields.priority.label}
                value={current.priority}
                options={fields.priority.options}
                onChange={(priority) => onChange({ priority })}
              />
              <PillGroup
                label={fields.owner.label}
                value={current.owner}
                options={fields.owner.options}
                onChange={(owner) => onChange({ owner })}
              />
              <PillGroup
                label={fields.escalation.label}
                value={current.escalation}
                options={[{ id: NOT_ESCALATED, label: noneLabel(fields) }, ...fields.escalation.options]}
                onChange={(escalation) => onChange({ escalation })}
              />
              {escalated && (
                <div className="cd-reason">
                  <label htmlFor={reasonId} className="cd-field-label body-xsmall">
                    <Icon name="flag" />
                    Why escalate?
                  </label>
                  <input
                    id={reasonId}
                    type="text"
                    className="input"
                    maxLength={TEXT_LIMITS.escalationReason}
                    placeholder="One line, for example the trigger in the guide"
                    value={current.escalationReason}
                    onChange={(event) => onChange({ escalationReason: event.target.value }, { debounce: true })}
                  />
                </div>
              )}
            </div>
          )}
        </section>

        {item.replyRequired && (
          <section className="cd-card" aria-label="Reply">
            <div className="cd-card-head">
              <h3 className="heading-xxxsmall">Reply</h3>
              <button type="button" className="cd-link-button body-xxsmall cd-icon-text" onClick={onShowReplyRules}>
                <Icon name="book" size={14} />
                Reply rules
              </button>
            </div>
            <label htmlFor={replyId} className="cd-reply-to body-xsmall">
              <Icon name="reply" size={14} />
              To: <strong>{item.requester.name}</strong>
            </label>
            <textarea
              id={replyId}
              className="input cd-reply"
              rows={9}
              maxLength={TEXT_LIMITS.reply}
              placeholder={`Write your reply to ${item.requester.name}…`}
              value={current.reply}
              onChange={(event) => onChange({ reply: event.target.value }, { debounce: true })}
            />
            <span className="body-xxsmall cd-muted cd-counter">
              {current.reply.length} / {TEXT_LIMITS.reply}
            </span>
          </section>
        )}

        <footer className="cd-detail-foot">
          {allDone ? (
            <p className="cd-all-done body-xsmall" aria-live="polite">
              <Icon name="sparkle" />
              Every case is handled. You can still change anything; your work is saved.
            </p>
          ) : (
            <p className="body-xsmall cd-muted" aria-live="polite">
              {missing.length === 0 ? 'This case is done.' : `Still to do: ${missing.join(', ')}.`}
            </p>
          )}
          {onNext && (
            <button type="button" className="button button-small button-primary cd-icon-text" onClick={onNext}>
              {nextLabel}
              <Icon name="chevron-right" />
            </button>
          )}
        </footer>
      </div>
    </section>
  );
}
