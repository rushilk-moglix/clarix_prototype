import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  ChunkStats,
  StoredSchema,
  ValidationResult
} from '../models/schema.model';

@Injectable({
  providedIn: 'root'
})
export class GenbiSchemaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.backendServices.genbi.baseURL}${environment.genbiApi.baseUrl}/schema`;

  /**
   * Upload a new schema file
   */
  uploadSchema(file: File): Observable<StoredSchema> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<StoredSchema>(`${this.baseUrl}/upload`, formData)
      .pipe(catchError(this.handleError));
  }

  /**
   * Get list of all schemas
   */
  getSchemas(): Observable<StoredSchema[]> {
    const url = `${this.baseUrl}/`;
    console.log('Fetching schemas from:', url);
    return this.http.get<StoredSchema[]>(url)
      .pipe(catchError(this.handleError));
  }

  /**
   * Get a specific schema by ID
   */
  getSchema(schemaId: string): Observable<StoredSchema> {
    return this.http.get<StoredSchema>(`${this.baseUrl}/${schemaId}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Update an existing schema
   */
  updateSchema(schemaId: string, schema: any): Observable<StoredSchema> {
    return this.http.put<StoredSchema>(`${this.baseUrl}/${schemaId}`, schema)
      .pipe(catchError(this.handleError));
  }

  /**
   * Delete a schema
   */
  deleteSchema(schemaId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${schemaId}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Activate a schema
   */
  activateSchema(schemaId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/${schemaId}/activate`, {})
      .pipe(catchError(this.handleError));
  }

  /**
   * Archive a schema
   */
  archiveSchema(schemaId: string): Observable<StoredSchema> {
    return this.http.post<StoredSchema>(`${this.baseUrl}/${schemaId}/archive`, {})
      .pipe(catchError(this.handleError));
  }

  /**
   * Test execute an example query
   */
  testExampleQuery(database: string, collection: string, ql: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/test-query`, {
      database,
      collection,
      QL: ql
    }).pipe(catchError(this.handleError));
  }

  /**
   * Validate schema against live database
   */
  validateSchemaLive(schemaId: string): Observable<ValidationResult> {
    return this.http.post<ValidationResult>(`${this.baseUrl}/${schemaId}/validate-live`, {})
      .pipe(catchError(this.handleError));
  }

  /**
   * Get active schema for a database
   */
  getActiveSchema(database: string): Observable<StoredSchema> {
    return this.http.get<StoredSchema>(`${this.baseUrl}/active/${database}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Get chunk statistics
   */
  getChunkStats(): Observable<ChunkStats> {
    return this.http.get<ChunkStats>(`${this.baseUrl}/chunks/stats`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      if (error.error?.detail) {
        errorMessage = error.error.detail;
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      } else {
        errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      }
    }

    console.error('GenbiSchemaService Error:', errorMessage);
    return throwError(() => errorMessage);
  }
}