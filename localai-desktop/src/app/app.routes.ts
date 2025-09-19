import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', component: DashboardPage },
  { path: '**', redirectTo: '' }

];
