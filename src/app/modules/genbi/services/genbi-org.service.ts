import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  Organization,
  OrganizationCreate,
  OrganizationUpdate,
  OrgDatabase,
  OrgStats,
  QuotaResult
} from '../models/org.model';

@Injectable({
  providedIn: 'root'
})
export class GenbiOrgService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.backendServices.genbi.baseURL}${environment.genbiApi.baseUrl}/organizations`;

  listOrganizations(skip = 0, limit = 50, activeOnly?: boolean, search?: string): Observable<Organization[]> {
    let params = new HttpParams().set('skip', skip).set('limit', limit);
    if (activeOnly !== undefined) params = params.set('active_only', activeOnly);
    if (search) params = params.set('search', search);
    return this.http.get<Organization[]>(`${this.baseUrl}/`, { params }).pipe(catchError(this.handleError));
  }

  getOrganization(orgId: string): Observable<Organization> {
    return this.http.get<Organization>(`${this.baseUrl}/${orgId}`).pipe(catchError(this.handleError));
  }

  getOrganizationBySlug(slug: string): Observable<Organization> {
    return this.http.get<Organization>(`${this.baseUrl}/slug/${slug}`).pipe(catchError(this.handleError));
  }

  getStats(): Observable<OrgStats> {
    return this.http.get<OrgStats>(`${this.baseUrl}/stats`).pipe(catchError(this.handleError));
  }

  createOrganization(body: OrganizationCreate): Observable<Organization> {
    return this.http.post<Organization>(`${this.baseUrl}/`, body).pipe(catchError(this.handleError));
  }

  updateOrganization(orgId: string, body: OrganizationUpdate): Observable<Organization> {
    return this.http.put<Organization>(`${this.baseUrl}/${orgId}`, body).pipe(catchError(this.handleError));
  }

  deleteOrganization(orgId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${orgId}`).pipe(catchError(this.handleError));
  }

  addDatabase(orgId: string, env: string, body: OrgDatabase): Observable<Organization> {
    return this.http.post<Organization>(`${this.baseUrl}/${orgId}/databases/${env}`, body).pipe(catchError(this.handleError));
  }

  removeDatabase(orgId: string, env: string): Observable<Organization> {
    return this.http.delete<Organization>(`${this.baseUrl}/${orgId}/databases/${env}`).pipe(catchError(this.handleError));
  }

  updateSettings(orgId: string, settings: Record<string, unknown>): Observable<Organization> {
    return this.http.put<Organization>(`${this.baseUrl}/${orgId}/settings`, settings).pipe(catchError(this.handleError));
  }

  checkQuota(orgId: string, resource: string, currentUsage?: number): Observable<QuotaResult> {
    let params = new HttpParams();
    if (currentUsage !== undefined) params = params.set('current_usage', currentUsage);
    return this.http.get<QuotaResult>(`${this.baseUrl}/${orgId}/quota/${resource}`, { params }).pipe(catchError(this.handleError));
  }

  healthCheck(): Observable<unknown> {
    return this.http.get<unknown>(`${this.baseUrl}/health/check`).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    const message = error.error?.detail ?? error.error?.message ?? error.message ?? 'An unexpected error occurred';
    return throwError(() => new Error(message));
  }
}
