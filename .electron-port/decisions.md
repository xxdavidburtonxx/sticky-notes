# Decisions

Source: (none — greenfield)
Target: /tmp/sticky-notes-electron
Generated: 2026-04-25T00:00:00Z

## From electron-architecture
mode: greenfield
window-model: multi-window
source-binding: none
runtime: n/a
persistence: files-on-disk
record-shape: uuid-records
ipc-namespace: record:read/write (per-window, sender-bound) + menu-driven createRecord+openRecordWindow + close-deletes-record
behavior-summary: |
  1. On launch, scan userData/records/. If empty, create one empty record + open window. Otherwise open one window per record.
  2. Cmd+N (File > New Note) creates a new note window with an empty record.
  3. Typing in a note auto-saves debounced (400ms) via window.app.records.write(body).
  4. Closing a note window deletes its record file (Stickies semantics).
  5. macOS keeps app running after last window closes; Win/Linux quit on last-closed.

## From electron-platform-integration
platform-target: macos-and-windows
native-modules: none
file-association: none
deep-link-protocol: none
tray: none
global-shortcuts: none
preferences-shortcut: none

## From electron-delivery
csp: none-set
fuses: default
distribution: direct-download
auto-update: none
signing-macos: deferred
signing-windows: deferred

## UI seed
ui-seed: from-spec
ui-seed-rationale: greenfield with a Behavior section; sticky-notes per-record-window shape

## Recipes to apply
source-binding: none
capabilities: multi-window-manager, record-store, menu-actions
