import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private router: Router) {}  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Get the token from different possible locations
    let token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    
    // Fallback: try to get token from currentUser object
    if (!token) {
      const currentUserString = localStorage.getItem('currentUser');
      if (currentUserString) {
        try {
          const currentUser = JSON.parse(currentUserString);
          token = currentUser.token;
        } catch (e) {
          // Ignore parsing errors
        }
      }
    }
    
    // Clone the request and add the token if it exists
    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
    
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Handle 401 Unauthorized errors (token expired or invalid)
        if (error.status === 401) {
          // Clear localStorage
          localStorage.removeItem('currentUser');
          
          // Redirect to login page
          this.router.navigate(['/login']);
        }
        
        return throwError(() => error);
      })
    );
  }
}
