import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../enviroments/environment';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-debug-auth',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding: 20px; max-width: 800px; margin: 0 auto;">
      <h1>Authentication Debug</h1>
      
      <div style="margin-bottom: 20px;">
        <h2>Environment Settings</h2>
        <pre>{{ environmentDetails }}</pre>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h2>Google Auth URL</h2>
        <p><code>{{ googleAuthUrl }}</code></p>
        <button (click)="openLink(googleAuthUrl)">Test Direct Link</button>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h2>Test Authentication</h2>
        <button (click)="testGoogleAuth()">Test Google Auth Redirect</button>
      </div>
    </div>
  `
})
export class DebugAuthComponent implements OnInit {
  environmentDetails = '';
  googleAuthUrl = '';
  
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}
  
  ngOnInit(): void {
    this.environmentDetails = JSON.stringify(environment, null, 2);
    this.googleAuthUrl = `${environment.authUrl}/google`;
  }
  
  openLink(url: string): void {
    if (isPlatformBrowser(this.platformId)) {
      window.open(url, '_blank');
    }
  }
  
  testGoogleAuth(): void {
    if (isPlatformBrowser(this.platformId)) {
      console.log('Testing Google Auth redirect to:', this.googleAuthUrl);
      window.location.href = this.googleAuthUrl;
    }
  }
}
