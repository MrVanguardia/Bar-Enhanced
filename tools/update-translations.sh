#!/usr/bin/env bash
# Regenerate the Bar Enhanced gettext template and Spanish compiled catalogue.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXTENSION_DIR="$ROOT_DIR/bar-enhanced@mrvanguardia"
POT_FILE="$EXTENSION_DIR/po/bar-enhanced.pot"
ES_PO="$EXTENSION_DIR/locale/es/LC_MESSAGES/bar-enhanced.po"
ES_MO="$EXTENSION_DIR/locale/es/LC_MESSAGES/bar-enhanced.mo"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

command -v xgettext >/dev/null || {
    echo 'xgettext is required; install gettext.' >&2
    exit 1
}
command -v msgmerge >/dev/null || {
    echo 'msgmerge is required; install gettext.' >&2
    exit 1
}
command -v msgfmt >/dev/null || {
    echo 'msgfmt is required; install gettext.' >&2
    exit 1
}
command -v msgcat >/dev/null || {
    echo 'msgcat is required; install gettext.' >&2
    exit 1
}
command -v node >/dev/null || {
    echo 'Node.js is required to reuse existing Spanish UI translations.' >&2
    exit 1
}
command -v rg >/dev/null || {
    echo 'ripgrep is required to discover gettext calls in bundled modules.' >&2
    exit 1
}
command -v msgunfmt >/dev/null || {
    echo 'msgunfmt is required to reuse the bundled Vitals translations.' >&2
    exit 1
}

mkdir -p "$(dirname "$POT_FILE")"
mapfile -d '' -t GETTEXT_SOURCES < <(rg -l -0 -P '\b(?:_|__|N__)\s*\(' "$EXTENSION_DIR" --glob '*.js')
xgettext --language=JavaScript --from-code=UTF-8 \
    --keyword=_ --keyword=T --keyword=__ --keyword=N__:1,2 --keyword=ngettext:1,2 \
    --output="$POT_FILE" \
    "${GETTEXT_SOURCES[@]}" \
    "$EXTENSION_DIR/bluetooth-battery-prefs.js" \
    "$EXTENSION_DIR/hydro-widgets-prefs.js" \
    "$EXTENSION_DIR/vitals-prefs.js" \
    "$EXTENSION_DIR/wallpaper-store-prefs.js"

msgmerge --update --backup=none "$ES_PO" "$POT_FILE"
node "$ROOT_DIR/tools/es-map-to-po.js" "$TMP_DIR/fallback.po" \
    "$EXTENSION_DIR/prefs.js" \
    "$EXTENSION_DIR/vitals-prefs.js" \
    "$EXTENSION_DIR/dynamic-music-pill-prefs.js"
msgunfmt "$EXTENSION_DIR/vitals/locale/es/LC_MESSAGES/vitals.mo" \
    --output-file="$TMP_DIR/vitals.po"
msgcat --use-first "$ES_PO" "$TMP_DIR/fallback.po" \
    "$TMP_DIR/vitals.po" "$EXTENSION_DIR/dash-to-dock/po/es.po" \
    --output="$TMP_DIR/merged.po"
msgmerge --quiet --output-file="$TMP_DIR/current.po" "$TMP_DIR/merged.po" "$POT_FILE"
msgattrib --no-obsolete --output-file="$ES_PO" "$TMP_DIR/current.po"
msgfmt --check --output-file="$ES_MO" "$ES_PO"

printf 'Updated %s and %s\n' "$POT_FILE" "$ES_MO"
