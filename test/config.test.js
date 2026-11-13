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

  it('requires reply rules in the guide when a case needs a reply', () => {
    const config = exampleConfig();
    for (const section of config.guide.sections) delete section.replyRules;
    assert.match(validateConfig(config).join('\n'), /"replyRules": true is required/);
  });

  it('rejects a table row whose cell count differs from its columns', () => {
    const config = exampleConfig();
    config.guide.sections[0].blocks[1].rows[0].push('extra');
    assert.match(validateConfig(config).join('\n'), /must have 2 cells/);
  });

  it('rejects more than three reply cases', () => {
    const config = exampleConfig();
    for (const item of config.cases.slice(0, 4)) item.replyRequired = true;
    assert.match(validateConfig(config).join('\n'), /at most 3 cases may require a reply/);
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
});

describe('npm run validate', () => {
  it('exits 0 for both examples', () => {
    const output = execFileSync(
      process.execPath,
      ['scripts/validate.js', exampleFile('it-service-desk', 'config.json'), exampleFile('claims-intake', 'config.json')],
      { encoding: 'utf8' }
    );
    assert.match(output, /OK .*it-service-desk.*15 cases, 2 needing a reply/);
    assert.match(output, /OK .*claims-intake.*8 cases, 1 needing a reply/);
  });

  it('exits 1 and names the problem for a broken config', () => {
    const result = spawnSync(process.execPath, ['scripts/validate.js', exampleFile('it-service-desk', 'strong-solution.json')], {
      encoding: 'utf8',
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /INVALID .*desk must be an object/s);
  });
});
