import { BrowserWindow, shell } from 'electron';
import { URL } from 'node:url';

function isExternal(url: string, devOrigin: string | null): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'file:') return false;
    if (devOrigin && parsed.origin === devOrigin) return false;
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function registerExternalLinkHandlers(win: BrowserWindow): void {
  const devUrl = process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL ?? null;
  const devOrigin = devUrl ? new URL(devUrl).origin : null;

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternal(url, devOrigin)) {
      void shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (isExternal(url, devOrigin)) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });
}
