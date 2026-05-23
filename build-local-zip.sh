#!/bin/bash
# Script to package the GNOME Extension for LOCAL TESTING
# It includes gschemas.compiled so it works immediately in a VM.

EXT_NAME="bar-enhanced@mrvanguardia"
ZIP_NAME="${EXT_NAME}-local.zip"

echo "Compiling schemas first just in case..."
glib-compile-schemas "$EXT_NAME/schemas/"

echo "Packing local extension into $ZIP_NAME..."

cd "$EXT_NAME" || exit

# Create the zip file including gschemas.compiled
zip -rq "../$ZIP_NAME" . \
    -x "*.po" \
    -x "*.pot" \
    -x "*/po/*" \
    -x "*POTFILES.in" \
    -x "*.md" \
    -x "LICENSE" \
    -x "*.sh" \
    -x "*.git*"

cd ..

echo "Done! Use $ZIP_NAME for testing on your virtual machine."
