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
    // Get the current user from localStorage
    const currentUserString = localStorage.getItem('currentUser');
    let token = null;
    
    if (currentUserString) {
      // Parse the stored user and get the token
      const currentUser = JSON.parse(currentUserString);
      token = currentUser.token;
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
