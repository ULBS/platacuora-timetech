import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { HoursListComponent } from './pages/hours-list/hours-list.component';
import { CalendarComponent } from './pages/calendar/calendar.component';
import { AuthGuard } from '../core/services/auth.guard';


export const routes: Routes = [
  { path: '', component: HomeComponent, pathMatch: 'full' }, 
  { path: 'login', component: LoginComponent },
  { 
    path: 'hours-list', 
    component: HoursListComponent,
    canActivate: [AuthGuard] 
  },
  { 
    path: 'calendar', 
    component: CalendarComponent,
    canActivate: [AuthGuard]  
  },
  { path: '**', redirectTo: '' } 
];