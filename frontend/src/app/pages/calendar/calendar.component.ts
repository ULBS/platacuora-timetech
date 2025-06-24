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
  oddEven?: string; 
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
  showPdfPreview = false;
  editablePdfTable: any[] = [];

  
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
        isEven: dayNumber % 2 === 0,
        oddEven: dayNumber % 2 === 0 ? 'Par' : 'Impar' 
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

  const worker = html2pdf.default().set(opt).from(element);
  const pdfBlob = await worker.output('blob');

  const pdfBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(pdfBlob);
  });

  const userId = this.user?.id;
  if (!userId) {
    alert('Nu există utilizator autentificat. Nu se poate salva declarația.');
    element.style.display = 'none';
    return;
  }
  const declarations = JSON.parse(localStorage.getItem('declarations') || '[]');
  const newDeclaration = {
    id: Date.now(),
    userId: userId,
    perioada: { start: this.startDate, end: this.endDate },
    activitati: this.datesList,
    status: 'generata',
    dataCreare: new Date().toISOString(),
    pdfBase64: pdfBase64
  };
  declarations.push(newDeclaration);
  localStorage.setItem('declarations', JSON.stringify(declarations));

  await worker.save();

  element.style.display = 'none';
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
      console.error('Nu există utilizator autentificat:', this.user);
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
    
    console.log('Declarație salvată:', newDeclaration);
    console.log('Total declarații:', declarations.length);

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

async savePdfToHistory() {
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
      throw new Error('Nu există utilizator autentificat');
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
    
    console.log('Declarație salvată:', newDeclaration);
    return newDeclaration;

  } finally {
  
    removeButtons.forEach((btn, idx) => {
      (btn as HTMLElement).style.display = originalDisplay[idx] || '';
    });
  }
}
}
