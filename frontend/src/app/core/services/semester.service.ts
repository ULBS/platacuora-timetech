import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SemesterDates {
  start: string;
  end: string;
}

export interface SemesterConfig {
  _id?: string;
  academicYear: string;
  semester: number;
  faculty: string;
  startDate: string;
  endDate: string;
  isMedicine?: boolean;
  weeks?: any[];
  specialWeeks?: any[];
  status?: string;
  createdBy?: any;
}

@Injectable({
  providedIn: 'root',
})
export class SemesterService {
  private baseUrl = 'http://localhost:5000/api/semester';


 private getAuthHeaders(): HttpHeaders {
  const user = localStorage.getItem('currentUser');
  const token = user ? JSON.parse(user).token : null;
  
  const headers = new HttpHeaders({
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  });

  console.log('Token folosit:', token);
  console.log('Headers generate:', headers);

  return headers;
}


  constructor(private http: HttpClient) {}

  getAllConfigs(): Observable<SemesterConfig[]> {
    return this.http.get<SemesterConfig[]>(`${this.baseUrl}`);
  }

  getConfigById(id: string): Observable<SemesterConfig> {
    return this.http.get<SemesterConfig>(`${this.baseUrl}/${id}`);
  }

  getCurrentConfig(faculty?: string): Observable<SemesterConfig> {
    const url = faculty
      ? `${this.baseUrl}/current?faculty=${faculty}`
      : `${this.baseUrl}/current`;
    return this.http.get<SemesterConfig>(url);
  }

  createConfig(config: SemesterConfig): Observable<SemesterConfig> {
    return this.http.post<SemesterConfig>(this.baseUrl, config, {
      headers: this.getAuthHeaders()
    });
  }

  updateConfig(id: string, updates: Partial<SemesterConfig>): Observable<SemesterConfig> {
    return this.http.put<SemesterConfig>(`${this.baseUrl}/${id}`, updates, {
      headers: this.getAuthHeaders()
    });
  }

  deleteConfig(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  generateWeeks(id: string, oddWeekStart = true): Observable<any> {
    return this.http.post(`${this.baseUrl}/${id}/generate-weeks`, { oddWeekStart }, {
      headers: this.getAuthHeaders()
    });
  }

  validateCalendar(id: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${id}/validate-calendar`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  activateConfig(id: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}/activate`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  addVacationPeriod(id: string, period: { name: string; startDate: string; endDate: string; type?: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/${id}/vacation-periods`, period, {
      headers: this.getAuthHeaders()
    });
  }

  getWeekInfo(id: string, date: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}/week-info?date=${date}`, {
      headers: this.getAuthHeaders()
    });
  }

  getConfigsByFaculty(faculty: string, year?: string, semester?: number, status?: string): Observable<SemesterConfig[]> {
    let query = '';
    if (year) query += `&year=${year}`;
    if (semester) query += `&semester=${semester}`;
    if (status) query += `&status=${status}`;
    return this.http.get<SemesterConfig[]>(`${this.baseUrl}/faculty/${faculty}?${query.substring(1)}`, {
      headers: this.getAuthHeaders()
    });
  }

  getSemesterDates(): Observable<SemesterDates> {
    return this.http.get<SemesterDates>(`/api/calendar/semester-dates`, {
      headers: this.getAuthHeaders()
    });
  }

  saveSemesterDates(data: SemesterDates): Observable<any> {
    return this.http.post(`/api/calendar/semester-dates`, data, {
      headers: this.getAuthHeaders()
    });
  }


  updateSemesterConfig(configId: string, data: any) {
  return this.http.put(`/api/semester/${configId}`, data);
}

}
