import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../enviroments/environment';

export interface User {
  id: number | string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: string;
  token?: string;
  googleId?: string;
  profilePicture?: string;
}

// Interfață extinsă pentru User cu câmpurile formularului
export interface ExtendedUser extends User {
  tip?: string;
  declarant?: string;
  directorDepartament?: string;
  decan?: string;
  universitate?: string;
  facultate?: string;
  departament?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;
  
  // User de test pentru simulare
  private mockUser: ExtendedUser = {
    id: 1,
    name: 'Test User',
    email: 'test@ulbsibiu.com',
    role: 'user',
    token: 'mock-jwt-token-12345',
    tip: '',
    declarant: '',
    directorDepartament: '',
    decan: '',
    universitate: '',
    facultate: '',
    departament: ''
    
  };

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ){
    let storedUser = null;

    if(isPlatformBrowser(this.platformId)) {
      storedUser = localStorage.getItem('currentUser');
     
    }

    this.currentUserSubject = new BehaviorSubject<User | null>(storedUser ? JSON.parse(storedUser) : null);
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  login(email: string, password: string): Observable<User> {
    // Simulăm autentificarea (în mod normal, ar fi un request către backend)
    if (email === this.mockUser.email && password === 'password123') {
      localStorage.setItem('currentUser', JSON.stringify(this.mockUser));
      this.currentUserSubject.next(this.mockUser);
      return of(this.mockUser);
    } else {
      return throwError(() => new Error('Email sau parolă incorectă'));
    }

    // În implementarea reală, facem un request către backend:
    // return this.http.post<User>('api/auth/login', { email, password })
    //   .pipe(
    //     map(user => {
    //       localStorage.setItem('currentUser', JSON.stringify(user));
    //       this.currentUserSubject.next(user);
    //       return user;
    //     })
    //   );
  }    getGoogleAuthUrl(): string {
      // Return the full URL for Google authentication
      return `${environment.authUrl}/google`;
    }
      loginWithGoogle(): void {
      // Store the current URL as the return URL after authentication
      if(isPlatformBrowser(this.platformId)) {
        localStorage.setItem('returnUrl', this.router.url || '/');
        
        // Log the redirection attempt
        const authUrl = this.getGoogleAuthUrl();
        console.log('Redirecting to Google auth endpoint:', authUrl);
        
        try {
          // Force a full page redirect to the Google auth endpoint
          // This should take the user to the Google login page
          // unless they're already logged in to Google
          window.location.assign(authUrl);
          console.log('Redirect initiated');
        } catch (error) {
          console.error('Error redirecting to Google auth:', error);
        }
      } else {
        console.error('Cannot redirect to Google authentication from server-side rendering');
      }
    }
  /**
   * Handle the authentication callback from Google OAuth
   * @param token JWT token received from the backend
   */  handleAuthCallback(token: string): Observable<User> {
    return this.http.post<User>(`${environment.authUrl}/verify`, { token })
      .pipe(
        map(user => {
          // Store user details and JWT token in local storage
          const userData = {
            id: user.id,
            name: user.name || (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : `${user.email.split('@')[0]}`),
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            token: token,
            profilePicture: user.profilePicture
          };
          
          // Only use localStorage in browser environment
          if(isPlatformBrowser(this.platformId)) {
            localStorage.setItem('currentUser', JSON.stringify(userData));
          }
          
          this.currentUserSubject.next(userData);
          return userData;
        }),
        catchError(error => {
          console.error('Authentication callback error:', error);
          return throwError(() => new Error('Verificarea token-ului a eșuat'));
        })
      );
  }
  logout(): void {
    if(isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('currentUser');
    }
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return !!this.currentUserValue;
  }

  isTokenValid(): boolean {
    const user = this.currentUserValue;
    if (!user || !user.token) {
      return false;
    }
    
    // În implementarea reală, am verifica expirarea token-ului
    // Analizând payload-ul JWT (partea a doua a token-ului)
    
    // Pentru simulare consideram token-ul valid
    return true;
  }

  refreshToken(): Observable<User> {
    // În implementarea reală, am face un request către backend
    // pentru a reînnoi token-ul JWT

    // Pentru simulare returnam același utilizator
    return of(this.currentUserValue as User);
  }
}