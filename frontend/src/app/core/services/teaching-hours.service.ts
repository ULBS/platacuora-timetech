
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, forkJoin, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../enviroments/environment';

export interface TeachingHour {
  _id?: string;
  faculty: string;
  department: string;
  academicYear: string;
  semester: number;
  postNumber: number;
  postGrade: 'Prof' | 'Conf' | 'Lect' | 'Asist' | 'Drd';
  disciplineName: string;
  courseHours?: number;
  seminarHours?: number;
  labHours?: number;
  projectHours?: number;
  activityType: 'LR' | 'LE' | 'MR' | 'ME';
  group: string;
  dayOfWeek: 'Luni' | 'Marti' | 'Miercuri' | 'Joi' | 'Vineri' | 'Sambata' | 'Duminica';
  oddEven?: 'Par' | 'Impar' | '';
  isSpecial?: boolean;
  specialWeek?: string;
  totalHours?: number;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class TeachingHoursService {
  private apiUrl = `${environment.apiUrl}/teaching-hours`;
  private hoursSubject = new BehaviorSubject<TeachingHour[]>([]);
  public hours$ = this.hoursSubject.asObservable();

  constructor(private http: HttpClient) {}

  private getAuthOptions() {
    return { withCredentials: true };
  }

  loadHours(params: any = {}): void {
    this.http.get<{ records: TeachingHour[] }>(this.apiUrl, {
      ...this.getAuthOptions(),
      params
    }).pipe(
      tap(response => this.hoursSubject.next(response.records)),
      catchError(error => {
        console.error('Eroare la încărcarea orelor:', error);
        return throwError(() => error);
      })
    ).subscribe();
  }

  addHour(hour: TeachingHour): Observable<TeachingHour> {
    return this.http.post<TeachingHour>(this.apiUrl, hour, this.getAuthOptions()).pipe(
      tap(() => this.loadHours()),
      catchError(error => {
        console.error('Eroare la adăugare:', error);
        return throwError(() => error);
      })
    );
  }

  updateHour(id: string, hour: TeachingHour): Observable<TeachingHour> {
    return this.http.put<TeachingHour>(`${this.apiUrl}/${id}`, hour, this.getAuthOptions()).pipe(
      tap(() => this.loadHours()),
      catchError(error => {
        console.error('Eroare la actualizare:', error);
        return throwError(() => error);
      })
    );
  }

  deleteHour(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, this.getAuthOptions()).pipe(
      tap(() => this.loadHours()),
      catchError(error => {
        console.error('Eroare la ștergere:', error);
        return throwError(() => error);
      })
    );
  }
}
