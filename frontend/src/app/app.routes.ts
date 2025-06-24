import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { HoursListComponent } from './pages/hours-list/hours-list.component';
import { CalendarComponent } from './pages/calendar/calendar.component';
import { AuthGuard } from '../core/services/auth.guard';
import { ProfileComponent } from './pages/profile/profile.component';
import { AuthCallbackComponent } from './pages/auth-callback/auth-callback.component';
import { DebugAuthComponent } from './debug-auth.component';
import { DeclarationsListComponent } from './pages/calendar/declarations-list.component';


export const routes: Routes = [
  { path: '', component: HomeComponent, pathMatch: 'full' }, 
  { path: 'login', component: LoginComponent },
  { path: 'auth-callback', component: AuthCallbackComponent },
  { path: 'debug-auth', component: DebugAuthComponent },
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
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'declarations',
    component: DeclarationsListComponent,
    canActivate: [AuthGuard]
  },
 
  { path: '**', redirectTo: '' } 
];