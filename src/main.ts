import { app, BrowserWindow, globalShortcut } from 'electron';
import started from 'electron-squirrel-startup';
import { createApplicationMenu } from './main/menu';
import { registerIpc } from './main/ipc';
import { createRecord, deleteRecord, listAllRecordIds, readRecord } from './main/record-store';
import { openRecordWindow } from './main/record-windows';
// === electron-publisher: auto-update import (managed; do not edit) ===
import { updateElectronApp, UpdateSourceType } from 'update-electron-app';
// === /electron-publisher: auto-update import ===

// Handle creating/removing Windows Squirrel shortcuts on install/uninstall.
if (started) {
  app.quit();
}

// Dev-only: enable CDP so agent-browser can connect for visual verification.
if (!app.isPackaged) {
  app.commandLine.appendSwitch('remote-debugging-port', '9333');
}

// === electron-publisher: auto-update wiring (managed; do not edit) ===
if (app.isPackaged) {
  updateElectronApp({
    updateSource: {
      type: UpdateSourceType.ElectronPublicUpdateService,
      repo: 'xxdavidburtonxx/sticky-notes',
    },
    updateInterval: '1 hour',
    logger: console,
  });
}
// === /electron-publisher: auto-update wiring ===

async function bootstrap(): Promise<void> {
  registerIpc();
  createApplicationMenu();

  const ids = await listAllRecordIds();
  if (ids.length === 0) {
    const id = await createRecord();
    openRecordWindow(id, {}, deleteRecord);
  } else {
    for (const id of ids) {
      const rec = await readRecord(id);
      openRecordWindow(id, rec?.bounds ?? {}, deleteRecord);
    }
  }
}

async function newNote(): Promise<void> {
  const id = await createRecord();
  openRecordWindow(id, {}, deleteRecord);
}

app.whenReady().then(() => {
  void bootstrap();

  // System-wide hotkey for spawning a new note. Works even when sticky-notes
  // isn't the focused app — that's the whole point.
  const ok = globalShortcut.register('CommandOrControl+Shift+Z', () => {
    void newNote();
  });
  if (!ok) {
    console.warn('Failed to register CommandOrControl+Shift+Z — another app may have claimed it.');
  }

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await newNote();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
