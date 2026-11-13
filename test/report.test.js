import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';

import { fenced, inline, renderReport } from '../lib/report.js';
import { applyPatch, emptyWork } from '../shared/work.js';
import { exampleConfig, exampleFile, readExample } from './helpers.js';

const config = exampleConfig();
const strong = renderReport(config, readExample('it-service-desk', 'strong-solution.json'));
const weak = renderReport(config, readExample('it-service-desk', 'weak-solution.json'));

function row(report, caseId) {
  return report.split('\n').find((line) => line.startsWith(`| ${caseId} |`));
}

describe('renderReport', () => {
  it('prints one triage row per case in queue order', () => {
    const ids = strong
      .split('\n')
      .filter((line) => /^\| SD-\d+ \|/.test(line))
      .map((line) => line.split('|')[1].trim());
    assert.deepEqual(ids, config.cases.map((item) => item.id));
  });

  it('shows the routing differences a judge needs to tell the strong and weak examples apart', () => {
    assert.match(row(strong, 'SD-2043'), /\| Hardware \| P4 Low \| Endpoint team \| Not escalated \|/);
    assert.match(row(weak, 'SD-2043'), /\| P1 Critical \|/);
    assert.match(row(strong, 'SD-2044'), /merged into SD-2042/);
    assert.match(row(weak, 'SD-2044'), /\| — \| Network and VPN \| P1 Critical \|/);
    assert.match(row(strong, 'SD-2051'), /Security incident response \| Payroll app exposes/);
    assert.match(row(weak, 'SD-2051'), /Not escalated/);
    assert.match(row(strong, 'SD-2048'), /\| P2 High \| Endpoint team \| Vendor support \|/);
  });

  it('lists untouched and partly triaged cases by id', () => {
    assert.match(strong, /- Untouched cases: none/);
    assert.match(weak, /- Untouched cases: SD-2054, SD-2055/);
    assert.match(weak, /- Started but not fully triaged: SD-2052/);
    assert.match(weak, /- Cases triaged: 12 of 15/);
  });

  it('prints each reply case with its original message, the reply and the reply rules', () => {
    assert.match(strong, /### SD-2045: Invoice email asked me to log in/);
    assert.match(strong, /Please change your password now in the self-service portal/);
    assert.match(weak, /Send me your password and I'll check your account/);
    assert.match(weak, /## Reply rules from the routing guide[\s\S]*Never ask for a password/);
  });

  it('drops an escalation reason left over after the case was set back to Not escalated', () => {
    let { work } = applyPatch(config, emptyWork(), 'SD-2047', { escalation: 'vendor', escalationReason: 'stale reason' });
    ({ work } = applyPatch(config, work, 'SD-2047', { escalation: 'none' }));
    const report = renderReport(config, work);
    assert.match(row(report, 'SD-2047'), /\| Not escalated \| — \| — \|$/);
    assert.ok(!report.includes('stale reason'));
  });

  it('states the in-world time the case times are relative to', () => {
    assert.match(strong, /- Shift time at the start: Monday, 08:10/);
  });

  it('lists exactly the cases the candidate chose to reply to', () => {
    assert.match(strong, /- Replies written: 3 \(SD-2045, SD-2051, SD-2053\)/);
    assert.match(weak, /- Replies written: 3 \(SD-2043, SD-2045, SD-2053\)/);
    assert.match(row(strong, 'SD-2051'), /\| written \|$/);
    assert.match(row(strong, 'SD-2043'), /\| — \|$/);
    assert.match(weak, /### SD-2043: URGENT!!! second monitor[\s\S]*we'll get your monitor to you today/);
  });

  it('says so when the candidate wrote no replies, and still prints the reply rules', () => {
    const { work } = applyPatch(config, emptyWork(), 'SD-2041', { priority: 'P3' });
    const report = renderReport(config, work);
    assert.match(report, /- Replies written: 0 \(none\)/);
    assert.match(report, /_The candidate wrote no replies\._/);
    assert.match(report, /## Reply rules from the routing guide[\s\S]*Reply only to every Security case/);
  });

  it('keeps candidate text from breaking the table or the reply fence', () => {
    let { work } = applyPatch(config, emptyWork(), 'SD-2042', {
      escalation: 'duty-manager',
      escalationReason: 'site down | see <b>log</b>\n## not a heading',
    });
    ({ work } = applyPatch(config, work, 'SD-2045', { reply: 'Hi\n```\n## injected\n```' }));
    const report = renderReport(config, work);

    assert.equal(row(report, 'SD-2042').split(' | ').length, 9);
    assert.match(row(report, 'SD-2042'), /site down \\\| see \\<b\\>log\\<\/b\\> \\#\\# not a heading/);
    assert.match(report, /````text\nHi\n```\n## injected\n```\n````/);
  });
});

describe('report helpers', () => {
  it('fences text with a backtick run longer than any inside it', () => {
    assert.equal(fenced('a ````` b'), '``````text\na ````` b\n``````');
  });

  it('collapses whitespace and escapes Markdown in inline text', () => {
    assert.equal(inline('  a\n|b*  '), 'a \\|b\\*');
  });
});

describe('npm run report', () => {
  it('prints the report for a config and saved work', () => {
    const output = execFileSync(
      process.execPath,
      [
        'scripts/report.js',
        '--config',
        exampleFile('claims-intake', 'config.json'),
        '--work',
        exampleFile('claims-intake', 'weak-solution.json'),
      ],
      { encoding: 'utf8' }
    );
    assert.match(output, /\| Case \| Subject \| Duplicate \| Line of business \| Handling tier \| Claims unit \| Referral \|/);
    assert.match(output, /- Untouched cases: FN-7736, FN-7737/);
    assert.match(output, /\| FN-7730 \|.*\| No referral \|/);
  });

  it('exits non-zero when the config is missing, so the task is not scored as empty work', () => {
    const result = spawnSync(process.execPath, ['scripts/report.js', '--dir', '/nonexistent-cosmo-desk'], {
      encoding: 'utf8',
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /no task config/);
  });
});
