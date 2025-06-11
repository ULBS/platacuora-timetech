import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CalendarService, HolidayResponse } from '../../../core/services/calendar.service';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SemesterService } from '../../core/services/semester.service';

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
  styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent implements OnInit {
  startDate: string = '';
  endDate: string = '';
  minDate: string = '2025-01-01';
  maxDate: string = '2050-12-31';
  datesList: DateInfo[] = [];
  isLoading: boolean = false;

  user: any = null;
  semesterStart: string = '';
  semesterEnd: string = '';
  oddWeekStart: boolean = true;
  currentConfigId: string | undefined;

  vacation = {
    name: '',
    startDate: '',
    endDate: ''
  };

  daysOfWeek: string[] = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];

  constructor(
    private http: HttpClient,
    private calendarService: CalendarService,
    private semesterService: SemesterService
  ) {}

  ngOnInit(): void {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    this.startDate = this.formatDateForInput(firstDayOfMonth);
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

  formatDateForDisplay(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
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
    if (!this.validateDates()) return;

    this.isLoading = true;
    this.datesList = [];

    const currentDate = new Date(this.startDate);
    const end = new Date(this.endDate);

    while (currentDate <= end) {
      this.datesList.push({
        date: this.formatDateForDisplay(currentDate),
        dayOfWeek: this.daysOfWeek[currentDate.getDay()],
        isWorkingDay: null,
        isEven: currentDate.getDate() % 2 === 0
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    this.checkWorkingDays();
  }

  checkWorkingDays(): void {
    const uniqueYears = new Set<number>();
    this.datesList.forEach(date => {
      const year = parseInt(date.date.split('.')[2]);
      uniqueYears.add(year);
    });

    const holidayRequests: { [year: number]: Observable<HolidayResponse[]> } = {};
    uniqueYears.forEach(year => {
      holidayRequests[year] = this.calendarService.getPublicHolidays(year).pipe(catchError(() => of([])));
    });

    if (Object.keys(holidayRequests).length === 0) {
      this.isLoading = false;
      return;
    }

    forkJoin(holidayRequests).subscribe(results => {
      const allHolidays: HolidayResponse[] = [];
      Object.values(results).forEach(arr => allHolidays.push(...arr));
      this.datesList.forEach(date => {
        const [dd, mm, yyyy] = date.date.split('.');
        const d = new Date(`${yyyy}-${mm}-${dd}`);
        date.isWorkingDay = this.calendarService.isWorkingDay(d, allHolidays);
      });
      this.isLoading = false;
    });
  }

 saveSemesterStructure() {
  const startYear = new Date(this.semesterStart).getFullYear();
  const academicYear = `${startYear}/${startYear + 1}`.replace(/\s+/g, '');


  const config = {
    academicYear,
    semester: 2,
    faculty: this.user?.facultate || '',
    startDate: this.semesterStart,
    endDate: this.semesterEnd,
    createdBy: this.user?.id || '68308cd4f1ae415dcb8fccbc' // fallback dummy ID
  };

  console.log('TRIMIT:', config);

  this.semesterService.createConfig(config).subscribe({
    next: (res) => {
      console.log('RĂSPUNS backend:', res);
      this.currentConfigId = res._id;
      alert('Configurație salvată cu succes!');
    },
    error: (err) => {
      console.error('Eroare backend:', err);
      alert('Eroare la salvare: ' + (err.error?.message || err.message));
    }
  });
}



  generateWeeks() {
    if (!this.currentConfigId) {
      alert('Trebuie să salvezi configurația mai întâi!');
      return;
    }

    this.semesterService.generateWeeks(this.currentConfigId, this.oddWeekStart).subscribe({
      next: () => alert('Săptămânile au fost generate'),
      error: (err) => alert('Eroare: ' + err.message)
    });
  }

  addVacation() {
    if (!this.currentConfigId) {
      alert('Trebuie să salvezi configurația mai întâi!');
      return;
    }

    this.semesterService.addVacationPeriod(this.currentConfigId, this.vacation).subscribe({
      next: () => alert('Vacanță adăugată'),
      error: (err) => alert('Eroare: ' + err.message)
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
