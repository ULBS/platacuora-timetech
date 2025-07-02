import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CalendarService, HolidayResponse } from '../../../core/services/calendar.service';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SemesterService } from '../../core/services/semester.service';
import { SharedStatusService } from '../../core/services/shared-status.service';
import { TeachingHour, TeachingHoursService } from '../../core/services/teaching-hours.service';
import { EnhancedPdfService, PDFOptions } from '../../core/services/enhanced-pdf.service';
import { environment } from '../../../enviroments/environment';

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
  //loadedSemester: any = null;
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

  calendarStatus: 'VERIFICAT' | 'IN_EDITARE' = 'VERIFICAT';
  semesterStructureStatus: 'VERIFICAT' | 'IN_EDITARE' = 'VERIFICAT';
  loadedSemester: any = null;
  editablePdfTable: any[] = [];
  showPdfPreview: boolean = false;
  isHoursInEditing: boolean = false;

  constructor(
    private http: HttpClient,
    private calendarService: CalendarService,
    private semesterService: SemesterService,
    private sharedStatusService: SharedStatusService
    private teachingHoursService: TeachingHoursService,
    private enhancedPdfService: EnhancedPdfService
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
    this.sharedStatusService.hoursEditingStatus$.subscribe(
      isEditing => this.isHoursInEditing = isEditing
    );
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
      console.error('Datele introduse nu sunt valide.');
      return false;
    }
    if (start > end) {
      console.error('Data de început trebuie să fie înainte de data de sfârșit.');
      return false;
    }
    if (start.getFullYear() !== end.getFullYear() || start.getMonth() !== end.getMonth()) {
      console.error('Calendarul poate fi generat doar pentru o singură lună calendaristică.');
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
    console.warn('Nu există zile lucrătoare selectate pentru a genera declarația!');
    return;
  }

  console.log('🔍 Calendar Preview - Loading teaching hours for period:', {
    startDate: this.startDate,
    endDate: this.endDate,
    workingDaysCount: workingDays.length
  });
  
  // Load teaching hours from localStorage (saved by TeachingHoursService)
  const teachingHoursData = JSON.parse(localStorage.getItem('teachingHours') || '[]') as TeachingHour[];
  console.log('� Teaching hours from localStorage:', teachingHoursData);
  
  // Get current academic year and semester based on the selected period
  const academicYear = this.getAcademicYearFromDate(this.startDate);
  const semester = this.getSemesterFromDate(this.startDate);
  
  console.log('🎯 Filtering for academic year:', academicYear, 'semester:', semester);
  
  // Filter teaching hours for the current academic year and semester
  const relevantTeachingHours = teachingHoursData.filter(hour => 
    hour.academicYear === academicYear && hour.semester === semester
  );
  
  console.log('📋 Relevant teaching hours:', relevantTeachingHours);
  
  // Create a map of day names to teaching hours
  const dayNameMap: { [key: string]: string } = {
    'Monday': 'Luni',
    'Tuesday': 'Marti', 
    'Wednesday': 'Miercuri',
    'Thursday': 'Joi',
    'Friday': 'Vineri',
    'Saturday': 'Sambata',
    'Sunday': 'Duminica'
  };
  
  // Create the editable PDF table by matching working days with teaching hours
  this.editablePdfTable = [];
  
  for (const date of workingDays) {
    const dateObj = new Date(date.date.split('.').reverse().join('-')); // Convert from DD.MM.YYYY to YYYY-MM-DD
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const romanianDayName = dayNameMap[dayOfWeek];
    
    console.log(`🗓️ Processing date ${date.date} (${dayOfWeek} -> ${romanianDayName})`);
    
    // Find teaching hours for this day of the week
    const hoursForThisDay = relevantTeachingHours.filter(hour => 
      hour.dayOfWeek === romanianDayName
    );
    
    if (hoursForThisDay.length > 0) {
      // Create entries for each teaching hour on this day
      for (const hour of hoursForThisDay) {
        console.log(`✅ Adding teaching hour for ${date.date}:`, hour);
        
        this.editablePdfTable.push({
          post: hour.disciplineName || '',
          data: date.date,
          c: (hour.courseHours || 0).toString(),
          s: (hour.seminarHours || 0).toString(),
          la: (hour.labHours || 0).toString(),
          p: (hour.projectHours || 0).toString(),
          tip: hour.activityType || 'LR',
          coef: '1',
          nrOre: (hour.totalHours || (hour.courseHours || 0) + (hour.seminarHours || 0) + (hour.labHours || 0) + (hour.projectHours || 0)).toString(),
          grupa: hour.group || ''
        });
      }
    } else {
      // If no teaching hours for this day, create an empty row for manual entry
      console.log(`➖ No teaching hours for ${date.date}, creating empty row`);
      this.editablePdfTable.push({
        post: '',
        data: date.date,
        c: '',
        s: '',
        la: '',
        p: '',
        tip: '',
        coef: '1',
        nrOre: '',
        grupa: ''
      });
    }
  }
  
  console.log('� Final PDF table:', this.editablePdfTable);
  console.log(`✅ Created ${this.editablePdfTable.length} rows for PDF preview`);
  
  // Show summary of loaded data
  const populatedRows = this.editablePdfTable.filter(row => row.c || row.s || row.la || row.p);
  if (populatedRows.length > 0) {
    console.log(`🎯 Pre-populated ${populatedRows.length} rows with teaching hours data`);
  } else {
    console.log('⚠️ No teaching hours found for this period - user will need to fill manually');
  }
  
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
    
    if (this.calendarStatus !== 'VERIFICAT') {
    alert('Calendarul trebuie verificat înainte de a genera PDF-ul!');
    return;
    }

    const removeButtons = element.querySelectorAll('button');
    const originalDisplay: string[] = [];
    removeButtons.forEach((btn, idx) => {
      originalDisplay[idx] = (btn as HTMLElement).style.display;
      (btn as HTMLElement).style.display = 'none';
    });
    try {
      if (!this.editablePdfTable || this.editablePdfTable.length === 0) {
        console.error('Nu există date pentru a genera PDF-ul. Vă rugăm să adăugați cel puțin o intrare în tabel.');
        return;
      }
      
      const userId = this.user?.id || this.user?._id;
      if (!userId) {
        console.error('Nu există utilizator autentificat. Nu se poate salva declarația.');
        return;
      }

      const validRows = this.editablePdfTable.filter(row => 
        row && (row.c || row.s || row.la || row.p || row.post)
      );

      if (validRows.length === 0) {
        console.error('Nu există date valide pentru a genera PDF-ul. Vă rugăm să completați cel puțin o linie cu ore.');
        return;
      }

      const newDeclaration = {
        id: Date.now(),
        userId: userId,
        perioada: { start: this.startDate, end: this.endDate },
        activitati: validRows,
        status: 'generata' as const,
        dataCreare: new Date().toISOString()
      };

      const declarations = JSON.parse(localStorage.getItem('declarations') || '[]');
      declarations.push(newDeclaration);
      localStorage.setItem('declarations', JSON.stringify(declarations));
      localStorage.setItem('savedHours', JSON.stringify(validRows));

      try {
        const academicYear = this.getAcademicYearFromDate(this.startDate);
        const semester = this.getSemesterFromDate(this.startDate);
        
        const teachingHoursPromises = validRows.map((row, index) => {
          const courseHours = parseInt(row.c || '0');
          const seminarHours = parseInt(row.s || '0');
          const labHours = parseInt(row.la || '0');
          const projectHours = parseInt(row.p || '0');
          
          const nonZeroHours = [courseHours, seminarHours, labHours, projectHours].filter(h => h > 0);
          
          let finalCourseHours = courseHours;
          let finalSeminarHours = seminarHours;
          let finalLabHours = labHours;
          let finalProjectHours = projectHours;
          
          if (nonZeroHours.length === 0) {
            finalCourseHours = 1;
          } else if (nonZeroHours.length > 1) {
            finalCourseHours = courseHours > 0 ? courseHours : 0;
            finalSeminarHours = courseHours === 0 && seminarHours > 0 ? seminarHours : 0;
            finalLabHours = courseHours === 0 && seminarHours === 0 && labHours > 0 ? labHours : 0;
            finalProjectHours = courseHours === 0 && seminarHours === 0 && labHours === 0 && projectHours > 0 ? projectHours : 0;
          }
          
          const teachingHourData = {
            faculty: this.user?.facultate || 'Inginerie',
            department: this.user?.departament || 'Calculatoare și Inginerie Electrică',
            academicYear: academicYear,
            semester: semester,
            postNumber: index + 1,
            postGrade: 'Lect',
            disciplineName: row.post || 'Disciplină',
            activityType: row.tip || 'LR',
            group: row.grupa || 'Grupa 1',
            dayOfWeek: this.getDayOfWeekFromDate(row.data),
            courseHours: finalCourseHours,
            seminarHours: finalSeminarHours,
            labHours: finalLabHours,
            projectHours: finalProjectHours,
            coefficient: parseFloat(row.coef || '1'),
            startTime: '08:00',
            endTime: '10:00',
            notes: `Generated from calendar for date ${row.data}`
          };
          
          return this.http.post(`${environment.apiUrl}/teaching-hours`, teachingHourData).toPromise();
        });

        const teachingHours = await Promise.all(teachingHoursPromises);
        
        if (!teachingHours || teachingHours.length === 0) {
          throw new Error('No teaching hours were created - API returned empty result');
        }
        
        const teachingHourIds = teachingHours.map((th: any) => {
          const id = th?._id || th?.id || th?.teachingHourId || (typeof th === 'string' ? th : null);
          return id;
        });
        
        const invalidIds = teachingHourIds.filter((id: any) => !id);
        if (invalidIds.length > 0) {
          throw new Error(`Failed to extract IDs from ${invalidIds.length} teaching hour responses. Check backend response structure.`);
        }
      
        const declarationData = {
          teachingHourIds: teachingHourIds,
          title: `Declarație generată din calendar - ${this.startDate} / ${this.endDate}`,
          description: 'Declarație generată automat din calendar',
          status: 'draft'
        };
        
        const paymentDeclaration = await this.http.post(`${environment.apiUrl}/payment`, declarationData).toPromise();
        
        const updatedDeclarations = JSON.parse(localStorage.getItem('declarations') || '[]');
        const declarationIndex = updatedDeclarations.findIndex((d: any) => d.id === newDeclaration.id);
        if (declarationIndex >= 0) {
          updatedDeclarations[declarationIndex].databaseId = (paymentDeclaration as any)._id;
          localStorage.setItem('declarations', JSON.stringify(updatedDeclarations));
        }
        
      } catch (dbError: any) {
        const errorMessage = dbError?.message || dbError?.error?.message || 'Unknown database error';
        console.error('Declarația a fost generată, dar salvarea în baza de date a eșuat:', errorMessage);
      }

      const pdfOptions: PDFOptions = {
        enhanced: true,
        includeQR: true,
        includeWatermark: false,
        digitalSignature: false,
        template: 'ulbs-official'
      };

      const pdfObservable = await this.enhancedPdfService.generateEnhancedPDF(
        newDeclaration.id.toString(),
        pdfOptions
      );

      pdfObservable.subscribe({
        next: (pdfBlob: Blob) => {
          this.enhancedPdfService.blobToBase64(pdfBlob).then(base64 => {
            const updatedDeclarations = JSON.parse(localStorage.getItem('declarations') || '[]');
            const declarationIndex = updatedDeclarations.findIndex((d: any) => d.id === newDeclaration.id);
            if (declarationIndex >= 0) {
              updatedDeclarations[declarationIndex].pdfBase64 = base64;
              localStorage.setItem('declarations', JSON.stringify(updatedDeclarations));
            }
          });
          
          this.enhancedPdfService.openBlobInNewWindow(pdfBlob);
          this.closePdfPreview();
        },
        error: (error) => {
          console.error('Eroare la generarea PDF-ului:', error.message || error);
        }
      });

    } catch (error) {
      alert('Eroare neașteptată la generarea PDF-ului.');
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
    
    // Log semester config only once for debugging
    if (semesterConfig && semesterConfig.weeks) {
      console.log('Semester config loaded with', semesterConfig.weeks.length, 'weeks');
    }
    
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

  onWorkingDayChange(dateInfo: DateInfo, value: boolean) {
      dateInfo.isWorkingDay = value;
      this.calendarStatus = 'IN_EDITARE';
  }

  onWeekTypeChange(week: any): void {
  console.log('Tipul săptămânii modificat:', week);
  this.semesterStructureStatus = 'IN_EDITARE'; 
  if (this.datesList.length > 0 && this.loadedSemester) {
    this.refreshGeneratedDatesWithNewConfig();
   }
  }

  onWeekDateChange(week: any): void {
  console.log('Data săptămânii modificată:', week);
  this.semesterStructureStatus = 'IN_EDITARE';
  if (this.datesList.length > 0 && this.loadedSemester) {
    this.refreshGeneratedDatesWithNewConfig();
   }
  }



  private getWeekTypeForDate(date: Date, semesterConfig: any): { weekType: 'Par' | 'Impar', weekNumber: string } {
    const weeks = semesterConfig.weeks || [];
    
    for (const week of weeks) {
      const weekStart = new Date(week.startDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6); 
      
      // Removed excessive debug logging for performance
      
      if (date >= weekStart && date <= weekEnd) {
        // Found matching week
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
      
      // Calculated week type based on closest week
      
      return {
        weekType: weekType,
        weekNumber: `Calc-${Math.abs(weeksDiff)}`
      };
    }
    
    // Fallback to default
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
  // Setează statusul ca IN_EDITARE la orice modificare
  this.semesterStructureStatus = 'IN_EDITARE';

  console.log('Calendar actualizat cu succes!');
}

regenerateDatesWithUpdatedConfig(): void {
    if (!this.startDate || !this.endDate) {
      alert('Selectează mai întâi intervalul de date și generează calendarul!');
      return;
    }

   // Regenerăm datele cu configurația actualizată
  this.generateDates();

  // Setează statusul ca IN_EDITARE la orice modificare
  this.semesterStructureStatus = 'IN_EDITARE';
  }

verifySemesterStructure(){
  
  this.semesterStructureStatus = 'VERIFICAT'
}
  
verifyCalendar() {
  this.calendarStatus = 'VERIFICAT';
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
    if (this.calendarStatus !== 'VERIFICAT') {
    alert('Calendarul trebuie verificat înainte de a genera PDF-ul!');
    return;
    }

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

  // Helper methods for payment declaration data
  private getAcademicYearFromDate(dateStr: string): string {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    
    if (month >= 10) {
      return `${year}/${year + 1}`;
    } else {
      return `${year - 1}/${year}`;
    }
  }

  private getSemesterFromDate(dateStr: string): number {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    
    if (month >= 10 || month <= 1) {
      return 1; // October-January = Semester 1
    } else {
      return 2; // February-September = Semester 2
    }
  }

  private transformTableDataToItems(tableData: any[]): any[] {
    return tableData.map((row, index) => ({
      postNumber: index + 1,
      postGrade: row.tip || 'LR',
      date: row.data,
      courseHours: parseInt(row.c || '0'),
      seminarHours: parseInt(row.s || '0'),
      labHours: parseInt(row.la || '0'),
      projectHours: parseInt(row.p || '0'),
      activityType: row.tip || 'LR',
      coefficient: parseFloat(row.coef || '1'),
      totalHours: parseInt(row.nrOre || '0'),
      groups: row.grupa || ''
    }));
  }

  private getDayOfWeekFromDate(dateStr: string): string {
    // Convert DD.MM.YYYY to Date object
    const [day, month, year] = dateStr.split('.');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    // Convert to Romanian day names
    const dayNames = {
      0: 'Duminica',
      1: 'Luni', 
      2: 'Marti',
      3: 'Miercuri',
      4: 'Joi',
      5: 'Vineri',
      6: 'Sambata'
    };
    
    return dayNames[date.getDay() as keyof typeof dayNames] || 'Luni';
  }
}