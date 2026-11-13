export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(body.error || `Request failed (${response.status})`, response.status);
  return body;
}

export const api = {
  config: () => request('/api/config'),
  work: () => request('/api/work'),
  patchCase: (caseId, patch, { keepalive = false } = {}) =>
    request(`/api/work/cases/${encodeURIComponent(caseId)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
      keepalive,
    }),
  reset: () => request('/api/reset', { method: 'POST' }),
};
