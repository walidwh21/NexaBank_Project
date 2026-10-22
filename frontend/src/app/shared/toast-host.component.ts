import { Component, inject } from '@angular/core';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'nx-toast-host',
  template: `
    <div class="toast-stack" aria-live="polite">
      @for (t of toasts.toasts(); track t.id) {
        <div class="toast" [class.toast-error]="t.tone === 'error'" role="status">
          <i class="bi" [class.bi-check-circle-fill]="t.tone === 'success'" [class.bi-exclamation-octagon-fill]="t.tone === 'error'"></i>
          <span>{{ t.text }}</span>
          <button type="button" class="icon-btn" aria-label="Dismiss" (click)="toasts.dismiss(t.id)">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastHostComponent {
  readonly toasts = inject(ToastService);
}
