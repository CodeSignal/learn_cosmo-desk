#!/bin/sh
# BASE-TASK CONTENT: paste into the base task's .codesignal/setup.sh. Not run from this repo.
# The task's project file cosmo-desk/config.json is already here; the release unpacks beside it.

READY_MARKER=/tmp/cosmo-desk-release-ready
rm -f "$READY_MARKER"
mkdir -p cosmo-desk
cd cosmo-desk

# Production runs the latest release; staging runs the newest build.
RELEASE_URL="https://github.com/CodeSignal/learn_cosmo-desk/releases/latest/download/release.tar.gz"
if [ "$APP_ENVIRONMENT" = "staging" ]; then
  RELEASE_URL="https://github.com/CodeSignal/learn_cosmo-desk/releases/download/prerelease/release.tar.gz"
fi

# Stop on a failed download or unpack rather than start whatever an earlier session left here.
if ! wget "$RELEASE_URL" -O release.tar.gz; then
  rm -f release.tar.gz
  echo "Cannot start the simulation: the release could not be downloaded from $RELEASE_URL" >&2
  exit 1
fi
if ! tar -xzf release.tar.gz; then
  rm -f release.tar.gz
  echo "Cannot start the simulation: the release could not be unpacked" >&2
  exit 1
fi
rm release.tar.gz
touch "$READY_MARKER"

# The release is flat and bundled: no install. The platform does not expect this script to return.
export PORT=3000
IS_PRODUCTION=true npm run start:prod
