# Cosmo Desk

A case queue triage simulation for CodeSignal Learn and Hire. The candidate works a queue of
intake cases against a written routing guide: for each case they set a category, a priority and
an owner, decide whether to escalate, merge duplicates, and write short replies on the cases that
need one. It measures how accurately someone applies a policy to realistic, messy requests, and
how well they communicate within it.

One app serves many desks. The field labels and options, the guide and the cases all come from
the task's `config.json`, so the same simulation runs an IT service desk, a claims intake queue,
an eligibility desk or a fraud alert queue.

## Spec

- **Candidate:** triages 5 to 25 cases (15 in a Hire task) against a routing guide and writes up
  to 3 replies (2 in a Hire task).
- **Kind:** builder; the triaged queue is the artifact. No AI in the app.
- **Grading:** a judged state report. `npm run report` prints every decision and reply in a fixed
  order; the platform's grader judges it against criteria the app never sees.
- **Varies per task:** the desk, field labels and options, the guide, the cases
  ([authoring guide](docs/authoring.md)).
- **Runtime:** Node.js only; the server has no runtime dependencies and the client ships prebuilt.

## Run it locally

```bash
git submodule update --init --recursive
npm install
npm run start:dev        # Vite on :3000, API on :3001, with the IT service desk example
```

`CONFIG_FILE=examples/claims-intake/config.json npm run start:dev` loads the other example. Work
saves to `.dev-state/solution.json`.

As a session runs it:

```bash
npm run build
cp examples/it-service-desk/config.json config.json
npm run start:prod       # serves dist/ and the API on :3000, reads ./config.json
npm run report           # prints the report from ./config.json and ./solution.json
```

## Commands

| Command | What it does |
|---|---|
| `npm test` | headless tests: config validator, work rules, report, server API |
| `npm run validate -- <config.json>...` | checks task configs |
| `npm run report [-- --dir <dir>]` | prints the session report |
| `npm run build` | builds the client into `dist/` |

## Layout

```
server.js          HTTP server: allowlisted config, per-case saves, reset, static dist/
shared/            config format and validator, work rules (used by server and client)
lib/               file loading and saving, the session report
scripts/           validate and report entry points
client/            React app: App, components/, lib/, theme/; design system submodule
examples/          two complete tasks with strong and weak solutions (test fixtures only)
docs/authoring.md  writing a task
test/              node:test, no browser
```

## License

[Elastic License 2.0](LICENSE).
