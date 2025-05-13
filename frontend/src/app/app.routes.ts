import { Routes } from '@angular/router';
import { TestComponent } from './test/test.component';
import { LoginComponent } from './pages/login/login.component';
import { HoursListComponent } from './pages/hours-list/hours-list.component';
import { CalendarComponent } from './pages/calendar/calendar.component';
import { HomeComponent } from './pages/home/home.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'hours-list', component: HoursListComponent },
  { path: 'calendar', component: CalendarComponent },
  { path: '**', redirectTo: '' }  
];
