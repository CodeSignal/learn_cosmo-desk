#!/bin/bash
# BASE-TASK CONTENT: paste into the base task's .codesignal/run_solution.sh. Not run from this repo.
# Run prints this script's STDOUT for the reviewer and the grader; a copy stays at .codesignal/report.md.
cd /usercode/FILESYSTEM/cosmo-desk || exit 1
if [ ! -f /tmp/cosmo-desk-release-ready ]; then
  echo "The simulation is not ready: it is still starting, or its setup failed. Wait a few seconds and run again; if this repeats, reset the session."
  exit 1
fi
if ! REPORT=$(node scripts/report.js 2>&1); then
  echo "$REPORT"
  exit 1
fi
printf '%s\n' "$REPORT"
# The printed report is what grading reads; the saved copy is a convenience and must not fail Run.
{ printf '%s\n' "$REPORT" > /usercode/FILESYSTEM/.codesignal/report.md; } 2>/dev/null || true
