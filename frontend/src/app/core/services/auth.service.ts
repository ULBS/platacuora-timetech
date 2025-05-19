import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../enviroments/environment';

export interface User {
  _id: string;
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  role: 'user' | 'admin';
  position: string;
  faculty?: string;
  department?: string;
  profileCompleted: boolean;
  lastLogin: Date;
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  
  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.currentUser$.pipe(map(user => !!user));
  public isAdmin$ = this.currentUser$.pipe(map(user => user?.role === 'admin'));

  constructor(private http: HttpClient, private router: Router) {
    this.loadUserFromStorage();
  }

  /**
   * Load user from local storage on service initialization
   */
  private loadUserFromStorage(): void {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        this.currentUserSubject.next(user);
        this.verifyToken(); // Verify token is still valid
      } catch (error) {
        localStorage.removeItem('currentUser');
      }
    }
  }

  /**
   * Get current authenticated user from the server
   */
  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/me`).pipe(
      tap(user => {
        this.currentUserSubject.next(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
      }),
      catchError(error => {
        this.logout();
        return throwError(() => error);
      })
    );
  }

  /**
   * Verify if the current JWT token is valid
   */
  verifyToken(): Observable<boolean> {
    return this.http.post<{isValid: boolean}>(`${this.apiUrl}/verify`, {}).pipe(
      map(response => response.isValid),
      catchError(() => {
        this.logout(false);
        return throwError(() => new Error('Token invalid'));
      })
    );
  }

  /**
   * Get Google login URL
   */
  getGoogleLoginUrl(): string {
    return `${environment.apiUrl}/auth/google`;
  }

  /**
   * Handle authentication after Google callback
   * @param token JWT token received from Google callback
   */
  handleAuthentication(token: string): Observable<User> {
    // Store token in localStorage (the server already set the HTTP-only cookie)
    localStorage.setItem('auth_token', token);
    
    // Get current user information
    return this.getCurrentUser();
  }

  /**
   * Update user profile information
   */
  updateProfile(profileData: {
    faculty?: string;
    department?: string;
    position: string;
  }): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/profile`, profileData).pipe(
      tap(user => {
        this.currentUserSubject.next(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
      })
    );
  }

  /**
   * Logout the current user
   */
  logout(navigateToLogin = true): void {
    // Call logout endpoint to clear HTTP-only cookies
    this.http.post(`${this.apiUrl}/logout`, {}).subscribe();
    
    // Clear local storage
    localStorage.removeItem('currentUser');
    localStorage.removeItem('auth_token');
    
    // Clear current user
    this.currentUserSubject.next(null);
    
    // Navigate to login page
    if (navigateToLogin) {
      this.router.navigate(['/login']);
    }
  }

  /**
   * Get current user value without subscribing
   */
  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }
}
