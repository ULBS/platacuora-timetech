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
  generateEnhancedPDF(declarationId: string, options: PDFOptions = {}): Observable<Blob> {
    const defaultOptions: PDFOptions = {
      enhanced: true,
      includeQR: true,
      includeWatermark: false,
      digitalSignature: false,
      template: 'ulbs-official'
    };

    const finalOptions = { ...defaultOptions, ...options };

    return this.http.post(`${this.apiUrl}/pdf/enhanced/${declarationId}`, finalOptions, {
      responseType: 'blob',
      withCredentials: true
    }).pipe(
      catchError(this.handleError)
    );
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
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
