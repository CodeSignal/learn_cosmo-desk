import { Icon } from './Icon.jsx';

function SaveState({ state, onRetry }) {
  if (state === 'error') {
    return (
      <span className="cd-save cd-save-error body-xsmall" role="status">
        <Icon name="alert" />
        Not saved
        <button type="button" className="cd-link-button" onClick={onRetry}>
          Retry
        </button>
      </span>
    );
  }
  if (state === 'rejected') {
    return (
      <span className="cd-save cd-save-error body-xsmall" role="status">
        <Icon name="alert" />
        A change was undone
      </span>
    );
  }
  const saving = state === 'saving' || state === 'pending';
  return (
    <span className="cd-save body-xsmall" role="status">
      <Icon name={saving ? 'clock' : 'check'} />
      {saving ? 'Saving…' : 'Saved'}
    </span>
  );
}

function Progress({ counts }) {
  const done = counts.triaged + counts.replies;
  const total = counts.total + counts.repliesTotal;
  return (
    <div className="cd-progress">
      <div className="cd-progress-text body-xsmall">
        <span>
          <strong>{counts.triaged}</strong>/{counts.total} triaged
        </span>
        {counts.repliesTotal > 0 && (
          <span>
            <strong>{counts.replies}</strong>/{counts.repliesTotal} replies
          </span>
        )}
      </div>
      <div
        className="cd-progress-track"
        role="progressbar"
        aria-label="Overall progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
      >
        <div className="cd-progress-fill" style={{ width: `${(done / total) * 100}%` }} />
      </div>
    </div>
  );
}

export function Header({ desk, counts, view, onViewChange, saveState, onRetry, onHelp, helpButtonRef }) {
  return (
    <header className="cd-header">
      <div className="cd-brand">
        <span className="cd-brand-mark" aria-hidden="true">
          <span className="icon icon-app-icon" />
        </span>
        <div className="cd-brand-text">
          <h1 className="cd-brand-title body-small">Cosmo Desk</h1>
          <span className="cd-brand-desk body-xxsmall">
            {desk.name}
            <span aria-hidden="true"> · </span>
            <span className="cd-nowrap">
              <Icon name="clock" size={12} /> {desk.now}
            </span>
          </span>
        </div>
      </div>

      <nav className="cd-segmented" aria-label="Views">
        {[
          ['queue', 'Queue'],
          ['guide', 'Routing guide'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="cd-segment body-xsmall"
            aria-current={view === id ? 'page' : undefined}
            onClick={() => onViewChange(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="cd-header-end">
        <Progress counts={counts} />
        <SaveState state={saveState} onRetry={onRetry} />
        <button
          ref={helpButtonRef}
          type="button"
          className="button button-xsmall button-tertiary cd-icon-text"
          onClick={onHelp}
        >
          <Icon name="help" />
          Help
        </button>
      </div>
    </header>
  );
}
