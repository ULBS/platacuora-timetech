import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../enviroments/environment';

export interface PaymentDeclarationData {
  faculty: string;
  department: string;
  academicYear: string;
  semester: number;
  startDate: string;
  endDate: string;
  items: Array<{
    postNumber?: number;
    postGrade?: string;
    date: string;
    courseHours: number;
    seminarHours: number;
    labHours: number;
    projectHours: number;
    activityType: string;
    coefficient: number;
    totalHours: number;
    groups: string;
  }>;
  title?: string;
  comments?: string;
}

export interface PaymentDeclaration {
  _id: string;
  user: string;
  faculty: string;
  department: string;
  academicYear: string;
  semester: number;
  startDate: string;
  endDate: string;
  title: string;
  items: any[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentDeclarationService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  /**
   * Create a new payment declaration
   */
  createDeclaration(declarationData: PaymentDeclarationData): Observable<PaymentDeclaration> {
    return this.http.post<PaymentDeclaration>(`${this.apiUrl}/payment`, declarationData);
  }

  /**
   * Get all declarations for current user
   */
  getDeclarations(): Observable<PaymentDeclaration[]> {
    return this.http.get<PaymentDeclaration[]>(`${this.apiUrl}/payment`);
  }

  /**
   * Get a specific declaration by ID
   */
  getDeclarationById(id: string): Observable<PaymentDeclaration> {
    return this.http.get<PaymentDeclaration>(`${this.apiUrl}/payment/${id}`);
  }

  /**
   * Update a declaration
   */
  updateDeclaration(id: string, declarationData: Partial<PaymentDeclarationData>): Observable<PaymentDeclaration> {
    return this.http.put<PaymentDeclaration>(`${this.apiUrl}/payment/${id}`, declarationData);
  }

  /**
   * Delete a declaration
   */
  deleteDeclaration(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/payment/${id}`);
  }

  /**
   * Transform frontend table data to backend format
   */
  transformTableDataToItems(tableData: any[]): PaymentDeclarationData['items'] {
    return tableData
      .filter(row => row && (row.c || row.s || row.la || row.p || row.post))
      .map((row, index) => ({
        postNumber: index + 1,
        postGrade: row.post || 'Lector universitar',
        date: row.data,
        courseHours: parseInt(row.c || '0'),
        seminarHours: parseInt(row.s || '0'),
        labHours: parseInt(row.la || '0'),
        projectHours: parseInt(row.p || '0'),
        activityType: row.tip || 'LR',
        coefficient: parseFloat(row.coef || '1'),
        totalHours: parseInt(row.nrOre || '0') || 
          (parseInt(row.c || '0') + parseInt(row.s || '0') + parseInt(row.la || '0') + parseInt(row.p || '0')),
        groups: row.grupa || 'Grupa 1'
      }));
  }

  /**
   * Get academic year from date
   */
  getAcademicYearFromDate(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    
    if (month >= 10) {
      return `${year}/${year + 1}`;
    } else {
      return `${year - 1}/${year}`;
    }
  }

  /**
   * Get semester from date
   */
  getSemesterFromDate(date: Date): number {
    const month = date.getMonth() + 1;
    
    if (month >= 10 || month <= 1) {
      return 1; // October-January = Semester 1
    } else {
      return 2; // February-September = Semester 2
    }
  }
}
