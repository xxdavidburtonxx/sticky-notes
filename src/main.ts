import { app, BrowserWindow } from 'electron';
import started from 'electron-squirrel-startup';
import { createApplicationMenu } from './main/menu';
import { registerIpc } from './main/ipc';
import { createRecord, deleteRecord, listAllRecordIds } from './main/record-store';
import { openRecordWindow } from './main/record-windows';

// Handle creating/removing Windows Squirrel shortcuts on install/uninstall.
if (started) {
  app.quit();
}

// Dev-only: enable CDP so agent-browser can connect for visual verification.
if (!app.isPackaged) {
  app.commandLine.appendSwitch('remote-debugging-port', '9333');
}

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
