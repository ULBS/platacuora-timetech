import { Component, OnInit } from '@angular/core';
import { AuthService, User, ExtendedUser } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  user: ExtendedUser | null = null;
  tipuri: string[] = ['titular', 'asociat'];

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      this.user = JSON.parse(savedUser);
    } else {
      this.authService.currentUser.subscribe(user => {
        if (user) {
          this.user = {
            ...user,
            tip: '',
            declarant: '',
            directorDepartament: '',
            decan: '',
            universitate: '',
            facultate: '',
            departament: ''
          };
        }
      });
    }
  }

  saveProfile(): void {
    if (this.user) {
      localStorage.setItem('user', JSON.stringify(this.user));
      alert('Profil salvat cu succes!');
    }
  }
}