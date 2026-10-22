import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  tone: 'success' | 'error';
  text: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  readonly toasts = signal<Toast[]>([]);

  success(text: string): void {
    this.push('success', text);
  }

  error(text: string): void {
    this.push('error', text);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  private push(tone: Toast['tone'], text: string): void {
    const id = this.nextId++;
    this.toasts.update((list) => [...list, { id, tone, text }]);
    setTimeout(() => this.dismiss(id), tone === 'error' ? 6000 : 3500);
  }
}
