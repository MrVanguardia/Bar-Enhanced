#!/usr/bin/env bash
# Build a distributable GNOME Shell extension archive, including nested modules.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXTENSION_DIR="$ROOT_DIR/bar-enhanced@mrvanguardia"
OUT_DIR="${1:-$ROOT_DIR/dist}"
METADATA_FILE="$EXTENSION_DIR/metadata.json"
LICENSE_FILE="$ROOT_DIR/LICENSE"
NOTICES_FILE="$ROOT_DIR/THIRD_PARTY_NOTICES.md"

# The archive is written after changing into a staging directory; normalize a
# caller-provided relative output path before that happens.
mkdir -p "$OUT_DIR"
OUT_DIR="$(cd "$OUT_DIR" && pwd)"

if [ ! -f "$METADATA_FILE" ]; then
    echo "metadata.json not found in $EXTENSION_DIR" >&2
    exit 1
fi

if [ ! -f "$LICENSE_FILE" ]; then
    printf '%s\n' "Missing project license: $LICENSE_FILE" >&2
    exit 1
fi
if [ ! -f "$NOTICES_FILE" ]; then
    printf '%s\n' "Missing third-party notices: $NOTICES_FILE" >&2
    exit 1
fi

UUID="$(sed -nE 's/^[[:space:]]*"uuid"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' "$METADATA_FILE")"
if [ -z "$UUID" ]; then
    echo 'Could not read extension UUID from metadata.json.' >&2
    exit 1
fi

STAGING_DIR="$(mktemp -d)"
trap 'rm -rf "$STAGING_DIR"' EXIT

cp -a "$EXTENSION_DIR/." "$STAGING_DIR/"
# EGO packages must carry the project's GPL license as well as any bundled
# component notices contained in their respective directories.
cp "$LICENSE_FILE" "$STAGING_DIR/LICENSE"
cp "$NOTICES_FILE" "$STAGING_DIR/THIRD_PARTY_NOTICES.md"
# Translation sources are kept in Git for maintenance; the runtime reads only
# compiled .mo catalogues from locale directories.
rm -rf "$STAGING_DIR/po" "$STAGING_DIR/dash-to-dock/po"
find "$STAGING_DIR" -type f \( -name '*.po' -o -name '*.pot' \) -delete
# Development graph caches are useful in the repository but must never ship in
# an extension archive: they increase size and can contain source metadata.
rm -rf "$STAGING_DIR/graphify-out"
rm -f "$STAGING_DIR/schemas/gschemas.compiled"
glib-compile-schemas --strict "$STAGING_DIR/schemas"

ARCHIVE="$OUT_DIR/$UUID.shell-extension.zip"
rm -f "$ARCHIVE"
(
    cd "$STAGING_DIR"
    zip -qr "$ARCHIVE" .
)

printf 'Created %s\n' "$ARCHIVE"
