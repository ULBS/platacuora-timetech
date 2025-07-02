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
import { isPlatformBrowser } from '@angular/common';
import { Inject, PLATFORM_ID } from '@angular/core';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    let token = null;
    
    // Only access localStorage if we're in a browser environment
    if (isPlatformBrowser(this.platformId)) {
      // Get the token from different possible locations
      token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      
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
      
      // Debug logging for API calls
      if (request.url.includes('/api/')) {
        console.log('🚀 API Request:', request.method, request.url);
        console.log('🔑 Token found:', !!token);
        console.log('🔐 Actual token:', token ? token.substring(0, 20) + '...' : 'None');
        console.log('📦 Request body:', request.body);
        console.log('🗂️ All localStorage keys:', Object.keys(localStorage));
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
          // Only clear localStorage if we're in a browser environment
          if (isPlatformBrowser(this.platformId)) {
            localStorage.removeItem('currentUser');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('token');
          }
          
          // Redirect to login page
          this.router.navigate(['/login']);
        }
        
        return throwError(() => error);
      })
    );
  }
}
