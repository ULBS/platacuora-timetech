import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  token?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;
  
  // User de test pentru simulare
  private mockUser: User = {
    id: 1,
    name: 'Test User',
    email: 'test@ulbsibiu.com',
    role: 'user',
    token: 'mock-jwt-token-12345'
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
  }

  
  loginWithGoogle(): Observable<User> {
   // se retuneaza datele utiliztorului de test in application/local storage
    const googleUser: User = {
      id: 2,
      name: 'Google User',
      email: 'google@ulbsibiu.com',
      role: 'user',
      token: 'mock-google-jwt-token-67890'
    };
    
    localStorage.setItem('currentUser', JSON.stringify(googleUser));
    this.currentUserSubject.next(googleUser);
    return of(googleUser);
    
    // În implementarea reală, ar trebui să integrăm Google OAuth:
    // 1. Inițierea procesului OAuth
    // 2. Gestionarea callback-ului
    // 3. Trimiterea token-ului către backend
    // 4. Primirea unui JWT valid de la backend
  }

  logout(): void {
    localStorage.removeItem('currentUser');
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