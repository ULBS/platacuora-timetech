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
    semesterNumber: number = 1;         
  isMedicine: boolean = false; 
  datesList: DateInfo[] = [];
  isLoading: boolean = false;
  selectedAcademicYear: string = '';
  selectedSemesterNumber: number = 1;
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
  const savedUser = localStorage.getItem('user');
  if (savedUser) {
    this.user = JSON.parse(savedUser);
  } else {
    this.user = {
      universitate: 'Universitate Test',
      facultate: 'Facultate Test',
      departament: 'Departament Test',
      declarant: 'Declarant Test',
      decan: 'Decan Test',
      directorDepartament: 'Director Test'
    };
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
  const start = new Date(this.semesterStart);
  const end = new Date(this.semesterEnd);

  if (start >= end) {
    alert('Data de început trebuie să fie înainte de data de sfârșit');
    return;
  }

  // Deducerea anului academic
  let academicYear: string;
  if (start.getMonth() + 1 >= 1 && start.getMonth() + 1 <= 9) {
    // Semestru începe între ianuarie-septembrie
    academicYear = `${start.getFullYear() - 1}/${start.getFullYear()}`;
  } else {
    academicYear = `${start.getFullYear()}/${start.getFullYear() + 1}`;
  }

  const config = {
    academicYear,
    semester: this.semesterNumber,
    faculty: this.user?.facultate || '',
    startDate: this.semesterStart,
    endDate: this.semesterEnd,
    isMedicine: this.isMedicine
  };

  // Înainte să creăm, verificăm dacă există deja
  this.semesterService.getConfigsByFaculty(config.faculty, academicYear, this.semesterNumber).subscribe(existing => {
    if (existing.length > 0) {
      alert('Configurația pentru acest semestru și an există deja!');
      return;
    }

    // Creare configurație
    this.semesterService.createConfig(config).subscribe({
      next: (res) => {
        console.log('RĂSPUNS backend:', res);
        this.currentConfigId = res._id;
        alert('Configurație salvată cu succes!');

        // Generăm automat săptămânile
        this.generateWeeks();
      },
      error: (err) => {
        console.error('Eroare detaliată backend:', err.error);
        alert('Eroare la salvare: ' + (err.error?.message || err.message));
      }
    });
  });
} 

calendarDays: {
  date: Date | null;
  weekType: string;
  weekLabel: string;
  isVacation: boolean;
}[] = [];


loadedSemester: any = null;

loadSemesterCalendar() {
  if (!this.selectedAcademicYear || !this.selectedSemesterNumber) {
    alert('Completează anul academic și semestrul!');
    return;
  }

  this.semesterService
    .getConfigsByFaculty(this.user.facultate, this.selectedAcademicYear, this.selectedSemesterNumber)
    .subscribe({
      next: configs => {
        if (configs.length === 0) {
          alert('Nu există calendar pentru aceste criterii!');
        } else {
          // Datele din backend vin și se afișează în input-uri
          this.loadedSemester = configs[0];

          // Transform datele pentru input de tip date (dacă nu sunt deja în format ISO)
          this.loadedSemester.weeks.forEach((w: any) => {
            w.startDate = new Date(w.startDate).toISOString().split('T')[0];
          });
          this.loadedSemester.specialWeeks.forEach((v: any) => {
            v.startDate = new Date(v.startDate).toISOString().split('T')[0];
            v.endDate = new Date(v.endDate).toISOString().split('T')[0];
          });
        }
      },
      error: err => {
        console.error('Eroare la încărcare:', err);
        alert('Eroare la încărcare calendar!');
      }
    });
}

saveEditedSemester() {
  if (!this.loadedSemester || !this.loadedSemester._id) {
    alert('Calendarul nu este încărcat!');
    return;
  }

  // Trimitem datele editate
  this.semesterService.updateSemesterConfig(this.loadedSemester._id, {
    weeks: this.loadedSemester.weeks,
    specialWeeks: this.loadedSemester.specialWeeks
  }).subscribe({
    next: () => alert('Calendar salvat cu succes!'),
    error: err => {
      console.error('Eroare la salvare:', err);
      alert('Eroare la salvare!');
    }
  });
}

  generateCalendarGrid(semesterData: any) {
    const start = new Date(semesterData.startDate);
    const end = new Date(semesterData.endDate);
    const specialWeeks = semesterData.specialWeeks || [];
    const weeks = semesterData.weeks || [];

    this.calendarDays = [];
    const current = new Date(start);

    while (current <= end) {
      const week = weeks.find((w: any) =>
        new Date(w.startDate).toDateString() === current.toDateString()
      );

      const special = specialWeeks.find((v: any) => {
        const vacStart = new Date(v.startDate);
        const vacEnd = new Date(v.endDate);
        return current >= vacStart && current <= vacEnd;
      });

      this.calendarDays.push({
        date: new Date(current),
        weekType: week ? week.weekType : '',
        weekLabel: week ? week.weekNumber : '',
        isVacation: !!special
      });

      current.setDate(current.getDate() + 1);
    }

    const firstValid = this.calendarDays.find(day => day.date !== null);
    if (firstValid && firstValid.date) {
      const firstDay = firstValid.date.getDay();
      const offset = (firstDay + 6) % 7; // Luni = 0
      for (let i = 0; i < offset; i++) {
        this.calendarDays.unshift({
          date: null,
          weekType: '',
          weekLabel: '',
          isVacation: false
        });
      }
    }
  }

toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
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
