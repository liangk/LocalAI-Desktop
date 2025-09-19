import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SideNav } from './components/side-nav/side-nav';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SideNav],
  styleUrl: './app.scss',
  template: `
    <side-nav></side-nav>
    <main class="main_content">
      <router-outlet></router-outlet>
    </main>
  `
})
export class App {
  protected readonly title = signal('localAI Desktop');
}
