import { contextBridge, ipcRenderer } from 'electron';

// Read the record id from the URL query string. Window was created with
// `?recordId=<uuid>` by record-windows.ts. Renderer never has to ask main "who am I."
const params = new URLSearchParams(globalThis.location?.search ?? '');
const recordId = params.get('recordId');

export type StoredRecord = {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
};

const bridge = {
  recordId, // null if not a record window

  records: {
    read: (): Promise<StoredRecord | null> => ipcRenderer.invoke('record:read'),
    update: (partial: { title?: string; body?: string }): Promise<void> =>
      ipcRenderer.invoke('record:update', partial),
  },

  openExternal: (url: string): Promise<void> =>
    ipcRenderer.invoke('app:openExternal', url),
  showOpenDialog: (options: Electron.OpenDialogOptions): Promise<Electron.OpenDialogReturnValue> =>
    ipcRenderer.invoke('app:showOpenDialog', options),
  showSaveDialog: (options: Electron.SaveDialogOptions): Promise<Electron.SaveDialogReturnValue> =>
    ipcRenderer.invoke('app:showSaveDialog', options),
  clipboard: {
    readText: (): Promise<string> => ipcRenderer.invoke('app:clipboard.readText'),
    writeText: (text: string): Promise<void> =>
      ipcRenderer.invoke('app:clipboard.writeText', text),
  },
} as const;

export type AppBridge = typeof bridge;

contextBridge.exposeInMainWorld('app', bridge);
