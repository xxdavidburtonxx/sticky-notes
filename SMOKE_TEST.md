# Sticky Notes — smoke test

The minimal repeatable check that the spec'd behavior is wired in.

## What it tests

Behavior 1 from the architecture memo's Behavior section:

> On launch, scan `userData/records/`. If empty, create one empty record + open window. Otherwise open one window per existing record.

The test pre-seeds a record file, launches the app, and confirms:

1. The app picked up the existing record (didn't seed a fresh empty one).
2. The window for the seeded record actually opened (a renderer subprocess exists with the matching `--record-id=<uuid>` argument).
3. The seed file content is preserved (the renderer's "skip initial save" debounce works).

## How to run

```bash
USER_DATA="$HOME/Library/Application Support/Sticky Notes"
rm -rf "$USER_DATA"
mkdir -p "$USER_DATA/records"
SEED_ID=$(uuidgen | tr 'A-Z' 'a-z')
cat > "$USER_DATA/records/$SEED_ID.json" <<EOF
{"id":"$SEED_ID","body":"smoke-seed-body","createdAt":1700000000000,"updatedAt":1700000000000}
EOF

cd /tmp/sticky-notes-electron
rm -rf .vite
nohup bash -c 'exec yes "" | npm start' > /tmp/electron-implement-start.log 2>&1 &
disown

# Poll for the bundles
SECONDS=0
until { [ -f .vite/build/main.js ] && [ -f .vite/build/preload.js ]; } || [ $SECONDS -gt 60 ]; do
  sleep 2
done

# Wait for the window to actually open
sleep 5

# CHECK 1: bundles exist
test -f .vite/build/main.js && test -f .vite/build/preload.js && echo "PASS bundles" || echo "FAIL bundles"

# CHECK 2: electron process is alive
pgrep -f "/tmp/sticky-notes-electron/node_modules/electron" > /dev/null && echo "PASS electron alive" || echo "FAIL electron"

# CHECK 3: the seeded record's window opened
pgrep -f "record-id=$SEED_ID" > /dev/null && echo "PASS seeded window opened" || echo "FAIL seed window"

# CHECK 4: the seeded record file content is preserved
grep -q "smoke-seed-body" "$USER_DATA/records/$SEED_ID.json" && echo "PASS body preserved" || echo "FAIL body"

# Tear down
pkill -f "/tmp/sticky-notes-electron/node_modules/electron" || true
pkill -f "electron-forge" || true
```

## Manual smoke (after automated checks)

1. Launch app — one yellow textarea window appears (or N windows, one per existing record).
2. Type — wait 0.5s — open the JSON file at `$USER_DATA/records/<uuid>.json` and verify body matches.
3. Press `Cmd+N` — a new yellow window appears.
4. Close one window — verify its JSON file is gone from the records dir.
5. Quit and relaunch — surviving notes are restored, deleted ones don't come back.
