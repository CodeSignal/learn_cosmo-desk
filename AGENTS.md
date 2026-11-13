# Repository guidelines

Cosmo Desk, a case queue triage simulation. Read [README.md](README.md) for the spec and
[docs/authoring.md](docs/authoring.md) for the task format.

Derived from [learn_bespoke-template](https://github.com/CodeSignal/learn_bespoke-template).
`BESPOKE-TEMPLATE.md` stays as the design system reference; this file wins where they disagree.

## Platform contracts: do not break these

| Contract | Where |
|---|---|
| `npm run build` produces `dist/` | `vite.config.js` |
| `IS_PRODUCTION=true npm run start:prod` serves `dist/` and the API on port 3000 | `server.js` |
| The server reads `config.json` and writes `solution.json` in its working directory | `server.js`, `lib/files.js` |
| Design system as a git submodule at `client/design-system` | `.gitmodules` |
| A CI release is fetched by the session, never `npm install` in a session | `.github/workflows/build-release.yml`, `scripts/pack-release.js` |
| Grading reads whatever `npm run report` prints to STDOUT | `scripts/report.js` |

Deliberate divergences from the template:

- **ESM and React.** `"type": "module"`; the client is React + Vite. React is a build-time
  dependency only; the server has no runtime dependencies.
- **No WebSocket or `/message` route.** Nothing in the simulation pushes to the browser.
- **Binds `127.0.0.1` in development**, all interfaces only with `IS_PRODUCTION=true`.
- **`package.json` declares `Elastic-2.0`**, matching `LICENSE`.

## Rules

- **The repo is public.** Never commit answer keys for real tasks, internal identifiers, customer
  names or credentials. `examples/` are fixtures for tests and are never given to candidates.
- **The browser gets an allowlist.** `publicConfig` in `shared/config.js` copies only documented
  keys. Add a key there and to `validateConfig` together, and update `config.example.jsonc` and
  `docs/authoring.md`.
- **Never trust what the browser sends.** Every save goes through `applyPatch`, which checks ids
  against the config. The server stores decisions only; it never computes or stores a score.
- **The report is the grading surface.** Keep its order and wording stable, print labels rather
  than ids, escape candidate text (`inline`) or fence it (`fenced`), and never print expected
  values. Update `test/report.test.js` with any change.
- **Design system tokens** in `client/theme/app.css` for colours, spacing, radii and font sizes;
  only layout widths, breakpoints, font weights and line heights are literal (the design system
  has no tokens for them). Check light and dark theme, a narrow preview (under 760px) and full
  screen.
- `.label-*` typography classes are uppercased by the design system; use them only for
  micro-labels.

## Before you commit

```bash
npm test
npm run validate -- examples/*/config.json
npm run release:local   # build, pack and boot the tarball
```
