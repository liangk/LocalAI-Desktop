import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class OllamaService {
  async detect(): Promise<{ found: boolean; path?: string; version?: string; error?: string }> {
    // use window.electronAPI if you have preload; otherwise use ipcRenderer directly if allowed
    // example with contextBridge exposing 'ipc' channel:
    // return window.electronAPI.invoke('ollama-detect');
    // fallback:
    // @ts-ignore
    return (window as any).ipcRenderer?.invoke('ollama-detect');
  }
}
