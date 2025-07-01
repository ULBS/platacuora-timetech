import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../enviroments/environment';

export interface PDFOptions {
  enhanced?: boolean;
  includeQR?: boolean;
  includeWatermark?: boolean;
  digitalSignature?: boolean;
  template?: 'ulbs-official' | 'legacy';
  batchSize?: number;
}

export interface BatchPDFRequest {
  declarationIds: string[];
  options?: PDFOptions;
}

export interface BatchPDFResult {
  message: string;
  summary: {
    total: number;
    successful: number;
    failed: number;
    totalSize: number;
  };
  results: Array<{
    id: string;
    success: boolean;
    error?: string;
    size?: number;
    signed?: boolean;
  }>;
  downloadLinks: Array<{
    id: string;
    url: string;
    signed: boolean;
  }>;
}

export interface DataPreview {
  declarationId: string;
  period: {
    startDate: string;
    endDate: string;
  };
  integratedData: {
    items: any[];
    summary: any;
    metadata: any;
  };
  validation: {
    isValid: boolean;
    errors: string[];
  };
  preview: {
    totalItems: number;
    totalHours: number;
    activitiesCount: number;
    disciplinesCount: number;
  };
}

export interface CertificateInfo {
  isAvailable: boolean;
  certificate: {
    subject: any;
    issuer: any;
    validFrom: string;
    validTo: string;
    isValid: boolean;
    isExpired: boolean;
    isSelfSigned: boolean;
  };
}

export interface TemplateInfo {
  templates: Array<{
    id: string;
    name: string;
    description: string;
    features: string[];
    isDefault: boolean;
  }>;
  currentDefault: string;
}

export interface SignatureVerification {
  documentId: string;
  isVerified: boolean;
  signatureInfo: {
    timestamp: string;
    signer: string;
    algorithm: string;
    isValid: boolean;
  };
  documentInfo: {
    title: string;
    academicYear: string;
    semester: number;
    user: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class EnhancedPdfService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  /**
 * Generate enhanced PDF for a declaration
 */
async generateEnhancedPDF(declarationId: string, options: PDFOptions = {}): Promise<Observable<Blob>> {
  console.log('🚀 STARTING PDF GENERATION - Declaration ID:', declarationId);
  
  const defaultOptions: PDFOptions = {
    enhanced: true,
    includeQR: true,
    includeWatermark: false,
    digitalSignature: false,
    template: 'ulbs-official'
  };

  const finalOptions = { ...defaultOptions, ...options };

  // Debug all localStorage keys
  console.log('🔍 ALL LOCALSTORAGE KEYS:', Object.keys(localStorage));
  
  // Get the declaration data from localStorage
  const declarations = JSON.parse(localStorage.getItem('declarations') || '[]');
  console.log('📋 All declarations in localStorage:', declarations);
  
  const declaration = declarations.find((d: any) => d.id.toString() === declarationId);
  
  if (!declaration) {
    console.error('❌ Declaration not found! Looking for ID:', declarationId);
    console.error('Available declaration IDs:', declarations.map((d: any) => d.id));
    return throwError(() => new Error('Declaration not found in localStorage'));
  }

  console.log('✅ Found declaration:', declaration);

  // Get user data from localStorage
  const userData = JSON.parse(localStorage.getItem('user') || '{}');
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  
  console.log('👤 userData from localStorage:', userData);
  console.log('👤 currentUser from localStorage:', currentUser);
  
  // Use either user or currentUser, whichever has more complete data
  const user = userData.firstName ? userData : currentUser;
  console.log('👤 Final user data being used:', user);

  // Get the academic year and semester from the declaration period
  const academicYear = this.getAcademicYearFromDate(declaration.perioada.start);
  const semester = this.getSemesterFromDate(declaration.perioada.start);
  
  console.log('🎯 PDF Generation for period:', { 
    academicYear, 
    semester, 
    declarationPeriod: declaration.perioada 
  });
  
  // Check what teaching hours data is available
  console.log('🔍 Checking localStorage for teaching hours data...');
  const localStorageKeys = Object.keys(localStorage);
  const teachingHoursKeys = localStorageKeys.filter(key => 
    key.includes('teaching') || key.includes('ore') || key.includes('hour') || key.includes('lista')
  );
  console.log('📊 Teaching hours related keys in localStorage:', teachingHoursKeys);
  
  teachingHoursKeys.forEach(key => {
    const data = localStorage.getItem(key);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        console.log(`📋 Data in "${key}":`, Array.isArray(parsed) ? `Array with ${parsed.length} items` : typeof parsed, parsed);
      } catch (e) {
        console.log(`❌ Could not parse "${key}":`, data?.substring(0, 100));
      }
    }
  });
  
  // Fetch teaching hours data for this period - prioritize localStorage over API
  console.log('🔍 Fetching teaching hours for period:', { academicYear, semester });
  
  // First, check all relevant localStorage keys for teaching hours data
  let teachingHoursData: any[] = [];
  
  // Check saved hours from calendar component
  const savedHours = JSON.parse(localStorage.getItem('savedHours') || '[]');
  console.log('📋 savedHours from localStorage:', savedHours);
  
  // Check for any activity data already associated with this declaration
  if (declaration.activitati && declaration.activitati.length > 0) {
    console.log('📋 Found activities in declaration:', declaration.activitati);
    teachingHoursData = declaration.activitati;
  } 
  // Use saved hours if available and relevant
  else if (savedHours && savedHours.length > 0) {
    console.log('📋 Using savedHours as teaching hours data');
    teachingHoursData = savedHours;
  } 
  // Fall back to API call
  else {
    teachingHoursData = await this.fetchTeachingHoursForPeriod(academicYear, semester);
  }
  
  console.log('📊 Final teaching hours data:', {
    source: declaration.activitati ? 'declaration.activitati' : savedHours.length > 0 ? 'savedHours' : 'API',
    count: teachingHoursData.length,
    sampleData: teachingHoursData.slice(0, 2)
  });

  // Transform data to items format
  let items: any[] = [];
  
  if (teachingHoursData && teachingHoursData.length > 0) {
    // Check the format of the data to determine which transformer to use
    const firstItem = teachingHoursData[0];
    
    if (firstItem.c !== undefined || firstItem.s !== undefined) {
      // Format: { c: "2", s: "1", la: "0", p: "0", data: "...", grupa: "..." }
      items = this.transformSavedHoursToItems(teachingHoursData);
      console.log('✅ Transformed using savedHours format:', items);
    } else if (firstItem.courseHours !== undefined || firstItem.oreCurs !== undefined) {
      // Format: { courseHours: 2, seminarHours: 1, ... }
      items = this.transformTeachingHoursToItems(teachingHoursData);
      console.log('✅ Transformed using teachingHours format:', items);
    } else if (firstItem.activitati !== undefined) {
      // Format from declaration: { activitati: [...] }
      items = this.transformActivitiesToItems(teachingHoursData);
      console.log('✅ Transformed using activities format:', items);
    } else {
      // Try generic transformation
      items = this.transformTeachingHoursToItems(teachingHoursData);
      console.log('✅ Transformed using generic format:', items);
    }
    
    alert(`✅ Successfully transformed to ${items.length} PDF items`);
  } else {
    console.warn('⚠️ No teaching hours data found, creating sample data for PDF');
    alert('⚠️ No teaching hours data found, creating sample data for PDF');
    items = [{
      date: new Date().toISOString().split('T')[0],
      disciplineName: 'Disciplină demonstrativă',
      activityType: 'Curs',
      groups: 'Grupa demonstrativă',
      courseHours: 2,
      seminarHours: 0,
      labHours: 0,
      projectHours: 0,
      totalHours: 2,
      coefficient: 1
    }];
  }

  // Use the actual declaration data instead of hard-coding
  const declarationData = {
    _id: declaration.id,
    user: {
      _id: declaration.userId || user.id || user._id,
      firstName: user.firstName || 'Unknown',
      lastName: user.lastName || 'User',
      email: user.email || 'unknown@ulbsibiu.ro'
    },
    periode: declaration.perioada, // Use actual period from declaration
    academicYear: academicYear,
    semester: semester,
    faculty: user.faculty || declaration.faculty || 'Inginerie', // Use user's faculty or declaration faculty
    department: user.department || declaration.department || 'Calculatoare și Inginerie Electrică',
    activitati: declaration.activitati || [],
    status: declaration.status,
    createdAt: declaration.createdAt,
    items: items
  };

  console.log('📋 FINAL declaration data being sent to backend:', declarationData);
  console.log('🎯 Items being sent:', declarationData.items);

  // Prepare the request body
  const requestBody = {
    ...finalOptions,
    declarationData: declarationData
  };

  console.log('🚀 Sending request to backend with body:', requestBody);

  return this.http.post(`${this.apiUrl}/pdf/enhanced/${declarationId}`, requestBody, {
    responseType: 'blob',
    withCredentials: true
  }).pipe(
    catchError(this.handleError)
  );
}

  /**
   * Transform saved hours array from localStorage to items format expected by PDF service
   */
  private transformSavedHoursToItems(savedHours: any[]): any[] {
    console.log('🔄 Transforming savedHours to items:', savedHours);
    
    const transformed = savedHours
      .filter(hour => {
        // Include rows that have meaningful data - either hours or a discipline name
        const hasHours = hour && (
          (hour.c && parseInt(hour.c) > 0) ||
          (hour.s && parseInt(hour.s) > 0) ||
          (hour.la && parseInt(hour.la) > 0) ||
          (hour.p && parseInt(hour.p) > 0)
        );
        const hasContent = hour && (hour.post || hour.grupa || hour.data);
        
        console.log('🔍 Filtering row:', { hour, hasHours, hasContent, include: hasHours || hasContent });
        return hasHours || hasContent;
      })
      .map((hour, index) => {
        const courseHours = parseInt(hour.c || '0');
        const seminarHours = parseInt(hour.s || '0');
        const labHours = parseInt(hour.la || '0');
        const projectHours = parseInt(hour.p || '0');
        
        // Calculate total hours if not provided or if provided value is incorrect
        const calculatedTotal = courseHours + seminarHours + labHours + projectHours;
        const providedTotal = parseInt(hour.nrOre || '0');
        const totalHours = providedTotal > 0 ? providedTotal : calculatedTotal;
        
        const item = {
          date: hour.data || new Date().toISOString().split('T')[0],
          disciplineName: hour.post || 'Disciplină',
          activityType: hour.tip || 'LR',
          groups: hour.grupa || 'Grupa 1',
          courseHours: courseHours,
          seminarHours: seminarHours,
          labHours: labHours,
          projectHours: projectHours,
          totalHours: totalHours,
          coefficient: parseFloat(hour.coef || '1')
        };
        
        console.log('✅ Transformed item:', item);
        return item;
      });
    
    console.log(`🔄 Transformation complete: ${savedHours.length} → ${transformed.length} items`);
    return transformed;
  }

  /**
   * Transform activitati array to items format expected by PDF service
   */
  private transformActivitiesToItems(activitati: any[]): any[] {
    console.log('🔄 Transforming activities to items:', activitati);
    
    return activitati.map((activitate, index) => {
      const item = {
        date: activitate.data || activitate.date || new Date().toISOString().split('T')[0],
        disciplineName: activitate.post || activitate.disciplina || activitate.disciplineName || activitate.subject || 'Disciplină necunoscută',
        activityType: activitate.tip || activitate.activityType || activitate.tipActivitate || 'Curs',
        groups: activitate.grupa || activitate.groups || activitate.grupe || 'Grupa 1',
        courseHours: parseInt(activitate.c || activitate.oreCurs || activitate.courseHours || '0'),
        seminarHours: parseInt(activitate.s || activitate.oreSeminar || activitate.seminarHours || '0'),
        labHours: parseInt(activitate.la || activitate.oreLaborator || activitate.labHours || '0'),
        projectHours: parseInt(activitate.p || activitate.oreProiect || activitate.projectHours || '0'),
        totalHours: parseInt(activitate.nrOre || activitate.totalHours || '0'),
        coefficient: parseFloat(activitate.coef || activitate.coeficient || activitate.coefficient || '1')
      };
      
      // Calculate total hours if not provided
      if (!item.totalHours) {
        item.totalHours = item.courseHours + item.seminarHours + item.labHours + item.projectHours;
      }
      
      console.log(`✅ Transformed activity ${index}:`, item);
      return item;
    });
  }

  /**
   * Transform teaching hours data to items format expected by PDF service
   */
  private transformTeachingHoursToItems(teachingHours: any[]): any[] {
    console.log('🔄 Transforming teaching hours to items:', {
      inputCount: teachingHours.length,
      sampleInput: teachingHours.slice(0, 2)
    });
    
    const transformed = teachingHours
      .filter(hour => {
        const hasHours = hour && (hour.courseHours || hour.seminarHours || hour.labHours || hour.projectHours || hour.totalHours || 
                                 hour.oreCurs || hour.oreSeminar || hour.oreLaborator || hour.oreProiect || hour.c || hour.s || hour.la || hour.p);
        console.log('✅ Filtering hour:', { hour, hasHours });
        return hasHours;
      })
      .map((hour, index) => {
        const courseHours = parseInt(hour.courseHours || hour.oreCurs || hour.c || '0');
        const seminarHours = parseInt(hour.seminarHours || hour.oreSeminar || hour.s || '0');
        const labHours = parseInt(hour.labHours || hour.oreLaborator || hour.la || '0');
        const projectHours = parseInt(hour.projectHours || hour.oreProiect || hour.p || '0');
        const totalCalculated = courseHours + seminarHours + labHours + projectHours;
        
        const item = {
          date: hour.date || hour.data || new Date().toISOString().split('T')[0],
          disciplineName: hour.disciplineName || hour.disciplina || hour.subject || hour.post || hour.materie || 'Disciplină necunoscută',
          activityType: hour.activityType || hour.tipActivitate || hour.tip || 'Curs',
          groups: hour.group || hour.groups || hour.grupa || hour.grupe || 'Grupa 1',
          courseHours: courseHours,
          seminarHours: seminarHours,
          labHours: labHours,
          projectHours: projectHours,
          totalHours: parseInt(hour.totalHours || hour.nrOre || totalCalculated || '0'),
          coefficient: parseFloat(hour.coefficient || hour.coeficient || hour.coef || '1')
        };
        
        console.log(`✅ Transformed teaching hour ${index}:`, item);
        return item;
      });

    console.log('🎯 Final transformed teaching hours:', transformed);
    return transformed;
  }

  /**
   * Transform ListaOre data to items format expected by PDF service
   */
  private transformListaOreToItems(listaOreData: any[]): any[] {
    return listaOreData
      .filter(entry => entry && (entry.c || entry.s || entry.la || entry.p || entry.nrOre)) // Only include entries with actual hours
      .map((entry, index) => ({
        date: entry.data,
        disciplineName: entry.post || entry.disciplina || 'Disciplină',
        activityType: entry.tip || 'LR',
        groups: entry.grupa || entry.an || '',
        courseHours: parseInt(entry.c || '0'),
        seminarHours: parseInt(entry.s || '0'),
        labHours: parseInt(entry.la || '0'),
        projectHours: parseInt(entry.p || '0'),
        totalHours: parseInt(entry.nrOre || '0'),
        coefficient: parseFloat(entry.coef || '1')
      }));
  }

  /**
   * Get academic year from date string
   */
  private getAcademicYearFromDate(dateStr: string): string {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // Academic year logic based on specific semester boundaries:
    // 2025/2026: 1st semester 10/01/2025-01/31/2026, 2nd semester 02/01/2026-06/30/2026
    
    // If date is in October or later, it's the start of the academic year
    if (month >= 10) {
      return `${year}/${year + 1}`;
    } 
    // If date is January (up to 31st), it's continuation of academic year that started in previous October
    else if (month === 1) {
      return `${year - 1}/${year}`;
    }
    // If date is February 1st through June 30th, it's the second semester of academic year that started in previous October
    else if (month >= 2 && month <= 6) {
      return `${year - 1}/${year}`;
    }
    // If date is July-September, it's typically summer break or end of previous academic year
    else {
      return `${year - 1}/${year}`;
    }
  }

  /**
   * Get semester from date string based on specific boundaries
   */
  private getSemesterFromDate(dateStr: string): number {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // Semester logic based on specific boundaries:
    // 1st semester: October 1st - January 31st
    // 2nd semester: February 1st - June 30th
    
    if (month >= 10 || month === 1) {
      return 1;
    } else if (month >= 2 && month <= 6) {
      return 2;
    } else {
      // July-September: typically end of academic year, default to semester 2
      return 2;
    }
  }

  /**
   * Generate multiple PDFs in batch
   */
  generateBatchPDFs(request: BatchPDFRequest): Observable<BatchPDFResult> {
    return this.http.post<BatchPDFResult>(`${this.apiUrl}/pdf/batch`, request, {
      withCredentials: true
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Generate summary report PDF
   */
  generateSummaryReport(academicYear: string, semester: number, options: any = {}): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/pdf/summary/${academicYear}/${semester}`, options, {
      responseType: 'blob',
      withCredentials: true
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get data preview for a declaration
   */
  getDataPreview(declarationId: string): Observable<DataPreview> {
    return this.http.get<DataPreview>(`${this.apiUrl}/payment/${declarationId}/data-preview`, {
      withCredentials: true
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get certificate information
   */
  getCertificateInfo(): Observable<CertificateInfo> {
    return this.http.get<CertificateInfo>(`${this.apiUrl}/pdf/certificate/info`, {
      withCredentials: true
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get available templates
   */
  getTemplateInfo(): Observable<TemplateInfo> {
    return this.http.get<TemplateInfo>(`${this.apiUrl}/pdf/templates`, {
      withCredentials: true
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Verify document signature
   */
  verifySignature(documentId: string): Observable<SignatureVerification> {
    return this.http.get<SignatureVerification>(`${this.apiUrl}/pdf/verify/${documentId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Initialize test certificate (development only)
   */
  initializeTestCertificate(): Observable<any> {
    return this.http.post(`${this.apiUrl}/pdf/certificate/init-test`, {}, {
      withCredentials: true
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Download blob as file
   */
  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Open blob in new window
   */
  openBlobInNewWindow(blob: Blob): void {
    const url = window.URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      // Fallback to download if popup blocked
      const link = document.createElement('a');
      link.href = url;
      link.download = 'document.pdf';
      
      // Ensure document.body exists before appending
      if (document.body) {
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Alternative fallback - create a click event without appending to DOM
        const event = new MouseEvent('click');
        link.dispatchEvent(event);
      }
    }
    // Clean up URL after a delay
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  }

  /**
   * Convert blob to base64
   */
  blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remove data:application/pdf;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Get file size in human readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Fetch teaching hours for a specific academic period
   */
  /**
 * Fetch teaching hours for a specific academic period
 */
private async fetchTeachingHoursForPeriod(year: string, semester: number): Promise<any[]> {
  console.log('🔍 Fetching teaching hours for:', { year, semester });
  
  try {
    // Get current user to filter by userId
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const userId = currentUser.id || currentUser._id;
    
    console.log('👤 Current user ID:', userId);
    
    // First try to get from localStorage (teachingHours key)
    const localData = this.tryGetFromLocalStorage(year, semester, userId);
    if (localData && localData.length > 0) {
      console.log('📋 Using teaching hours from localStorage:', localData.length, 'records');
      return localData;
    }
    
    // If not in localStorage or empty, fetch from API
    console.log('🌐 Fetching teaching hours from API...');
    const apiUrl = `${environment.apiUrl}/teaching-hours`;
    const params: any = {
      academicYear: year,
      semester: semester.toString(),
      limit: '1000'
    };
    
    // Add userId to filter if available
    if (userId) {
      params.userId = userId;
    }
    
    const response = await this.http.get<{ records: any[] }>(apiUrl, {
      params,
      withCredentials: true
    }).toPromise();
    
    const teachingHours = response?.records || [];
    console.log('📊 Fetched teaching hours from API:', teachingHours.length, 'records');
    
    // Save to localStorage for future use
    if (teachingHours.length > 0) {
      localStorage.setItem('teachingHours', JSON.stringify(teachingHours));
      console.log('💾 Saved teaching hours to localStorage');
    }
    
    return teachingHours;
    
  } catch (error) {
    console.error('❌ Error fetching teaching hours:', error);
    // Fall back to localStorage even if API fails
    return this.tryGetFromLocalStorage(year, semester);
  }
}

/**
 * Try to get teaching hours from localStorage with various key formats
 */
private tryGetFromLocalStorage(year: string, semester: number, userId?: string): any[] {
  console.log('🔍 Trying to get teaching hours from localStorage for:', { year, semester, userId });
  
  // Try different possible key formats for teaching hours
  const possibleKeys = [
    'teachingHours',
    'listaOre',
    `listaOre_${year}`,
    `listaOre_${year}_${semester}`,
    `teachingHours_${year}`,
    `teachingHours_${year}_${semester}`
  ];
  
  let teachingHours: any[] = [];
  
  for (const key of possibleKeys) {
    try {
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          teachingHours = parsed;
          console.log(`📋 Using teaching hours from "${key}":`, teachingHours.length, 'records');
          break;
        }
      }
    } catch (e) {
      console.log(`❌ Error parsing "${key}":`, e);
    }
  }
  
  if (teachingHours.length === 0) {
    console.log('⚠️ No teaching hours found in localStorage');
    return [];
  }
  
  // Filter by year, semester, and optionally userId
  const filtered = teachingHours.filter(hour => {
    const yearMatch = !hour.academicYear || hour.academicYear === year;
    const semesterMatch = !hour.semester || hour.semester == semester;
    const userMatch = !userId || !hour.userId || hour.userId === userId;
    
    return yearMatch && semesterMatch && userMatch;
  });
  
  console.log(`📊 Filtered teaching hours: ${filtered.length} out of ${teachingHours.length} total`);
  return filtered;
}

  /**
   * Handle HTTP errors
   */
  private handleError(error: any) {
    console.error('Enhanced PDF Service Error:', error);
    
    let errorMessage = 'A apărut o eroare necunoscută';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Eroare: ${error.error.message}`;
    } else {
      // Server-side error
      if (error.status === 401) {
        errorMessage = 'Nu sunteți autentificat. Vă rugăm să vă conectați din nou.';
      } else if (error.status === 403) {
        errorMessage = 'Nu aveți permisiunile necesare pentru această operație.';
      } else if (error.status === 404) {
        errorMessage = 'Documentul solicitat nu a fost găsit.';
      } else if (error.status === 500) {
        errorMessage = 'Eroare internă a serverului. Vă rugăm încercați din nou mai târziu.';
      } else if (error.error && error.error.message) {
        errorMessage = error.error.message;
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }
}
