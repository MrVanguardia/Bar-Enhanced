#!/usr/bin/env bash
# Compatibility entry point for the canonical release package.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$ROOT_DIR/tools/package-extension.sh" "$ROOT_DIR"
cp "$ROOT_DIR/bar-enhanced@mrvanguardia.shell-extension.zip" \
    "$ROOT_DIR/bar-enhanced@mrvanguardia.zip"
printf 'Created %s\n' "$ROOT_DIR/bar-enhanced@mrvanguardia.zip"
