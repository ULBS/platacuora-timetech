import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../core/services/api.service';

@Component({
  selector: 'app-test',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './test.component.html',
  styleUrl: './test.component.scss'
})
export class TestComponent implements OnInit {
  message: string = '';
  error: string = '';
  isLoading: boolean = false;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.testBackendConnection();
  }

  testBackendConnection(): void {
    this.isLoading = true;
    this.apiService.get<{message: string}>('test').subscribe({
      next: (response) => {
        this.message = response.message;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = `Failed to connect to backend: ${err.message || 'Unknown error'}`;
        this.isLoading = false;
      }
    });
  }
}
