// The design system's icon set covers products and roles, not UI controls, so these are drawn here.
const PATHS = {
  mail: (
    <>
      <rect x="2" y="3.5" width="12" height="9" rx="1.5" />
      <path d="m2.5 4.5 5.5 4.2 5.5-4.2" />
    </>
  ),
  phone: (
    <path d="M5.6 2.5H3.8a1.3 1.3 0 0 0-1.3 1.4 10.6 10.6 0 0 0 9.6 9.6 1.3 1.3 0 0 0 1.4-1.3v-1.8l-2.6-1.2-1.4 1.4a7.6 7.6 0 0 1-3.5-3.5l1.4-1.4Z" />
  ),
  chat: <path d="M2.5 4a1.5 1.5 0 0 1 1.5-1.5h8A1.5 1.5 0 0 1 13.5 4v6a1.5 1.5 0 0 1-1.5 1.5H6.5l-3 2.5v-2.5H4A1.5 1.5 0 0 1 2.5 10Z" />,
  globe: (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M2.5 8h11M8 2.5c1.6 1.6 2.3 3.4 2.3 5.5S9.6 11.9 8 13.5M8 2.5C6.4 4.1 5.7 5.9 5.7 8s.7 3.9 2.3 5.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 5v3.2l2 1.3" />
    </>
  ),
  check: <path d="M3.2 8.4 6.5 11.6 12.8 4.8" />,
  'status-new': <circle cx="8" cy="8" r="5" />,
  'status-progress': (
    <>
      <circle cx="8" cy="8" r="5" />
      <path d="M8 3a5 5 0 0 1 0 10Z" fill="currentColor" />
    </>
  ),
  'status-done': (
    <>
      <circle cx="8" cy="8" r="5.5" fill="currentColor" stroke="none" />
      <path d="M5.4 8.2 7.2 10l3.4-3.8" stroke="var(--cd-icon-on-fill)" />
    </>
  ),
  merge: (
    <>
      <circle cx="4.5" cy="3.8" r="1.5" />
      <circle cx="4.5" cy="12.2" r="1.5" />
      <circle cx="11.5" cy="8" r="1.5" />
      <path d="M4.5 5.3v5.4M4.5 5.6c0 2 2.5 2.4 5.5 2.4" />
    </>
  ),
  reply: (
    <>
      <path d="M6.5 4 2.5 7.5 6.5 11" />
      <path d="M2.8 7.5h6.7a4 4 0 0 1 4 4v1" />
    </>
  ),
  flag: <path d="M3.5 14V2.8h8.2l-1.5 3 1.5 3H3.5" />,
  book: (
    <>
      <path d="M2.5 3.5h4a1.5 1.5 0 0 1 1.5 1.5v8.5a1.5 1.5 0 0 0-1.5-1.5h-4Z" />
      <path d="M13.5 3.5h-4A1.5 1.5 0 0 0 8 5v8.5a1.5 1.5 0 0 1 1.5-1.5h4Z" />
    </>
  ),
  help: (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M6.3 6.3a1.8 1.8 0 1 1 2.4 1.7c-.5.2-.7.5-.7 1v.4" />
      <circle cx="8" cy="11.2" r=".4" fill="currentColor" />
    </>
  ),
  alert: (
    <>
      <path d="M8 2.5 14 13H2Z" />
      <path d="M8 6.5v3" />
      <circle cx="8" cy="11.3" r=".4" fill="currentColor" />
    </>
  ),
  'chevron-left': <path d="M10 3.5 5.5 8l4.5 4.5" />,
  'chevron-right': <path d="m6 3.5 4.5 4.5L6 12.5" />,
  close: <path d="M4 4l8 8M12 4l-8 8" />,
  search: (
    <>
      <circle cx="7" cy="7" r="4.5" />
      <path d="m10.4 10.4 3.1 3.1" />
    </>
  ),
  sparkle: (
    <path d="M8 2.5 9.2 6.8 13.5 8 9.2 9.2 8 13.5 6.8 9.2 2.5 8 6.8 6.8Z" />
  ),
};

export function Icon({ name, size = 16, className = '' }) {
  return (
    <svg
      className={`cd-icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}

export function channelIcon(channel) {
  const text = channel.toLowerCase();
  if (text.includes('mail')) return 'mail';
  if (/phone|call|voice/.test(text)) return 'phone';
  if (/chat|sms|message|text/.test(text)) return 'chat';
  return 'globe';
}
