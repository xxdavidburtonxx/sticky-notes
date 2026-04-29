import { app, BrowserWindow } from 'electron';
import started from 'electron-squirrel-startup';
import { createApplicationMenu } from './main/menu';
import { registerIpc } from './main/ipc';
import { createRecord, deleteRecord, listAllRecordIds } from './main/record-store';
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
      openRecordWindow(id, {}, deleteRecord);
    }
  }
}

app.whenReady().then(() => {
  void bootstrap();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const id = await createRecord();
      openRecordWindow(id, {}, deleteRecord);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
