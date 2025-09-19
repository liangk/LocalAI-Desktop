import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class OllamaDownloadService {
  private progressSub = new BehaviorSubject<{ received: number; total: number } | null>(null);
  progress$: Observable<{ received: number; total: number } | null> = this.progressSub.asObservable();

  constructor(private zone: NgZone) {
    // Listen for progress events from main
    // @ts-ignore
    if (window.electron?.on) {
      // use zone.run to update Angular change detection
      window.electron.on('ollama-download-progress', (evt: any, data: any) => {
        this.zone.run(() => {
          this.progressSub.next(data);
        });
      });

      window.electron.on('ollama-download-complete', (evt: any, data: any) => {
        this.zone.run(() => {
          this.progressSub.next({ received: data?.size ?? 0, total: data?.size ?? 0 });
        });
      });
    }
  }

  detect() {
    // @ts-ignore
    return window.electron?.detectOllama?.() ?? Promise.resolve({ found: false });
  }

  startDownload() {
    // @ts-ignore
    return window.electron?.invoke?.('ollama-start-download') ?? Promise.resolve(null);
  }
}
