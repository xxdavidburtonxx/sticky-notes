import { ipcMain, dialog, shell, clipboard, BrowserWindow } from 'electron';
import { readRecord, updateRecord } from './record-store';
import { getRecordForWebContents } from './record-windows';

export function registerIpc(): void {
  ipcMain.handle('app:openExternal', async (_event, url: unknown) => {
    if (typeof url !== 'string') throw new Error('url must be a string');
    await shell.openExternal(url);
  });

  ipcMain.handle('app:showOpenDialog', (_event, options: Electron.OpenDialogOptions) =>
    dialog.showOpenDialog(options),
  );

  ipcMain.handle('app:showSaveDialog', (_event, options: Electron.SaveDialogOptions) =>
    dialog.showSaveDialog(options),
  );

  ipcMain.handle('app:clipboard.readText', () => clipboard.readText());

  ipcMain.handle('app:clipboard.writeText', (_event, text: unknown) => {
    if (typeof text !== 'string') throw new Error('text must be a string');
    clipboard.writeText(text);
  });

  // Per-record handlers — the record id comes from the calling webContents,
  // never from the renderer (that's the path-traversal guard).
  ipcMain.handle('record:read', (event) => {
    const id = getRecordForWebContents(event.sender);
    if (!id) throw new Error('window has no bound record');
    return readRecord(id);
  });

  ipcMain.handle('record:update', (event, partial: unknown) => {
    const id = getRecordForWebContents(event.sender);
    if (!id) throw new Error('window has no bound record');
    if (typeof partial !== 'object' || partial === null) {
      throw new Error('partial must be an object');
    }
    const p = partial as { title?: unknown; body?: unknown };
    const next: { title?: string; body?: string } = {};
    if (p.title !== undefined) {
      if (typeof p.title !== 'string') throw new Error('title must be a string');
      next.title = p.title;
    }
    if (p.body !== undefined) {
      if (typeof p.body !== 'string') throw new Error('body must be a string');
      next.body = p.body;
    }
    // Mirror title to the OS-level window title so it shows in window-switcher,
    // mission control, dock menu, etc.
    if (next.title !== undefined) {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win) {
        const t = next.title.trim();
        win.setTitle(t.length > 0 ? t : 'Sticky Note');
      }
    }
    return updateRecord(id, next);
  });
}
