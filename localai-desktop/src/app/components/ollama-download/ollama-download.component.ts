import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OllamaDownloadService } from '../../services/ollama-download.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'ollama-download',
  standalone: true,
  imports: [CommonModule],
  template: `
    <style>
      .ollama-box { border: 1px solid #ddd; padding: 12px; border-radius: 8px; max-width: 420px; }
      .status { margin-bottom: 8px; }
      .missing { color: #b00; }
      .found { color: #080; }
      .progress-area { margin: 8px 0; }
      .progress-row { display: flex; align-items: center; gap: 8px; }
      .bar { flex: 1; height: 12px; background: #f0f0f0; border-radius: 6px; overflow: hidden; }
      .fill { height: 100%; background: linear-gradient(90deg,#4caf50,#8bc34a); width: 0%; }
      .percent { width: 48px; text-align: right; font-size: 12px; }
      .indeterminate { display:flex; align-items:center; gap:8px; }
      .spinner { width: 16px; height:16px; border-radius:50%; border:2px solid #ddd; border-top-color:#4caf50; animation: spin 1s linear infinite; }
      @keyframes spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }
      .controls { margin-top: 8px; }
      button[disabled] { opacity: 0.6; }
    </style>
    <div class="ollama-box">
      <h3>Ollama</h3>
      <div class="status">
        <span *ngIf="!found" class="missing">Not detected</span>
        <span *ngIf="found" class="found">Detected at {{path}}</span>
      </div>

      <div class="progress-area" *ngIf="progress">
        <div *ngIf="progress.total > 0" class="progress-row">
          <div class="bar">
            <div class="fill" [style.width.%]="percent"></div>
          </div>
          <div class="percent">{{percent}}%</div>
        </div>
        <div *ngIf="progress.total === 0" class="indeterminate">
          <div class="spinner"></div>
          <div>Downloading…</div>
        </div>
      </div>

      <div class="controls">
        <button (click)="start()" [disabled]="downloading">Start Download</button>
      </div>
    </div>
  `
})
export class OllamaDownloadComponent implements OnDestroy {
  found = false as boolean;
  path?: string;
  progress: { received: number; total: number } | null = null;
  percent = 0;
  downloading = false;
  sub: Subscription;

  constructor(private svc: OllamaDownloadService) {
    this.svc.detect().then((r: any) => {
      this.found = !!r.found;
      this.path = r.path;
    });

    this.sub = this.svc.progress$.subscribe(p => {
      this.progress = p;
      if (p) {
        if (p.total && p.total > 0) {
          this.percent = Math.round((p.received / p.total) * 100);
          this.downloading = p.received < p.total;
        } else {
          // total unknown -> indeterminate progress
          this.percent = 0;
          this.downloading = true;
        }

        if (p.total && p.total > 0 && p.received >= p.total) {
          this.downloading = false;
        }
      } else {
        this.percent = 0;
        this.downloading = false;
      }
    });
  }

  start() {
    this.downloading = true;
    this.svc.startDownload();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
