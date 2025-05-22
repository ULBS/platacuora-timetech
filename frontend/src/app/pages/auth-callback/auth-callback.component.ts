import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="callback-container">
      <div *ngIf="loading" class="loading">
        <p>Procesăm autentificarea dvs...</p>
        <div class="spinner"></div>
      </div>
      <div *ngIf="error" class="error">
        <p>{{ error }}</p>
        <button (click)="redirectToLogin()">Înapoi la login</button>
      </div>
    </div>
  `,
  styles: [`
    .callback-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      text-align: center;
    }
    .loading, .error {
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      background-color: white;
    }
    .error {
      color: #721c24;
      background-color: #f8d7da;
      border: 1px solid #f5c6cb;
    }
    .spinner {
      display: inline-block;
      width: 30px;
      height: 30px;
      border: 3px solid rgba(0, 0, 0, 0.1);
      border-radius: 50%;
      border-top-color: #007bff;
      animation: spin 1s ease-in-out infinite;
      margin-top: 10px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    button {
      margin-top: 15px;
      padding: 8px 16px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    button:hover {
      background-color: #0056b3;
    }
  `]
})
export class AuthCallbackComponent implements OnInit {
  loading = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ){ }  ngOnInit(): void {
    console.log('Auth callback component initialized');
    console.log('URL params:', this.route.snapshot.queryParams);
    
    // Get token from URL parameters
    const token = this.route.snapshot.queryParamMap.get('token');
    console.log('Token from URL:', token ? 'Present (hidden for security)' : 'Not present');
    
    if (token) {
      console.log('Attempting to verify token with backend');
      // Handle successful authentication
      this.authService.handleAuthCallback(token).subscribe({
        next: (userData) => {
          console.log('Authentication successful, user data received:', userData);
          
          let returnUrl = '/';
          // Only access localStorage in the browser
          if (isPlatformBrowser(this.platformId)) {
            // Using try/catch to handle any localStorage-related issues
            try {
              console.log('Accessing localStorage in browser environment');
              const storedUser = localStorage.getItem('currentUser');
              console.log('localStorage currentUser set:', !!storedUser);
              returnUrl = localStorage.getItem('returnUrl') || '/';
              localStorage.removeItem('returnUrl'); // Clear stored return URL
            } catch (error) {
              console.error('Error accessing localStorage:', error);
              // Fallback to default return URL
              returnUrl = '/';
            }
          }
          
          console.log('Redirecting to:', returnUrl);
          this.router.navigateByUrl(returnUrl);
        },
        error: (err) => {
          console.error('Authentication error:', err);
          this.loading = false;
          this.error = 'Eroare la procesarea autentificării: ' + (err.message || 'Eroare necunoscută');
        }
      });
    } else {
      // Check for error in URL parameters
      const errorParam = this.route.snapshot.queryParamMap.get('error');
      if (errorParam) {
        this.loading = false;
        
        // Handle different error types
        switch (errorParam) {
          case 'authentication_failed':
            this.error = 'Autentificarea a eșuat.';
            break;
          case 'invalid_domain':
            const domain = this.route.snapshot.queryParamMap.get('domain');
            this.error = `Domeniul ${domain || 'utilizat'} nu este permis. Folosiți doar conturi @ulbsibiu.ro sau @gmail.com.`;
            break;
          case 'no_email':
            this.error = 'Nu am putut obține adresa de email de la Google.';
            break;
          case 'server_error':
            const message = this.route.snapshot.queryParamMap.get('message');
            this.error = `Eroare de server: ${message || 'Eroare necunoscută'}`;
            break;
          default:
            this.error = 'Eroare necunoscută la procesarea autentificării.';
        }
      } else {
        this.loading = false;
        this.error = 'Lipsesc parametrii necesari pentru autentificare.';
      }
    }
  }
  redirectToLogin(): void {
    // Clear any auth-related localStorage items before redirecting
    if (isPlatformBrowser(this.platformId)) {
      try {
        // Only attempt to clear returnUrl if in browser context
        localStorage.removeItem('returnUrl');
      } catch (error) {
        console.error('Error clearing localStorage:', error);
      }
    }
    this.router.navigate(['/login']);
  }
}
