import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../enviroments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  /**
   * GET request to the API
   * @param endpoint - API endpoint path
   * @param params - Optional query parameters
   * @returns Observable of response
   */
  get<T>(endpoint: string, params?: any): Observable<T> {
    const options = { 
      params: this.createHttpParams(params),
      withCredentials: true // Include credentials for cookie auth
    };
    return this.http.get<T>(`${this.apiUrl}/${endpoint}`, options)
      .pipe(catchError(this.handleError));
  }

  /**
   * POST request to the API
   * @param endpoint - API endpoint path
   * @param body - Request body
   * @returns Observable of response
   */
  post<T>(endpoint: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.apiUrl}/${endpoint}`, body, { withCredentials: true })
      .pipe(catchError(this.handleError));
  }

  /**
   * PUT request to the API
   * @param endpoint - API endpoint path
   * @param body - Request body
   * @returns Observable of response
   */
  put<T>(endpoint: string, body: any): Observable<T> {
    return this.http.put<T>(`${this.apiUrl}/${endpoint}`, body, { withCredentials: true })
      .pipe(catchError(this.handleError));
  }

  /**
   * DELETE request to the API
   * @param endpoint - API endpoint path
   * @param id - Optional ID to delete
   * @returns Observable of response
   */
  delete<T>(endpoint: string, id?: string): Observable<T> {
    const url = id ? `${this.apiUrl}/${endpoint}/${id}` : `${this.apiUrl}/${endpoint}`;
    return this.http.delete<T>(url, { withCredentials: true })
      .pipe(catchError(this.handleError));
  }

  /**
   * Convert params object to HttpParams
   */
  private createHttpParams(params: any): HttpParams {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return httpParams;
  }

  /**
   * Error handler for API requests
   */
  private handleError(error: any) {
    console.error('API error', error);
    return throwError(() => error);
  }
}
