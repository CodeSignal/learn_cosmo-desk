import { NOT_ESCALATED, accountFor, customerLabel, noneLabel, optionLabel } from '../shared/config.js';
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
  const reply = hasReply(entry) ? 'written' : NONE;
  if (entry?.duplicateOf) {
    return [item.id, subject, `merged into ${inline(entry.duplicateOf)}`, NONE, NONE, NONE, NONE, NONE, reply];
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
    reply,
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

function accountRecord(config, account) {
  const lines = [
    `${inline(customerLabel(config))} record: ${inline(account.name)} (${inline(account.id)}${
      account.detail ? `, ${inline(account.detail)}` : ''
    })`,
  ];
  if (account.facts?.length) {
    lines.push('', account.facts.map((fact) => `- ${inline(fact.label)}: ${inline(fact.value)}`).join('\n'));
  }
  lines.push(
    '',
    account.history?.length
      ? table(
          ['Earlier case', 'When', 'Subject', 'Outcome'],
          account.history.map((entry) => [entry.id, entry.when, entry.subject, entry.outcome].map(inline))
        )
      : '_No earlier cases._'
  );
  return lines;
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
    `- Replies written: ${counts.replies} (${caseIdList(cases.filter((item) => hasReply(item.entry)))})`,
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
        'Reply',
      ],
      cases.map((item) => triageRow(config, item))
    ),
  ];

  const replied = cases.filter((item) => hasReply(item.entry));
  lines.push('', '## Replies', '');
  lines.push(
    replied.length === 0
      ? '_The candidate wrote no replies._'
      : 'The candidate chose to reply to these cases; every other case got no reply.'
  );
  for (const item of replied) {
    const account = accountFor(config, item);
    lines.push(
      '',
      `### ${item.id}: ${inline(item.subject)}`,
      '',
      `From ${inline(item.requester.name)}${
        item.requester.detail ? ` (${inline(item.requester.detail)})` : ''
      } via ${inline(item.channel)}`,
      ...(account ? ['', ...accountRecord(config, account)] : []),
      '',
      'Original message:',
      '',
      fenced(item.body),
      '',
      "Candidate's reply:",
      '',
      fenced(item.entry.reply)
    );
  }

  const replyRules = config.guide.sections.filter((section) => section.replyRules === true);
  if (replyRules.length > 0) {
    lines.push('', '## Reply rules from the routing guide');
    for (const section of replyRules) {
      lines.push('', `### ${inline(section.title)}`);
      for (const block of section.blocks) lines.push('', guideBlock(block));
    }
  }

  return `${lines.join('\n')}\n`;
}
