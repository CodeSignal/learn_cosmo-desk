import { NOT_ESCALATED, noneLabel, optionLabel } from '../shared/config.js';
import { hasReply, isTriaged, isUntouched, progress } from '../shared/work.js';

const NONE = '—';

/** Escapes text for one Markdown table cell or inline span. */
export function inline(text) {
  return String(text)
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[\\`*_[\]<>|#~]/g, (char) => `\\${char}`);
}

export function fenced(text) {
  const longestRun = Math.max(0, ...(String(text).match(/`+/g) ?? []).map((run) => run.length));
  const fence = '`'.repeat(Math.max(3, longestRun + 1));
  return `${fence}text\n${text}\n${fence}`;
}

function fieldLabel(config, key, id) {
  return (id && optionLabel(config.fields, key, id)) || NONE;
}

function escalationLabel(config, entry) {
  if (!entry?.escalation) return NONE;
  if (entry.escalation === NOT_ESCALATED) return noneLabel(config.fields);
  return fieldLabel(config, 'escalation', entry.escalation);
}

function triageRow(config, item) {
  const subject = inline(item.subject);
  const entry = item.entry;
  if (entry?.duplicateOf) {
    return [item.id, subject, `merged into ${inline(entry.duplicateOf)}`, NONE, NONE, NONE, NONE, NONE];
  }
  return [
    item.id,
    subject,
    NONE,
    inline(fieldLabel(config, 'category', entry?.category)),
    inline(fieldLabel(config, 'priority', entry?.priority)),
    inline(fieldLabel(config, 'owner', entry?.owner)),
    inline(escalationLabel(config, entry)),
    isEscalated(entry) && entry.escalationReason.trim() ? inline(entry.escalationReason) : NONE,
  ];
}

function isEscalated(entry) {
  return Boolean(entry?.escalation) && entry.escalation !== NOT_ESCALATED;
}

function table(columns, rows) {
  return [
    `| ${columns.join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

function guideBlock(block) {
  if (block.type === 'paragraph') return inline(block.text);
  if (block.type === 'list') return block.items.map((entry) => `- ${inline(entry)}`).join('\n');
  return table(block.columns.map(inline), block.rows.map((row) => row.map(inline)));
}

function caseIdList(items) {
  return items.length ? items.map((item) => item.id).join(', ') : 'none';
}

export function renderReport(config, work) {
  const cases = config.cases.map((item) => ({ ...item, entry: work.cases[item.id] }));
  const counts = progress(config, work);
  const { fields } = config;
  const lines = [
    '# Cosmo Desk Session Report',
    '',
    `- Desk: ${inline(config.desk.name)}`,
    `- Role: ${inline(config.desk.role)}`,
    `- Shift time at the start: ${inline(config.desk.now)}`,
    `- Cases triaged: ${counts.triaged} of ${counts.total}`,
    `- Replies written: ${counts.replies} of ${counts.repliesTotal}`,
    `- Untouched cases: ${caseIdList(cases.filter((item) => isUntouched(item.entry)))}`,
    `- Started but not fully triaged: ${caseIdList(
      cases.filter((item) => !isUntouched(item.entry) && !isTriaged(item.entry))
    )}`,
    '',
    '## Brief shown to the candidate',
    '',
    inline(config.desk.brief),
    '',
    '## Triage decisions',
    '',
    `One row per case, in queue order. A merged case keeps no routing of its own. ${NONE} means not set.`,
    '',
    table(
      [
        'Case',
        'Subject',
        'Duplicate',
        inline(fields.category.label),
        inline(fields.priority.label),
        inline(fields.owner.label),
        inline(fields.escalation.label),
        'Escalation reason',
      ],
      cases.map((item) => triageRow(config, item))
    ),
  ];

  const replyCases = cases.filter((item) => item.replyRequired);
  if (replyCases.length > 0) {
    lines.push('', '## Replies');
    for (const item of replyCases) {
      lines.push(
        '',
        `### ${item.id}: ${inline(item.subject)}`,
        '',
        `From ${inline(item.requester.name)}${
          item.requester.detail ? ` (${inline(item.requester.detail)})` : ''
        } via ${inline(item.channel)}`,
        '',
        'Original message:',
        '',
        fenced(item.body),
        '',
        "Candidate's reply:",
        '',
        hasReply(item.entry) ? fenced(item.entry.reply) : '_No reply written._'
      );
    }
    lines.push('', '## Reply rules from the routing guide');
    for (const section of config.guide.sections.filter((entry) => entry.replyRules === true)) {
      lines.push('', `### ${inline(section.title)}`);
      for (const block of section.blocks) lines.push('', guideBlock(block));
    }
  }

  return `${lines.join('\n')}\n`;
}
