import type { AppBridge } from './preload';

declare global {
  interface Window {
    app: AppBridge;
  }
}

export {};
