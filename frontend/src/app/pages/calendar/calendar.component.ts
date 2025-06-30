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

interface WeekInfo {
  weekNumber: string;
  startDate: string;
  weekType: 'Par' | 'Impar';
}

interface SpecialWeek {
  name: string;
  startDate: string;
  endDate: string;
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent implements OnInit {
markWeekAsModified(_t120: any) {
throw new Error('Method not implemented.');
}
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
  loadedSemester: any = null;
  vacation = {
    name: '',
    startDate: '',
    endDate: ''
  };

  daysOfWeek: string[] = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];

  calendarDays: {
    date: Date | null;
    weekType: string;
    weekLabel: string;
    isVacation: boolean;
  }[] = [];

  editablePdfTable: any[] = [];
  showPdfPreview: boolean = false;

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

  if (this.loadedSemester) {
    console.log('Folosesc configurația locală încărcată...');
    this.generateDatesWithWeekInfo(currentDate, end, this.loadedSemester);
  } else {
    this.loadSemesterStructureForDates(currentDate, end);
  }
}


   openPdfPreview() {
  const workingDays = this.datesList.filter(date => date.isWorkingDay === true);
  
  if (workingDays.length === 0) {
    alert('Nu există zile lucrătoare selectate pentru a genera declarația!');
    return;
  }
  
  this.editablePdfTable = workingDays.map(date => ({
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

  private loadSemesterStructureForDates(startDate: Date, endDate: Date): void {
    let academicYear: string;
    if (startDate.getMonth() + 1 >= 1 && startDate.getMonth() + 1 <= 9) {
      academicYear = `${startDate.getFullYear() - 1}/${startDate.getFullYear()}`;
    } else {
      academicYear = `${startDate.getFullYear()}/${startDate.getFullYear() + 1}`;
    }

    let semesterNumber: number;
    const month = startDate.getMonth() + 1;
    if (month >= 1 && month <= 6) {
      semesterNumber = 2; 
    } else {
      semesterNumber = 1; 
    }

    console.log(`Căutăm configurația pentru: ${this.user.facultate}, ${academicYear}, semestrul ${semesterNumber}`);

    this.semesterService.getConfigsByFaculty(this.user.facultate, academicYear, semesterNumber).subscribe({
      next: configs => {
        console.log('Configurații găsite:', configs);
        if (configs.length > 0) {
          const semesterConfig = configs[0];
          this.generateDatesWithWeekInfo(startDate, endDate, semesterConfig);
        } else {
          console.log('Nu există configurație, folosim logica implicită');
          this.generateDatesWithoutWeekInfo(startDate, endDate);
        }
      },
      error: err => {
        console.error('Eroare la încărcarea configurației:', err);
        this.generateDatesWithoutWeekInfo(startDate, endDate);
      }
    });
  }

  private generateDatesWithWeekInfo(startDate: Date, endDate: Date, semesterConfig: any): void {
    const currentDate = new Date(startDate);
    
    console.log('Configurația semestrului încărcată:', semesterConfig);
    console.log('Săptămânile disponibile:', semesterConfig.weeks);
    
    while (currentDate <= endDate) {
      const weekInfo = this.getWeekTypeForDate(currentDate, semesterConfig);
      
      this.datesList.push({
        date: this.formatDateForDisplay(currentDate),
        dayOfWeek: this.daysOfWeek[currentDate.getDay()],
        isWorkingDay: null,
        isEven: weekInfo.weekType === 'Par'
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    this.checkWorkingDays();
  }

  private generateDatesWithoutWeekInfo(startDate: Date, endDate: Date): void {
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
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

  private getWeekTypeForDate(date: Date, semesterConfig: any): { weekType: 'Par' | 'Impar', weekNumber: string } {
    const weeks = semesterConfig.weeks || [];
    
    for (const week of weeks) {
      const weekStart = new Date(week.startDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6); 
      
      console.log(`Verificăm data ${date.toDateString()} cu săptămâna ${week.weekNumber} (${week.weekType}): ${weekStart.toDateString()} - ${weekEnd.toDateString()}`);
      
      if (date >= weekStart && date <= weekEnd) {
        console.log(`Găsită! Data ${date.toDateString()} aparține săptămânii ${week.weekNumber} (${week.weekType})`);
        return {
          weekType: week.weekType,
          weekNumber: week.weekNumber
        };
      }
    }
    
    let closestWeek = null;
    let minDistance = Infinity;
    
    for (const week of weeks) {
      const weekStart = new Date(week.startDate);
      const distance = Math.abs(date.getTime() - weekStart.getTime());
      
      if (distance < minDistance) {
        minDistance = distance;
        closestWeek = week;
      }
    }
    
    if (closestWeek) {
      const closestWeekStart = new Date(closestWeek.startDate);
      const daysDiff = Math.floor((date.getTime() - closestWeekStart.getTime()) / (1000 * 60 * 60 * 24));
      const weeksDiff = Math.floor(daysDiff / 7);
      
      let weekType: 'Par' | 'Impar';
      if (closestWeek.weekType === 'Par') {
        weekType = (weeksDiff % 2 === 0) ? 'Par' : 'Impar';
      } else {
        weekType = (weeksDiff % 2 === 0) ? 'Impar' : 'Par';
      }
      
      console.log(`Calculat pentru data ${date.toDateString()}: ${weekType} (bazat pe săptămâna ${closestWeek.weekNumber})`);
      
      return {
        weekType: weekType,
        weekNumber: `Calc-${Math.abs(weeksDiff)}`
      };
    }
    
    console.log(`Fallback pentru data ${date.toDateString()}: Impar`);
    return { weekType: 'Impar', weekNumber: '1' };
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

    this.semesterService.getConfigsByFaculty(config.faculty, academicYear, this.semesterNumber).subscribe(existing => {
      if (existing.length > 0) {
        alert('Configurația pentru acest semestru și an există deja!');
        return;
      }
      this.semesterService.createConfig(config).subscribe({
        next: (res) => {
          console.log('RĂSPUNS backend:', res);
          this.currentConfigId = res._id;
          alert('Configurație salvată cu succes!');

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

    this.semesterService
      .getConfigsByFaculty(this.user.facultate, this.selectedAcademicYear, this.selectedSemesterNumber)
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

  const updateData = {
    weeks: this.loadedSemester.weeks.map((week: any) => ({
      weekNumber: week.weekNumber,
      startDate: week.startDate,
      weekType: week.weekType // 'Par' sau 'Impar
    })),
    specialWeeks: this.loadedSemester.specialWeeks.map((special: any) => ({
      name: special.name,
      startDate: special.startDate,
      endDate: special.endDate
    }))
  };

  console.log('Salvez modificările:', updateData);

  this.semesterService.updateSemesterConfig(this.loadedSemester._id, updateData).subscribe({
    next: (response) => {
      console.log('Calendar salvat cu succes:', response);
      alert('Calendar salvat cu succes!');
      
      if (response) {
        this.loadedSemester = { ...this.loadedSemester, ...response };
        
        this.loadedSemester.weeks.forEach((w: any) => {
          w.startDate = new Date(w.startDate).toISOString().split('T')[0];
        });
        this.loadedSemester.specialWeeks.forEach((v: any) => {
          v.startDate = new Date(v.startDate).toISOString().split('T')[0];
          v.endDate = new Date(v.endDate).toISOString().split('T')[0];
        });
      }
      
      // IMPORTANT: Actualizează automat calendarul generat cu noua configurație
      if (this.datesList.length > 0) {
        this.refreshGeneratedDatesWithNewConfig();
      }
    },
    error: err => {
      console.error('Eroare la salvare:', err);
      alert('Eroare la salvare: ' + (err.error?.message || err.message));
    }
  });
}


private refreshGeneratedDatesWithNewConfig(): void {
  console.log('Actualizez calendarul generat cu configurația modificată...');
  
  if (!this.loadedSemester || this.datesList.length === 0) {
    return;
  }

  // Actualizăm paritatea pentru fiecare dată din lista generată
  this.datesList.forEach(dateInfo => {
    const [day, month, year] = dateInfo.date.split('.');
    const currentDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    const weekInfo = this.getWeekTypeForDate(currentDate, this.loadedSemester);
    dateInfo.isEven = weekInfo.weekType === 'Par';
  });

  console.log('Calendar actualizat cu succes!');
}

  regenerateDatesWithUpdatedConfig(): void {
    if (!this.startDate || !this.endDate) {
      alert('Selectează mai întâi intervalul de date și generează calendarul!');
      return;
    }

    // Regenerăm datele cu configurația actualizată
    this.generateDates();
  }

  onWeekTypeChange(week: any): void {
  console.log('Tipul săptămânii modificat:', week);
  
  if (this.datesList.length > 0 && this.loadedSemester) {
    this.refreshGeneratedDatesWithNewConfig();
  }
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

  refreshCalendarWithCurrentConfig(): void {
  if (!this.startDate || !this.endDate) {
    alert('Selectează mai întâi intervalul de date!');
    return;
  }

  if (!this.loadedSemester) {
    alert('Nu există configurație încărcată pentru actualizare!');
    return;
  }

  console.log('Refresh manual cu configurația curentă...');
  this.generateDates();
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