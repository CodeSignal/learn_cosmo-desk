export const CONFIG_VERSION = 1;

export const FIELD_KEYS = ['category', 'priority', 'owner', 'escalation'];

export const NOT_ESCALATED = 'none';

export const DEFAULT_NONE_LABEL = 'Not escalated';

export const LIMITS = {
  minCases: 5,
  maxCases: 25,
  maxReplyCases: 3,
  maxOptions: 12,
  shortText: 120,
  mediumText: 400,
  longText: 2500,
  maxGuideSections: 12,
  maxBlocksPerSection: 12,
  maxTableRows: 20,
  maxTableColumns: 6,
  maxListItems: 12,
};

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/;
const BLOCK_TYPES = ['paragraph', 'list', 'table'];

export function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function checkText(errors, path, value, { max, required = true }) {
  if (value === undefined && !required) return;
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${path} must be a non-empty string`);
    return;
  }
  if (value.length > max) errors.push(`${path} is longer than ${max} characters`);
}

function checkId(errors, path, id) {
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
    errors.push(`${path} must be 1-40 letters, digits, ".", "_" or "-"`);
  }
}

function checkUniqueIds(errors, path, items) {
  const seen = new Set();
  for (const item of items) {
    if (!isRecord(item)) continue;
    if (seen.has(item.id)) errors.push(`${path} has the id "${item.id}" more than once`);
    seen.add(item.id);
  }
}

function checkField(errors, key, field) {
  const path = `fields.${key}`;
  if (!isRecord(field)) {
    errors.push(`${path} must be an object`);
    return;
  }
  checkText(errors, `${path}.label`, field.label, { max: LIMITS.shortText });
  if (!Array.isArray(field.options) || field.options.length < 2) {
    errors.push(`${path}.options must list at least 2 options`);
    return;
  }
  if (field.options.length > LIMITS.maxOptions) {
    errors.push(`${path}.options has more than ${LIMITS.maxOptions} options`);
  }
  field.options.forEach((option, index) => {
    const optionPath = `${path}.options[${index}]`;
    if (!isRecord(option)) {
      errors.push(`${optionPath} must be an object`);
      return;
    }
    checkId(errors, `${optionPath}.id`, option.id);
    if (key === 'escalation' && option.id === NOT_ESCALATED) {
      errors.push(`${optionPath}.id "${NOT_ESCALATED}" is reserved for the "not escalated" choice`);
    }
    checkText(errors, `${optionPath}.label`, option.label, { max: LIMITS.shortText });
  });
  checkUniqueIds(errors, `${path}.options`, field.options);
  const labels = field.options.filter(isRecord).map((option) => option.label);
  if (key === 'escalation') {
    checkText(errors, `${path}.noneLabel`, field.noneLabel, { max: LIMITS.shortText, required: false });
    labels.push(field.noneLabel ?? DEFAULT_NONE_LABEL);
  }
  if (new Set(labels).size !== labels.length) {
    errors.push(`${path}.options has duplicate labels; the report identifies options by label`);
  }
}

function checkBlock(errors, path, block) {
  if (!isRecord(block) || !BLOCK_TYPES.includes(block.type)) {
    errors.push(`${path}.type must be one of ${BLOCK_TYPES.join(', ')}`);
    return;
  }
  if (block.type === 'paragraph') {
    checkText(errors, `${path}.text`, block.text, { max: LIMITS.longText });
    return;
  }
  if (block.type === 'list') {
    if (!Array.isArray(block.items) || block.items.length === 0) {
      errors.push(`${path}.items must be a non-empty array`);
      return;
    }
    if (block.items.length > LIMITS.maxListItems) {
      errors.push(`${path}.items has more than ${LIMITS.maxListItems} items`);
    }
    block.items.forEach((item, index) =>
      checkText(errors, `${path}.items[${index}]`, item, { max: LIMITS.mediumText })
    );
    return;
  }
  const { columns, rows } = block;
  if (!Array.isArray(columns) || columns.length < 2 || columns.length > LIMITS.maxTableColumns) {
    errors.push(`${path}.columns must list 2-${LIMITS.maxTableColumns} column names`);
    return;
  }
  columns.forEach((column, index) =>
    checkText(errors, `${path}.columns[${index}]`, column, { max: LIMITS.shortText })
  );
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > LIMITS.maxTableRows) {
    errors.push(`${path}.rows must list 1-${LIMITS.maxTableRows} rows`);
    return;
  }
  rows.forEach((row, rowIndex) => {
    if (!Array.isArray(row) || row.length !== columns.length) {
      errors.push(`${path}.rows[${rowIndex}] must have ${columns.length} cells`);
      return;
    }
    row.forEach((cell, cellIndex) =>
      checkText(errors, `${path}.rows[${rowIndex}][${cellIndex}]`, cell, {
        max: LIMITS.mediumText,
      })
    );
  });
}

function checkGuide(errors, guide) {
  if (!isRecord(guide)) {
    errors.push('guide must be an object');
    return;
  }
  checkText(errors, 'guide.title', guide.title, { max: LIMITS.shortText });
  const { sections } = guide;
  if (!Array.isArray(sections) || sections.length === 0) {
    errors.push('guide.sections must be a non-empty array');
    return;
  }
  if (sections.length > LIMITS.maxGuideSections) {
    errors.push(`guide.sections has more than ${LIMITS.maxGuideSections} sections`);
  }
  sections.forEach((section, index) => {
    const path = `guide.sections[${index}]`;
    if (!isRecord(section)) {
      errors.push(`${path} must be an object`);
      return;
    }
    checkId(errors, `${path}.id`, section.id);
    checkText(errors, `${path}.title`, section.title, { max: LIMITS.shortText });
    if (section.replyRules !== undefined && typeof section.replyRules !== 'boolean') {
      errors.push(`${path}.replyRules must be true or false`);
    }
    if (!Array.isArray(section.blocks) || section.blocks.length === 0) {
      errors.push(`${path}.blocks must be a non-empty array`);
      return;
    }
    if (section.blocks.length > LIMITS.maxBlocksPerSection) {
      errors.push(`${path}.blocks has more than ${LIMITS.maxBlocksPerSection} blocks`);
    }
    section.blocks.forEach((block, blockIndex) =>
      checkBlock(errors, `${path}.blocks[${blockIndex}]`, block)
    );
  });
  checkUniqueIds(errors, 'guide.sections', sections);
}

function checkCase(errors, path, item) {
  if (!isRecord(item)) {
    errors.push(`${path} must be an object`);
    return;
  }
  checkId(errors, `${path}.id`, item.id);
  if (!isRecord(item.requester)) {
    errors.push(`${path}.requester must be an object`);
  } else {
    checkText(errors, `${path}.requester.name`, item.requester.name, { max: LIMITS.shortText });
    checkText(errors, `${path}.requester.detail`, item.requester.detail, {
      max: LIMITS.shortText,
      required: false,
    });
  }
  checkText(errors, `${path}.channel`, item.channel, { max: LIMITS.shortText });
  checkText(errors, `${path}.received`, item.received, { max: LIMITS.shortText });
  checkText(errors, `${path}.subject`, item.subject, { max: LIMITS.shortText });
  checkText(errors, `${path}.body`, item.body, { max: LIMITS.longText });
  if (typeof item.replyRequired !== 'boolean') {
    errors.push(`${path}.replyRequired must be true or false`);
  }
}

export function validateConfig(config) {
  const errors = [];
  if (!isRecord(config)) return ['the config must be a JSON object'];
  if (config.version !== CONFIG_VERSION) {
    errors.push(`version must be ${CONFIG_VERSION}`);
  }

  if (!isRecord(config.desk)) {
    errors.push('desk must be an object');
  } else {
    checkText(errors, 'desk.name', config.desk.name, { max: LIMITS.shortText });
    checkText(errors, 'desk.role', config.desk.role, { max: LIMITS.shortText });
    checkText(errors, 'desk.now', config.desk.now, { max: LIMITS.shortText });
    checkText(errors, 'desk.brief', config.desk.brief, { max: LIMITS.longText });
  }

  if (!isRecord(config.fields)) {
    errors.push('fields must be an object');
  } else {
    for (const key of FIELD_KEYS) checkField(errors, key, config.fields[key]);
  }

  checkGuide(errors, config.guide);

  const { cases } = config;
  if (!Array.isArray(cases)) {
    errors.push('cases must be an array');
    return errors;
  }
  if (cases.length < LIMITS.minCases || cases.length > LIMITS.maxCases) {
    errors.push(`cases must list ${LIMITS.minCases}-${LIMITS.maxCases} cases`);
  }
  cases.forEach((item, index) => checkCase(errors, `cases[${index}]`, item));
  checkUniqueIds(errors, 'cases', cases);
  const replyCases = cases.filter((item) => isRecord(item) && item.replyRequired === true);
  if (replyCases.length > LIMITS.maxReplyCases) {
    errors.push(`at most ${LIMITS.maxReplyCases} cases may require a reply`);
  }
  const hasReplyRules =
    isRecord(config.guide) &&
    Array.isArray(config.guide.sections) &&
    config.guide.sections.some((section) => isRecord(section) && section.replyRules === true);
  if (replyCases.length > 0 && !hasReplyRules) {
    errors.push('a guide section with "replyRules": true is required when a case needs a reply');
  }
  return errors;
}

export function noneLabel(fields) {
  return fields.escalation.noneLabel ?? DEFAULT_NONE_LABEL;
}

export function optionLabel(fields, key, id) {
  return fields[key].options.find((option) => option.id === id)?.label ?? null;
}

function pickOption(option) {
  return { id: option.id, label: option.label };
}

function pickBlock(block) {
  if (block.type === 'paragraph') return { type: 'paragraph', text: block.text };
  if (block.type === 'list') return { type: 'list', items: [...block.items] };
  return { type: 'table', columns: [...block.columns], rows: block.rows.map((row) => [...row]) };
}

/** Allowlist: keys outside it, such as an answer or grader note, never reach the browser. */
export function publicConfig(config) {
  const fields = {};
  for (const key of FIELD_KEYS) {
    fields[key] = {
      label: config.fields[key].label,
      options: config.fields[key].options.map(pickOption),
    };
    if (key === 'escalation') fields[key].noneLabel = noneLabel(config.fields);
  }
  return {
    version: config.version,
    desk: {
      name: config.desk.name,
      role: config.desk.role,
      now: config.desk.now,
      brief: config.desk.brief,
    },
    fields,
    guide: {
      title: config.guide.title,
      sections: config.guide.sections.map((section) => ({
        id: section.id,
        title: section.title,
        replyRules: section.replyRules === true,
        blocks: section.blocks.map(pickBlock),
      })),
    },
    cases: config.cases.map((item) => ({
      id: item.id,
      requester: {
        name: item.requester.name,
        ...(item.requester.detail ? { detail: item.requester.detail } : {}),
      },
      channel: item.channel,
      received: item.received,
      subject: item.subject,
      body: item.body,
      replyRequired: item.replyRequired,
    })),
  };
}
