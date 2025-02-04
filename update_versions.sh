#!/bin/bash

# Path to the manifest file
MANIFEST="manifest.json"

# Extract the current version
VERSION=$(grep '"version"' $MANIFEST | sed -E 's/.*"([0-9]+)\.([0-9]+)\.([0-9]+)".*/\1.\2.\3/')

# Split the version into parts
IFS='.' read -r -a VERSION_PARTS <<< "$VERSION"

# Increment the patch version (modify as needed for major or minor version increments)
PATCH_VERSION=$((VERSION_PARTS[2] + 1))

# Form the new version
NEW_VERSION="${VERSION_PARTS[0]}.${VERSION_PARTS[1]}.$PATCH_VERSION"

# Update the manifest file with the new version
# Use sed with -i '' to perform in-place editing without creating a backup file
sed -i '' -E "s/\"version\": \"[0-9]+\.[0-9]+\.[0-9]+\"/\"version\": \"$NEW_VERSION\"/" $MANIFEST

echo "Version updated to $NEW_VERSION"
