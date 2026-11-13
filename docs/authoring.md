# Authoring a Cosmo Desk task

A task is one `config.json`: a desk, the four decision fields, a routing guide and the cases.
[`config.example.jsonc`](../config.example.jsonc) annotates every key, and
[`examples/`](../examples) holds two complete tasks. Validate before shipping:

```bash
npm run validate -- path/to/config.json
```

## What a good task looks like

- **Every case has one defensible answer under the guide.** The candidate decides from the case
  text and the guide alone, so each case must state the facts its routing depends on: how many
  people are affected, whether work has stopped, who the requester is, what was exposed.
- **The guide is complete and unambiguous.** Owner by category, a priority rule, a duplicate rule,
  escalation triggers with a tie-break, and reply rules. If two rules can apply, say which wins.
- **Traps reward careful reading.** Useful ones: shouted urgency on a low-impact problem, a
  duplicate worded differently (from the same requester or about the same outage), an escalation
  trigger in the middle of a calm message, a requester who names the wrong category, a seniority
  or deadline bump.
- **The candidate decides which cases need a reply.** Every case offers an optional reply, so the
  guide must say when to reply (for example "every Security case and every request for new
  software; no reply otherwise") and what a reply must include, ask for and never promise. Mark
  those sections `"replyRules": true`; the report hands them to the grader.
- **No real companies, products or people.** Use invented organisations and names.
- **No calendar dates.** Use weekdays and times relative to `desk.now`.

## Where the answer key lives

Not in this file and not in this repository. The config is served to the candidate's browser
(through an allowlist, but treat every key as visible). For Hire, the expected routing for each
case, and which cases need a reply, belong in the task's response rubric, which only the grader
reads.

## How the work is graded

The candidate's decisions save to `solution.json` beside `config.json`. `npm run report` (run by
the session's `run_solution.sh`) prints the Cosmo Desk Session Report from those two files:

- counts of triaged cases and written replies, and the ids of untouched or half-triaged cases;
- one table row per case in queue order: duplicate target, the four decisions by label, the
  escalation reason and whether a reply was written (`—` means not set; a merged case keeps no
  routing);
- each case the candidate replied to, with its original message and the reply, fenced verbatim;
- the guide sections marked `replyRules`.

Write rubric criteria against these facts, for example "priority matches the key in all 15
rows: 5; one difference: 4; ...".

## Size

The validator checks structure only: required fields, unique ids and labels, table rows that match
their columns. How many cases, options, guide sections or replies a task has is up to the author;
the examples use 8 and 15 cases. The only limits are on what the candidate types: 300 characters
for an escalation reason and 4000 for a reply.
