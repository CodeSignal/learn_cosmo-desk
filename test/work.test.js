import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { applyPatch, emptyEntry, emptyWork, isTriaged, progress, sanitizeWork } from '../shared/work.js';
import { exampleConfig, readExample } from './helpers.js';

const config = exampleConfig();

describe('applyPatch', () => {
  it('stores a valid routing decision without touching other cases', () => {
    const { work } = applyPatch(config, emptyWork(), 'SD-2041', { priority: 'P3' });
    assert.equal(work.cases['SD-2041'].priority, 'P3');
    assert.deepEqual(Object.keys(work.cases), ['SD-2041']);
  });

  it('rejects an option id the config does not define', () => {
    assert.match(applyPatch(config, emptyWork(), 'SD-2041', { owner: 'nobody' }).error, /configured options/);
  });

  it('rejects an unknown case, an unknown field and a self-duplicate', () => {
    assert.match(applyPatch(config, emptyWork(), 'SD-9999', { priority: 'P1' }).error, /unknown case/);
    assert.match(applyPatch(config, emptyWork(), 'SD-2041', { score: 10 }).error, /unknown field "score"/);
    assert.match(applyPatch(config, emptyWork(), 'SD-2041', { duplicateOf: 'SD-2041' }).error, /itself/);
  });

  it('rejects a reply over the length limit', () => {
    assert.match(applyPatch(config, emptyWork(), 'SD-2045', { reply: 'x'.repeat(4001) }).error, /longer than 4000/);
  });
});

describe('merging', () => {
  it('rejects merging into a case that is itself merged, which would form a chain or cycle', () => {
    const { work } = applyPatch(config, emptyWork(), 'SD-2044', { duplicateOf: 'SD-2042' });
    assert.match(applyPatch(config, work, 'SD-2055', { duplicateOf: 'SD-2044' }).error, /itself merged/);
  });

  it('rejects merging a case that other cases are merged into', () => {
    const { work } = applyPatch(config, emptyWork(), 'SD-2044', { duplicateOf: 'SD-2042' });
    assert.match(applyPatch(config, work, 'SD-2042', { duplicateOf: 'SD-2041' }).error, /cannot be merged/);
  });

  it('allows unmerging a case that was merged', () => {
    const { work } = applyPatch(config, emptyWork(), 'SD-2044', { duplicateOf: 'SD-2042' });
    assert.equal(applyPatch(config, work, 'SD-2044', { duplicateOf: null }).work.cases['SD-2044'].duplicateOf, null);
  });
});

describe('isTriaged', () => {
  it('needs a reason for an escalation but not for "Not escalated"', () => {
    const routed = { category: 'security', priority: 'P2', owner: 'secops', escalationReason: '', duplicateOf: null, reply: '' };
    assert.equal(isTriaged({ ...routed, escalation: 'none' }), true);
    assert.equal(isTriaged({ ...routed, escalation: 'sir' }), false);
    assert.equal(isTriaged({ ...routed, escalation: 'sir', escalationReason: 'Credentials entered' }), true);
  });

  it('counts a merged case as triaged without routing', () => {
    assert.equal(isTriaged({ ...emptyEntry(), duplicateOf: 'SD-2042' }), true);
  });
});

describe('sanitizeWork', () => {
  it('keeps valid saved values and drops ones the config would reject', () => {
    const raw = {
      version: 1,
      cases: {
        'SD-2041': { priority: 'P3', owner: 'not-a-team', verdict: 'PASS' },
        'SD-9999': { priority: 'P1' },
      },
    };
    assert.deepEqual(sanitizeWork(config, raw).cases, {
      'SD-2041': {
        category: null,
        priority: 'P3',
        owner: null,
        escalation: null,
        escalationReason: '',
        duplicateOf: null,
        reply: '',
      },
    });
  });

  it('reads the strong example solution back unchanged', () => {
    const strong = readExample('it-service-desk', 'strong-solution.json');
    assert.deepEqual(sanitizeWork(config, strong), strong);
  });
});

describe('progress', () => {
  it('counts the strong example as fully triaged with both replies', () => {
    assert.deepEqual(progress(config, readExample('it-service-desk', 'strong-solution.json')), {
      triaged: 15,
      total: 15,
      replies: 2,
      repliesTotal: 2,
    });
  });
});
