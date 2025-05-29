import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface Holiday {
  name: string;
  date: HolidayDate[];
}

export interface HolidayDate {
  date: string;  
  weekday: string;
}

export interface HolidayResponse {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  counties: string[] | null;
  launchYear: number | null;
  types: string[];
}

@Injectable({
  providedIn: 'root'
})
export class CalendarService {
  private holidaysApiUrl = 'https://zilelibere.webventure.ro/api';
  
  constructor(private http: HttpClient) {}
  
  getPublicHolidays(year: number, countryCode: string = 'RO'): Observable<HolidayResponse[]> {
    return this.http.get<Holiday[]>(`/api/${year}`)
      .pipe(
        map(holidays => this.transformHolidaysToHolidayResponse(holidays, countryCode, year)),
        catchError(error => {
          console.error('Eroare la obținerea sărbătorilor legale:', error);
          return of([]);
        })
      );
  }
  
  
  private transformHolidaysToHolidayResponse(holidays: Holiday[], countryCode: string, year: number): HolidayResponse[] {
    const result: HolidayResponse[] = [];
    
    holidays.forEach(holiday => {
      holiday.date.forEach(dateInfo => {
   
        const formattedDate = dateInfo.date.replace(/\//g, '-');
        
        result.push({
          date: formattedDate,
          localName: holiday.name,
          name: holiday.name,
          countryCode: countryCode,
          fixed: true,  
          global: true, 
          counties: null,
          launchYear: null,
          types: ['Public']
        });
      });
    });
    
    return result;
  }
  
  isWorkingDay(date: Date, holidays: HolidayResponse[]): boolean {
    const dayOfWeek = date.getDay();
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }
  
    const dateString = this.formatDateForApi(date);
    return !holidays.some(holiday => holiday.date === dateString);
  }

  private formatDateForApi(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}