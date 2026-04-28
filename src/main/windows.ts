import { BrowserWindow } from 'electron';

const windows = new Set<BrowserWindow>();

export function trackWindow(win: BrowserWindow): void {
  windows.add(win);
  win.on('closed', () => windows.delete(win));
}

export function getWindows(): ReadonlySet<BrowserWindow> {
  return windows;
}
