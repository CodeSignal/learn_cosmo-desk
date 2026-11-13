export const CONFIG_VERSION = 1;

export const FIELD_KEYS = ['category', 'priority', 'owner', 'escalation'];

export const NOT_ESCALATED = 'none';

export const DEFAULT_NONE_LABEL = 'Not escalated';

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const BLOCK_TYPES = ['paragraph', 'list', 'table'];

export function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function checkText(errors, path, value, { required = true } = {}) {
  if (value === undefined && !required) return;
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${path} must be a non-empty string`);
  }
}

function checkId(errors, path, id) {
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
    errors.push(`${path} must start with a letter or digit and use only letters, digits, ".", "_" or "-"`);
  }
}

function checkList(errors, path, value, what) {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${path} must list at least one ${what}`);
    return false;
  }
  return true;
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
  checkText(errors, `${path}.label`, field.label);
  if (!checkList(errors, `${path}.options`, field.options, 'option')) return;
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
    checkText(errors, `${optionPath}.label`, option.label);
  });
  checkUniqueIds(errors, `${path}.options`, field.options);
  const labels = field.options.filter(isRecord).map((option) => option.label);
  if (key === 'escalation') {
    checkText(errors, `${path}.noneLabel`, field.noneLabel, { required: false });
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
    checkText(errors, `${path}.text`, block.text);
    return;
  }
  if (block.type === 'list') {
    if (!checkList(errors, `${path}.items`, block.items, 'item')) return;
    block.items.forEach((item, index) => checkText(errors, `${path}.items[${index}]`, item));
    return;
  }
  const { columns, rows } = block;
  if (!checkList(errors, `${path}.columns`, columns, 'column name')) return;
  columns.forEach((column, index) => checkText(errors, `${path}.columns[${index}]`, column));
  if (!checkList(errors, `${path}.rows`, rows, 'row')) return;
  rows.forEach((row, rowIndex) => {
    if (!Array.isArray(row) || row.length !== columns.length) {
      errors.push(`${path}.rows[${rowIndex}] must have ${columns.length} cells, one per column`);
      return;
    }
    row.forEach((cell, cellIndex) => checkText(errors, `${path}.rows[${rowIndex}][${cellIndex}]`, cell));
  });
}

function checkGuide(errors, guide) {
  if (!isRecord(guide)) {
    errors.push('guide must be an object');
    return;
  }
  checkText(errors, 'guide.title', guide.title);
  if (!checkList(errors, 'guide.sections', guide.sections, 'section')) return;
  guide.sections.forEach((section, index) => {
    const path = `guide.sections[${index}]`;
    if (!isRecord(section)) {
      errors.push(`${path} must be an object`);
      return;
    }
    checkId(errors, `${path}.id`, section.id);
    checkText(errors, `${path}.title`, section.title);
    if (section.replyRules !== undefined && typeof section.replyRules !== 'boolean') {
      errors.push(`${path}.replyRules must be true or false`);
    }
    if (!checkList(errors, `${path}.blocks`, section.blocks, 'block')) return;
    section.blocks.forEach((block, blockIndex) => checkBlock(errors, `${path}.blocks[${blockIndex}]`, block));
  });
  checkUniqueIds(errors, 'guide.sections', guide.sections);
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
    checkText(errors, `${path}.requester.name`, item.requester.name);
    checkText(errors, `${path}.requester.detail`, item.requester.detail, { required: false });
  }
  for (const key of ['channel', 'received', 'subject', 'body']) checkText(errors, `${path}.${key}`, item[key]);
}

/** Checks structure only; how many cases, options or sections a task has is the author's choice. */
export function validateConfig(config) {
  const errors = [];
  if (!isRecord(config)) return ['the config must be a JSON object'];
  if (config.version !== CONFIG_VERSION) {
    errors.push(`version must be ${CONFIG_VERSION}`);
  }

  if (!isRecord(config.desk)) {
    errors.push('desk must be an object');
  } else {
    for (const key of ['name', 'role', 'now', 'brief']) checkText(errors, `desk.${key}`, config.desk[key]);
  }

  if (!isRecord(config.fields)) {
    errors.push('fields must be an object');
  } else {
    for (const key of FIELD_KEYS) checkField(errors, key, config.fields[key]);
  }

  checkGuide(errors, config.guide);

  if (checkList(errors, 'cases', config.cases, 'case')) {
    config.cases.forEach((item, index) => checkCase(errors, `cases[${index}]`, item));
    checkUniqueIds(errors, 'cases', config.cases);
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
    })),
  };
}
