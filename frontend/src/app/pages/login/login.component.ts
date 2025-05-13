import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

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

  constructor(
    private formBuilder: FormBuilder,
    private router: Router
  ) {}

  ngOnInit() {
    this.loginForm = this.formBuilder.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  // Getter pentru acces mai ușor la câmpurile formularului
  get f() { return this.loginForm.controls; }

  onSubmit() {
    this.submitted = true;
    
    // Verifică dacă formularul este valid
    if (this.loginForm.invalid) {
      return;
    }
    
    // Verifică dacă email-ul are domeniul @ulbsibiu.com
    const email = this.loginForm.value.email;
    if (!email.endsWith('@ulbsibiu.ro')) {
      this.invalidDomain = true;
      return;
    }
    
    this.invalidDomain = false;
    
    // TODO: Implementează logica de autentificare
    console.log('Formularul a fost trimis:', this.loginForm.value);
    
    // Redirecționare după autentificare cu succes
    // this.router.navigate(['/']);
  }
}