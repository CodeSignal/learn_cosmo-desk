import { useId, useState } from 'react';

import { FIELD_KEYS, NOT_ESCALATED, accountFor, customerLabel, noneLabel } from '../../shared/config.js';
import { TEXT_LIMITS, emptyEntry, isTriaged, mergedInto } from '../../shared/work.js';
import { missingParts } from '../lib/status.js';
import { DuplicatePicker } from './DuplicatePicker.jsx';
import { Icon, channelIcon } from './Icon.jsx';

function initials(name) {
  const parts = name.trim().split(/\s+/);
  return `${parts[0][0] ?? ''}${parts.length > 1 ? parts[parts.length - 1][0] : ''}`.toUpperCase();
}

function OptionColumn({ label, value, options, onChange }) {
  const name = useId();
  const headId = useId();
  return (
    <div className="cd-col" role="radiogroup" aria-labelledby={headId}>
      <div id={headId} className="cd-col-head label-small">
        {label}
      </div>
      {options.map((option) => {
        const checked = value === option.id;
        return (
          <label key={option.id} className={`cd-option body-xsmall${checked ? ' cd-option-on' : ''}`}>
            <input
              type="radio"
              name={name}
              value={option.id}
              checked={checked}
              onChange={() => onChange(option.id)}
            />
            <span className="cd-radio" aria-hidden="true" />
            <span>{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}

function DuplicateField({ item, cases, work, value, onChange }) {
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
  return <DuplicatePicker targets={targets} value={value} onChange={onChange} />;
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

/** Collapsed until the candidate opens it: reading the record is part of the judgement. */
function AccountRecord({ account, label }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const facts = account.facts ?? [];
  const history = account.history ?? [];
  const summary = [
    account.id,
    plural(facts.length, 'detail'),
    history.length === 0 ? 'no earlier cases' : plural(history.length, 'earlier case'),
  ].join(' · ');

  return (
    <section className={`cd-card cd-record${open ? ' cd-record-open' : ''}`} aria-label={`${label} record`}>
      <button
        type="button"
        className="cd-record-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
      >
        <span className="cd-dialog-icon" aria-hidden="true">
          <Icon name="person" />
        </span>
        <span className="cd-record-title">
          <span className="body-small cd-strong">
            {label} record: {account.name}
          </span>
          <span className="body-xxsmall cd-muted">{summary}</span>
        </span>
        <span className="cd-record-action body-xxsmall">
          {open ? 'Hide' : 'Show'}
          <Icon name="chevron-right" size={14} className="cd-record-chevron" />
        </span>
      </button>
      <div id={panelId} className="cd-record-body" hidden={!open}>
        {account.detail && <p className="body-xsmall cd-muted">{account.detail}</p>}
        {facts.length > 0 && (
          <dl className="cd-record-facts body-xsmall">
            {facts.map((fact, index) => (
              <div key={index} className="cd-record-fact">
                <dt className="cd-muted">{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="cd-record-history">
          <h4 className="label-small cd-muted">Earlier cases</h4>
          {history.length === 0 ? (
            <p className="body-xsmall cd-muted">No earlier cases.</p>
          ) : (
            <ol className="cd-record-list">
              {history.map((entry) => (
                <li key={entry.id} className="cd-record-entry body-xsmall">
                  <span className="cd-row-id body-xxsmall">{entry.id}</span>
                  <span className="cd-record-when body-xxsmall cd-muted">{entry.when}</span>
                  <span className="cd-record-subject">{entry.subject}</span>
                  <span className="cd-record-outcome body-xxsmall">{entry.outcome}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}

function ReplyCard({ item, reply, onChange, onShowReplyRules }) {
  const replyId = useId();
  const [open, setOpen] = useState(reply.trim() !== '');
  const rulesLink = (
    <button type="button" className="cd-link-button body-xxsmall cd-icon-text" onClick={onShowReplyRules}>
      <Icon name="book" size={14} />
      Reply rules
    </button>
  );

  if (!open) {
    return (
      <section className="cd-card cd-reply-closed" aria-label="Reply">
        <div className="cd-reply-ask">
          <span className="cd-dialog-icon" aria-hidden="true">
            <Icon name="reply" />
          </span>
          <div>
            <p className="body-small cd-strong">Does {item.requester.name} need a reply?</p>
            <p className="body-xsmall cd-muted">The routing guide says which cases get one.</p>
          </div>
        </div>
        <div className="cd-reply-actions">
          {rulesLink}
          <button type="button" className="button button-xsmall button-secondary cd-icon-text" onClick={() => setOpen(true)}>
            <Icon name="reply" size={14} />
            Write a reply
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="cd-card" aria-label="Reply">
      <div className="cd-card-head">
        <h3 className="heading-xxxsmall">Reply</h3>
        {rulesLink}
      </div>
      <label htmlFor={replyId} className="cd-reply-to body-xsmall">
        <Icon name="reply" size={14} />
        To: <strong>{item.requester.name}</strong>
      </label>
      <textarea
        id={replyId}
        className="input cd-reply"
        rows={9}
        autoFocus={reply === ''}
        maxLength={TEXT_LIMITS.reply}
        placeholder={`Write your reply to ${item.requester.name}…`}
        value={reply}
        onChange={(event) => onChange({ reply: event.target.value }, { debounce: true })}
      />
      <div className="cd-reply-foot">
        <button
          type="button"
          className="cd-link-button cd-danger-link body-xxsmall"
          onClick={() => {
            onChange({ reply: '' });
            setOpen(false);
          }}
        >
          Discard reply
        </button>
        <span className="body-xxsmall cd-muted">
          {reply.length} / {TEXT_LIMITS.reply}
        </span>
      </div>
    </section>
  );
}

export function CaseDetail({
  config,
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
  onShowReplyRules,
}) {
  const entry = work.cases[item.id];
  const current = entry ?? emptyEntry();
  const titleId = useId();
  const reasonId = useId();
  const missing = missingParts(fields, entry);
  const merged = Boolean(current.duplicateOf);
  const escalated = Boolean(current.escalation) && current.escalation !== NOT_ESCALATED;
  const decided = FIELD_KEYS.filter((key) => current[key]).length;
  const triaged = isTriaged(entry);
  const account = accountFor(config, item);

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

        {account && <AccountRecord account={account} label={customerLabel(config)} />}

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
              A merged case keeps no routing of its own. Clear “Duplicate of” with × to route it
              separately.
            </p>
          ) : (
            <div className="cd-decisions-wrap">
              <div className="cd-decisions">
              <OptionColumn
                label={fields.category.label}
                value={current.category}
                options={fields.category.options}
                onChange={(category) => onChange({ category })}
              />
              <OptionColumn
                label={fields.priority.label}
                value={current.priority}
                options={fields.priority.options}
                onChange={(priority) => onChange({ priority })}
              />
              <OptionColumn
                label={fields.owner.label}
                value={current.owner}
                options={fields.owner.options}
                onChange={(owner) => onChange({ owner })}
              />
              <OptionColumn
                label={fields.escalation.label}
                value={current.escalation}
                options={[{ id: NOT_ESCALATED, label: noneLabel(fields) }, ...fields.escalation.options]}
                onChange={(escalation) => onChange({ escalation })}
              />
              </div>
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

        <ReplyCard
          item={item}
          reply={current.reply}
          onChange={onChange}
          onShowReplyRules={onShowReplyRules}
        />

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
