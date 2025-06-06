import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CalendarService, HolidayResponse } from '../../../core/services/calendar.service';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';




interface DateInfo {
  date: string;
  dayOfWeek: string;
  isWorkingDay: boolean | null;
  isEven: boolean;
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss'
})
export class CalendarComponent implements OnInit {
  startDate: string = '';
  endDate: string = '';
  minDate: string = '2025-01-01';
  maxDate: string = '2050-12-31';
  datesList: DateInfo[] = [];
  isLoading: boolean = false;
  user: any = null; 

  
  daysOfWeek: string[] = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];
  
  constructor(private http: HttpClient, private calendarService: CalendarService) {}

  ngOnInit(): void {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    this.startDate = this.formatDateForInput(firstDayOfMonth);

    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    this.endDate = this.formatDateForInput(lastDayOfMonth);
   
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      this.user = JSON.parse(savedUser);
    }
  }

  formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  validateDates(): boolean {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      alert('Datele introduse nu sunt valide.');
      return false;
    }

    if (start > end) {
      alert('Data de început trebuie să fie înainte de data de sfârșit.');
      return false;
    }

    if (start.getFullYear() !== end.getFullYear() || start.getMonth() !== end.getMonth()) {
      alert('Calendarul poate fi generat doar pentru o singură lună calendaristică.');
      return false;
    }

    return true;
  }

  generateDates(): void {
    if (!this.validateDates()) {
      return;
    }
    
    this.isLoading = true;
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    this.datesList = [];
    
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      const dateString = this.formatDateForDisplay(currentDate);
      const dayOfWeek = this.daysOfWeek[currentDate.getDay()];
      const dayNumber = currentDate.getDate();
      
      this.datesList.push({
        date: dateString,
        dayOfWeek: dayOfWeek,
        isWorkingDay: null, 
        isEven: dayNumber % 2 === 0
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    this.checkWorkingDays();
  }

  formatDateForDisplay(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }

  checkWorkingDays(): void {
    const uniqueYears = new Set<number>();
    
    this.datesList.forEach(dateInfo => {
      const dateParts = dateInfo.date.split('.');
      const year = parseInt(dateParts[2]);
      uniqueYears.add(year);
    });
    
    const holidayRequests: { [year: number]: Observable<HolidayResponse[]> } = {};
    
    uniqueYears.forEach(year => {
      holidayRequests[year] = this.calendarService.getPublicHolidays(year).pipe(
        catchError(() => of([]))
      );
    });
    
    if (Object.keys(holidayRequests).length === 0) {
      this.isLoading = false;
      return;
    }
    
    forkJoin(holidayRequests).subscribe(results => {
      const allHolidays: HolidayResponse[] = [];
      
      Object.values(results).forEach(holidays => {
        if (Array.isArray(holidays)) {
          allHolidays.push(...holidays);
        }
      });
      
      this.datesList.forEach(dateInfo => {
        const dateParts = dateInfo.date.split('.');
        const date = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
        
        dateInfo.isWorkingDay = this.calendarService.isWorkingDay(date, allHolidays);
      });
      
      this.isLoading = false;
    });
  }

 async generatePDFDeclaration() {
  const element = document.getElementById('pdf-content');
  if (!element) return;

  element.style.display = 'block';

  const html2pdf = await import('html2pdf.js');
  const opt = {
    margin: 10,
    filename: 'declaratie-activitati-didactice.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  };

  await html2pdf.default().set(opt).from(element).save();

  element.style.display = 'none';
}


}