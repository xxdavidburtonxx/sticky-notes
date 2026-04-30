import { BrowserWindow } from 'electron';
import path from 'node:path';
import { trackWindow } from './windows';
import { registerExternalLinkHandlers } from './external-links';
import { readRecord, updateRecordBounds } from './record-store';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

const recordToWindow = new Map<string, BrowserWindow>();
const windowToRecord = new WeakMap<BrowserWindow, string>();

export type WindowOptions = {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
};

const isMac = process.platform === 'darwin';
// Sticky-note background. Used as the BrowserWindow backgroundColor so the
// pre-load frame is yellow rather than the default white flash.
const STICKY_BG = '#fdf57a';

export function openRecordWindow(
  recordId: string,
  options: WindowOptions = {},
  onClose?: (recordId: string) => void | Promise<void>,
): BrowserWindow {
  const existing = recordToWindow.get(recordId);
  if (existing && !existing.isDestroyed()) {
    existing.focus();
    return existing;
  }

  const win = new BrowserWindow({
    width: options.width ?? 320,
    height: options.height ?? 320,
    x: options.x,
    y: options.y,
    show: false,
    title: 'Sticky Note',
    backgroundColor: STICKY_BG,
    // Hide the OS title bar but keep traffic lights inset on macOS so the whole
    // window can be sticky-yellow. On Win/Linux fall back to the standard frame.
    ...(isMac
      ? {
          titleBarStyle: 'hiddenInset' as const,
          trafficLightPosition: { x: 12, y: 12 },
        }
      : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      additionalArguments: [`--record-id=${recordId}`],
    },
  });

  registerExternalLinkHandlers(win);
  recordToWindow.set(recordId, win);
  windowToRecord.set(win, recordId);
  trackWindow(win);

  // Set the OS-level window title from the record's title (if any) before showing,
  // so window-switcher / mission control display the right thing immediately.
  void readRecord(recordId).then((rec) => {
    if (!rec || win.isDestroyed()) return;
    const t = rec.title.trim();
    if (t.length > 0) win.setTitle(t);
  });

  // Pass the record-id through the URL so the renderer knows which record it owns.
  const query = `?recordId=${encodeURIComponent(recordId)}`;
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void win.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}${query}`);
  } else {
    void win.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      { search: query.slice(1) },
    );
  }

  win.once('ready-to-show', () => win.show());

  // Persist x/y/width/height on every move/resize so notes return to the same
  // position across restarts. Debounced because `move` fires per-pixel during
  // a drag on Win/Linux.
  let saveTimer: NodeJS.Timeout | null = null;
  const persistBounds = () => {
    if (win.isDestroyed()) return;
    const [x, y] = win.getPosition();
    const [width, height] = win.getSize();
    void updateRecordBounds(recordId, { x, y, width, height });
  };
  const scheduleSave = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(persistBounds, 200);
  };
  win.on('move', scheduleSave);
  win.on('resize', scheduleSave);

  win.on('close', () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    // No final flush: on user-initiated close, onClose deletes the record.
    // Normal moves/resizes have already been persisted by the debounce timer.
    if (onClose) void onClose(recordId);
    recordToWindow.delete(recordId);
  });

  return win;
}

export function getRecordForWebContents(webContents: Electron.WebContents): string | undefined {
  const win = BrowserWindow.fromWebContents(webContents);
  return win ? windowToRecord.get(win) : undefined;
}

export function listOpenRecordIds(): string[] {
  return [...recordToWindow.keys()];
}
