import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastHostComponent } from './shared/toast-host.component';

@Component({
  selector: 'nx-root',
  imports: [RouterOutlet, ToastHostComponent],
  template: `
    <router-outlet />
    <nx-toast-host />
  `,
})
export class AppComponent {}
