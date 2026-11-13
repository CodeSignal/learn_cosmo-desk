import { FIELD_KEYS } from '../../shared/config.js';
import { hasReply, isTriaged, isUntouched, needsEscalationReason } from '../../shared/work.js';

export const STATUS = {
  new: { label: 'New', icon: 'status-new' },
  progress: { label: 'In progress', icon: 'status-progress' },
  reply: { label: 'Reply needed', icon: 'reply' },
  merged: { label: 'Merged', icon: 'merge' },
  done: { label: 'Done', icon: 'status-done' },
};

export function caseStatus(item, entry) {
  if (entry?.duplicateOf) return 'merged';
  if (isUntouched(entry)) return 'new';
  if (!isTriaged(entry)) return 'progress';
  if (item.replyRequired && !hasReply(entry)) return 'reply';
  return 'done';
}

export function missingParts(fields, item, entry) {
  if (entry?.duplicateOf) return [];
  const missing = [];
  for (const key of FIELD_KEYS) {
    if (!entry?.[key]) missing.push(fields[key].label);
  }
  if (needsEscalationReason(entry)) {
    missing.push('Escalation reason');
  }
  if (item.replyRequired && !hasReply(entry)) missing.push('Reply');
  return missing;
}
