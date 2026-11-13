import { NOT_ESCALATED, isRecord } from './config.js';

export const WORK_VERSION = 1;

export const ENTRY_KEYS = [
  'category',
  'priority',
  'owner',
  'escalation',
  'escalationReason',
  'duplicateOf',
  'reply',
];

export const TEXT_LIMITS = { escalationReason: 300, reply: 4000 };

const OPTION_KEYS = ['category', 'priority', 'owner'];

export function emptyWork() {
  return { version: WORK_VERSION, cases: {} };
}

export function emptyEntry() {
  return {
    category: null,
    priority: null,
    owner: null,
    escalation: null,
    escalationReason: '',
    duplicateOf: null,
    reply: '',
  };
}

function optionIds(config, key) {
  return new Set(config.fields[key].options.map((option) => option.id));
}

function checkValue(config, caseId, key, value) {
  if (OPTION_KEYS.includes(key)) {
    if (value === null || optionIds(config, key).has(value)) return null;
    return `${key} must be one of the configured options`;
  }
  if (key === 'escalation') {
    if (value === null || value === NOT_ESCALATED || optionIds(config, key).has(value)) return null;
    return `escalation must be "${NOT_ESCALATED}" or one of the configured options`;
  }
  if (key === 'duplicateOf') {
    if (value === null) return null;
    if (value === caseId) return 'a case cannot be a duplicate of itself';
    if (config.cases.some((item) => item.id === value)) return null;
    return 'duplicateOf must be the id of another case';
  }
  if (typeof value !== 'string') return `${key} must be a string`;
  if (value.length > TEXT_LIMITS[key]) return `${key} is longer than ${TEXT_LIMITS[key]} characters`;
  return null;
}

export function mergedInto(work, caseId) {
  return Object.keys(work.cases).filter((id) => work.cases[id].duplicateOf === caseId);
}

function checkMerge(work, caseId, targetId) {
  if (work.cases[targetId]?.duplicateOf) {
    return `${targetId} is itself merged; merge into the case it was merged into`;
  }
  if (mergedInto(work, caseId).length > 0) {
    return `other cases are merged into ${caseId}, so it cannot be merged`;
  }
  return null;
}

export function applyPatch(config, work, caseId, patch) {
  if (!config.cases.some((item) => item.id === caseId)) return { error: 'unknown case id' };
  if (!isRecord(patch) || Object.keys(patch).length === 0) {
    return { error: 'the patch must be a non-empty object' };
  }
  for (const [key, value] of Object.entries(patch)) {
    if (!ENTRY_KEYS.includes(key)) return { error: `unknown field "${key}"` };
    const error = checkValue(config, caseId, key, value);
    if (error) return { error };
  }
  if (patch.duplicateOf) {
    const error = checkMerge(work, caseId, patch.duplicateOf);
    if (error) return { error };
  }
  const current = work.cases[caseId] ?? emptyEntry();
  return {
    work: {
      version: WORK_VERSION,
      cases: { ...work.cases, [caseId]: { ...current, ...patch } },
    },
  };
}

/** Saved files may be hand-edited or stale; only values the current config accepts survive. */
export function sanitizeWork(config, raw) {
  let work = emptyWork();
  if (!isRecord(raw) || raw.version !== WORK_VERSION || !isRecord(raw.cases)) return work;
  for (const item of config.cases) {
    const saved = raw.cases[item.id];
    if (!isRecord(saved)) continue;
    for (const key of ENTRY_KEYS) {
      if (!(key in saved)) continue;
      const result = applyPatch(config, work, item.id, { [key]: saved[key] });
      if (result.work) work = result.work;
    }
  }
  return work;
}

export function isTriaged(entry) {
  if (!entry) return false;
  if (entry.duplicateOf) return true;
  const routed = Boolean(entry.category && entry.priority && entry.owner && entry.escalation);
  return routed && !needsEscalationReason(entry);
}

export function needsEscalationReason(entry) {
  return (
    Boolean(entry?.escalation) &&
    entry.escalation !== NOT_ESCALATED &&
    entry.escalationReason.trim() === ''
  );
}

export function isUntouched(entry) {
  if (!entry) return true;
  return ENTRY_KEYS.every((key) => {
    const value = entry[key];
    return value === null || (typeof value === 'string' && value.trim() === '');
  });
}

export function hasReply(entry) {
  return Boolean(entry && entry.reply.trim() !== '');
}

export function progress(config, work) {
  const replyCases = config.cases.filter((item) => item.replyRequired);
  return {
    triaged: config.cases.filter((item) => isTriaged(work.cases[item.id])).length,
    total: config.cases.length,
    replies: replyCases.filter((item) => hasReply(work.cases[item.id])).length,
    repliesTotal: replyCases.length,
  };
}
