import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}
  
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.authService.isAuthenticated$.pipe(
      take(1),
      map(isAuthenticated => {
        if (!isAuthenticated) {
          this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
          return false;
        }
        
        // If route requires admin role, check if user is admin
        const requiredRole = route.data['role'] as string;
        if (requiredRole === 'admin' && this.authService.currentUserValue?.role !== 'admin') {
          this.router.navigate(['/']);
          return false;
        }
        
        // If route requires profile completion, check it
        if (route.data['requireProfileCompletion'] && !this.authService.currentUserValue?.profileCompleted) {
          this.router.navigate(['/profile/complete']);
          return false;
        }
        
        return true;
      })
    );
  }
}
