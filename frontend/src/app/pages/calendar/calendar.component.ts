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
  oddEven?: string; 
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

  showPdfPreview = false;
  editablePdfTable: any[] = [];

  selectedAcademicYear: string = '';
  selectedSemesterNumber: number = 1;
  user: any = null;
  semesterStart: string = '';
  semesterEnd: string = '';
  oddWeekStart: boolean = true;
  currentConfigId: string | undefined;
  loadedSemester: any = null;
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
      const dateString = this.formatDateForDisplay(currentDate);
      const dayOfWeek = this.daysOfWeek[currentDate.getDay()];
      const dayNumber = currentDate.getDate();

      this.datesList.push({
        date: dateString,
        dayOfWeek: dayOfWeek,
        isWorkingDay: null,
        isEven: dayNumber % 2 === 0,
        oddEven: dayNumber % 2 === 0 ? 'Par' : 'Impar' 
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

    // Verificăm dacă există deja o configurație salvată
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

  loadSemesterCalendar() {
    if (!this.selectedAcademicYear || !this.selectedSemesterNumber) {
      alert('Completează anul academic și semestrul!');
      return;
    }

    this.semesterService.getConfigsByFaculty(this.user.facultate, this.selectedAcademicYear, this.selectedSemesterNumber)
      .subscribe({
        next: configs => {
          if (configs.length === 0) {
            alert('Nu există calendar pentru aceste criterii!');
          } else {
            this.loadedSemester = configs[0];
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

  openPdfPreview() {
    this.editablePdfTable = this.datesList.map(date => ({
      post: '',
      data: date.date,
      c: '',
      s: '',
      la: '',
      p: '',
      tip: '',
      coef: '',
      nrOre: '',
      grupa: ''
    }));
    this.showPdfPreview = true;
  }

  closePdfPreview() {
    this.showPdfPreview = false;
  }

  addPdfTableRow() {
    this.editablePdfTable.push({
      post: '', data: '', c: '', s: '', la: '', p: '', tip: '', coef: '', nrOre: '', grupa: ''
    });
  }

  removePdfTableRow(index: number) {
    this.editablePdfTable.splice(index, 1);
  }

  async downloadPdfFromPreview() {
    const element = document.getElementById('pdf-content-preview');
    if (!element) return;

    const removeButtons = element.querySelectorAll('button');
    const originalDisplay: string[] = [];
    removeButtons.forEach((btn, idx) => {
      originalDisplay[idx] = (btn as HTMLElement).style.display;
      (btn as HTMLElement).style.display = 'none';
    });

    try {
      const html2pdf = await import('html2pdf.js');
      const opt = {
        margin: 10,
        filename: 'declaratie-activitati-didactice.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };
      const worker = html2pdf.default().set(opt).from(element);
      const pdfBlob = await worker.output('blob');
      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(pdfBlob);
      });

      const userId = this.user?.id || this.user?._id;
      if (!userId) {
        alert('Nu există utilizator autentificat. Nu se poate salva declarația.');
        return;
      }

      const declarations = JSON.parse(localStorage.getItem('declarations') || '[]');
      const newDeclaration = {
        id: Date.now(),
        userId: userId,
        perioada: { start: this.startDate, end: this.endDate },
        activitati: this.editablePdfTable,
        status: 'generata' as const,
        dataCreare: new Date().toISOString(),
        pdfBase64: pdfBase64
      };

      declarations.push(newDeclaration);
      localStorage.setItem('declarations', JSON.stringify(declarations));

      await worker.save();
      alert('Declarația a fost salvată în istoric!');
    } catch (error) {
      console.error('Eroare la generarea PDF:', error);
      alert('Eroare la generarea PDF-ului.');
    } finally {
      removeButtons.forEach((btn, idx) => {
        (btn as HTMLElement).style.display = originalDisplay[idx] || '';
      });
    }
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