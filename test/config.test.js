import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';

import { NOT_ESCALATED, publicConfig, validateConfig } from '../shared/config.js';
import { EXAMPLES, exampleConfig, exampleFile } from './helpers.js';

describe('validateConfig', () => {
  for (const name of EXAMPLES) {
    it(`accepts the ${name} example`, () => {
      assert.deepEqual(validateConfig(exampleConfig(name)), []);
    });
  }

  it('rejects duplicate case ids', () => {
    const config = exampleConfig();
    config.cases[1].id = config.cases[0].id;
    assert.match(validateConfig(config).join('\n'), /cases has the id "SD-2041" more than once/);
  });

  it('rejects an escalation option that reuses the reserved "none" id', () => {
    const config = exampleConfig();
    config.fields.escalation.options[0].id = NOT_ESCALATED;
    assert.match(validateConfig(config).join('\n'), /reserved for the "not escalated" choice/);
  });

  it('rejects two options with the same label, which the report could not tell apart', () => {
    const config = exampleConfig();
    config.fields.owner.options[1].label = config.fields.owner.options[0].label;
    assert.match(validateConfig(config).join('\n'), /fields\.owner\.options has duplicate labels/);
  });

  it('rejects a noneLabel that repeats an escalation option label', () => {
    const config = exampleConfig();
    config.fields.escalation.noneLabel = config.fields.escalation.options[0].label;
    assert.match(validateConfig(config).join('\n'), /fields\.escalation\.options has duplicate labels/);
  });

  it('accepts any number of cases, options and sections, and long text', () => {
    const config = exampleConfig();
    const template = config.cases[0];
    config.cases = Array.from({ length: 60 }, (_, index) => ({ ...template, id: `CASE-${index + 1}` }));
    config.cases[0].body = 'x'.repeat(20000);
    config.fields.owner.options = Array.from({ length: 30 }, (_, index) => ({ id: `team-${index}`, label: `Team ${index}` }));
    config.guide.sections = Array.from({ length: 25 }, (_, index) => ({
      id: `section-${index}`,
      title: `Section ${index}`,
      blocks: [{ type: 'paragraph', text: 'y'.repeat(5000) }],
    }));
    assert.deepEqual(validateConfig(config), []);
  });

  it('rejects a table row whose cell count differs from its columns', () => {
    const config = exampleConfig();
    config.guide.sections[0].blocks[1].rows[0].push('extra');
    assert.match(validateConfig(config).join('\n'), /must have 2 cells, one per column/);
  });

  it('rejects a customerId that names no account', () => {
    const config = exampleConfig('claims-intake');
    config.cases[0].requester.customerId = 'PH-00000';
    assert.match(validateConfig(config).join('\n'), /cases\[0\]\.requester\.customerId "PH-00000" is not an id in customers\.accounts/);
  });

  it('rejects a customerId in a config without customers', () => {
    const config = exampleConfig();
    config.cases[0].requester.customerId = 'PH-1';
    assert.match(validateConfig(config).join('\n'), /links to "PH-1", but the config has no customers/);
  });

  it('rejects an earlier case that reuses a queue case id, which would make merges ambiguous', () => {
    const config = exampleConfig('claims-intake');
    config.customers.accounts[0].history[0].id = config.cases[1].id;
    assert.match(validateConfig(config).join('\n'), /is a case in the queue; an earlier case needs its own id/);
  });

  it('rejects duplicate account ids and duplicate earlier case ids across accounts', () => {
    const config = exampleConfig('claims-intake');
    const [first, second] = config.customers.accounts;
    second.id = first.id;
    second.history = [{ ...first.history[0] }];
    const errors = validateConfig(config).join('\n');
    assert.match(errors, /customers\.accounts has the id "PH-40211" more than once/);
    assert.match(errors, /customers history has the id "FN-5102" more than once/);
  });

  it('rejects an earlier case without an outcome', () => {
    const config = exampleConfig('claims-intake');
    delete config.customers.accounts[0].history[0].outcome;
    assert.match(validateConfig(config).join('\n'), /customers\.accounts\[0\]\.history\[0\]\.outcome must be a non-empty string/);
  });
});

describe('publicConfig', () => {
  it('drops keys outside the allowlist at every level', () => {
    const marker = 'LEAK-MARKER';
    const config = exampleConfig();
    config.answerKey = marker;
    config.desk.graderNotes = marker;
    config.fields.priority.leak = marker;
    config.fields.priority.options[0].expected = marker;
    config.guide.leak = marker;
    config.guide.sections[0].internal = marker;
    config.guide.sections[0].blocks[0].hint = marker;
    config.cases[0].expected = marker;
    config.cases[0].requester.contact = marker;

    assert.ok(!JSON.stringify(publicConfig(config)).includes(marker));
  });

  it('keeps customer records and their links, and drops undocumented keys inside them', () => {
    const marker = 'LEAK-MARKER';
    const config = exampleConfig('claims-intake');
    config.customers.riskScore = marker;
    config.customers.accounts[0].internalNote = marker;
    config.customers.accounts[0].facts[0].hidden = marker;
    config.customers.accounts[0].history[0].fraudFlag = marker;

    const shown = publicConfig(config);
    assert.ok(!JSON.stringify(shown).includes(marker));
    assert.equal(shown.customers.label, 'Policyholder');
    assert.deepEqual(shown.customers.accounts[0].history[0], {
      id: 'FN-5102',
      when: '3 years ago',
      subject: 'Windscreen chip repaired',
      outcome: 'Paid',
    });
    assert.equal(shown.cases[0].requester.customerId, 'PH-40211');
  });

  it('leaves customers out for a config without them', () => {
    assert.equal('customers' in publicConfig(exampleConfig()), false);
  });
});

describe('npm run validate', () => {
  it('exits 0 for both examples', () => {
    const output = execFileSync(
      process.execPath,
      ['scripts/validate.js', exampleFile('it-service-desk', 'config.json'), exampleFile('claims-intake', 'config.json')],
      { encoding: 'utf8' }
    );
    assert.match(output, /OK .*it-service-desk.*15 cases, 5 guide sections/);
    assert.match(output, /OK .*claims-intake.*8 cases, 4 guide sections/);
  });

  it('exits 1 and names the problem for a broken config', () => {
    const result = spawnSync(process.execPath, ['scripts/validate.js', exampleFile('it-service-desk', 'strong-solution.json')], {
      encoding: 'utf8',
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /INVALID .*desk must be an object/s);
  });
});
