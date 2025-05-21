import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  submitted = false;
  invalidDomain = false;
  loading = false;
  error = '';
  returnUrl: string = '/';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {

    if (this.authService.currentUserValue) {
      this.router.navigate(['/']);
    }
  }

  ngOnInit() {
    this.loginForm = this.formBuilder.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }

  get f() { return this.loginForm.controls; }

  onSubmit() {
    this.submitted = true;
    this.error = '';
    
    if (this.loginForm.invalid) {
      return;
    }
    
    const email = this.loginForm.value.email;
    if (!email.endsWith('@ulbsibiu.com')) {
      this.invalidDomain = true;
      return;
    }
    
    this.invalidDomain = false;
    this.loading = true;
    
    this.authService.login(email, this.loginForm.value.password)
      .subscribe({
        next: () => {
          this.router.navigate([this.returnUrl]);
        },
        error: (error) => {
          this.error = error.message || 'Autentificare eșuată';
          this.loading = false;
        }
      });
  }  loginWithGoogle(event?: Event) {
    if (event) {
      event.preventDefault();
    }
    
    this.loading = true;
    this.error = '';
    
    console.log('Login with Google clicked - attempting redirect to Google auth');
    
    try {
      // Log the auth URL for debugging
      const authUrl = this.authService.getGoogleAuthUrl();
      console.log('Auth URL:', authUrl);
      
      // Show message to user
      this.error = 'Redirecting to Google authentication...';
      
      // Use the auth service to redirect
      setTimeout(() => {
        this.authService.loginWithGoogle();
      }, 500); // Small delay to show the message to the user
    } catch (error) {
      console.error('Error initiating Google login:', error);
      this.loading = false;
      this.error = 'Could not initiate Google login. Please try again.';
    }
  }
}