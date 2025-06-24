import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';


@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnInit, OnDestroy {
  isAuthenticated = false;
  private authSubscription!: Subscription;

  constructor(private authService: AuthService) {}

  ngOnInit() {

    this.authSubscription = this.authService.currentUser.subscribe(user => {
      this.isAuthenticated = !!user;
    });
  }

  logout(event: Event) {
    event.preventDefault();
    this.authService.logout();
  }

  closeNav() {
    const navToggle = document.getElementById('nav-toggle') as HTMLInputElement;
    if (navToggle && navToggle.checked) {
      navToggle.checked = false;
    }
  }

  ngOnDestroy() {
    
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }
}