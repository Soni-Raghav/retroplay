#!/bin/bash
# Sync web app (public/) into Android assets before building
set -e
SRC=/home/z/my-project/public
DST=/home/z/my-project/retroplay/android/app/src/main/assets
rm -rf "$DST"
mkdir -p "$DST"
cp -r "$SRC"/. "$DST"/
rm -f "$DST"/*.apk 2>/dev/null || true
echo "Assets synced: $(du -sh "$DST" | cut -f1)"
