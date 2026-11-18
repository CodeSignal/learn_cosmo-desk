# Session scripts

These are the scripts a CodeSignal base task runs for Cosmo Desk. They live in the base task; the
copies here keep them versioned next to the release layout they depend on, so a change to either
shows up in one diff. Nothing in this directory runs from the repo.

| Base-task file | Runs on | Job |
|---|---|---|
| `.codesignal/setup.sh` | session start | download the release into `cosmo-desk/`, start the server on port 3000 |
| `.codesignal/run_solution.sh` | Run | print the Cosmo Desk Session Report, and keep a copy at `.codesignal/report.md` |
| `main.sh` | Run | `bash .codesignal/run_solution.sh` |

- **One directory**, `cosmo-desk/`, holds the release, the task's `config.json` (project file
  `cosmo-desk/config.json`) and the candidate's saved work, `solution.json`.
- **Demo desk:** the base task also holds `examples/it-service-desk/config.json` as
  `cosmo-desk/config.json` (no `readonly_` prefix), so its own question opens a working desk. A
  task's project file at the same path replaces it on export; keep the prefix off, or both files ship.
- **Channels:** `setup.sh` downloads the `latest` release, or the floating `prerelease` build when
  `$APP_ENVIRONMENT` is `staging` (see the main README, "Releases").
- **Fails closed:** a failed download or unpack stops the session instead of starting a release an
  earlier session left behind.
- **Readiness:** `setup.sh` never returns, so it touches `/tmp/cosmo-desk-release-ready` once the
  release is unpacked; `run_solution.sh` refuses to report before that.
- **Call scripts through `bash`:** read-only base-task files arrive without the execute bit, so
  `main.sh` must be `bash .codesignal/run_solution.sh`, not the bare path.
- **Grading is judged:** there is no command grader. The task's response rubric is graded against
  the printed report.
