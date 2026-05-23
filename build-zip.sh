#!/bin/bash
# Script to package the GNOME Extension for EGO (extensions.gnome.org)
# It excludes unnecessary build artifacts and source files.

EXT_NAME="bar-enhanced@mrvanguardia"
ZIP_NAME="${EXT_NAME}.zip"

echo "Packing extension into $ZIP_NAME..."

cd "$EXT_NAME" || exit

# Create the zip file excluding the specified files and directories
zip -rq "../$ZIP_NAME" . \
    -x "*.po" \
    -x "*.pot" \
    -x "schemas/gschemas.compiled" \
    -x "*.md" \
    -x "LICENSE" \
    -x "*.sh" \
    -x "*.git*"

cd ..

echo "Done! You can upload $ZIP_NAME to extensions.gnome.org."
