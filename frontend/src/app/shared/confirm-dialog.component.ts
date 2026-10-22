import { Component, ElementRef, input, output, viewChild } from '@angular/core';

/** Reusable modal built on the native <dialog> element. Call open() to show it. */
@Component({
  selector: 'nx-confirm-dialog',
  template: `
    <dialog #dlg class="dialog" (click)="backdropClick($event)">
      <h2>{{ heading() }}</h2>
      <p class="muted">{{ message() }}</p>
      <div class="dialog-actions">
        <button type="button" class="btn btn-quiet" (click)="close()">Cancel</button>
        <button type="button" class="btn btn-danger" (click)="confirm()">{{ confirmLabel() }}</button>
      </div>
    </dialog>
  `,
})
export class ConfirmDialogComponent {
  readonly heading = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Delete');
  readonly confirmed = output<void>();

  private readonly dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  open(): void {
    this.dlg().nativeElement.showModal();
  }

  close(): void {
    this.dlg().nativeElement.close();
  }

  confirm(): void {
    this.close();
    this.confirmed.emit();
  }

  backdropClick(event: MouseEvent): void {
    if (event.target === this.dlg().nativeElement) {
      this.close();
    }
  }
}
