import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { GenbiSchemaService } from '../services/genbi-schema.service';
import { StoredSchema, SchemaStatus } from '../models/schema.model';
import { Subject, timeout } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

@Component({
  selector: 'app-schema-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
  templateUrl: './schema-list.component.html',
  styleUrl: './schema-list.component.scss'
})
export class SchemaListComponent implements OnInit, OnDestroy {
  private readonly schemaService = inject(GenbiSchemaService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly destroy$ = new Subject<void>();

  protected readonly loading = signal(false);
  schemas: StoredSchema[] = [];
  filteredSchemas: StoredSchema[] = [];
  searchTerm = '';
  statusFilter = '';
  sortBy = 'uploaded_at';
  activeDropdown: string | null = null;

  ngOnInit(): void {
    this.loadSchemas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSchemas(): void {
    this.loading.set(true);
    
    this.schemaService.getSchemas()
      .pipe(
        takeUntil(this.destroy$),
        timeout(10000),
        finalize(() => {
          this.loading.set(false);
        })
      )
      .subscribe({
        next: (schemas) => {
          this.schemas = schemas;
          this.filterSchemas();
        },
        error: (error) => {
          console.error('Failed to load schemas:', error);
          this.schemas = [];
          this.filteredSchemas = [];
        }
      });
  }

  filterSchemas(): void {
    let filtered = [...this.schemas];

    // Apply search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(schema =>
        schema.schema.database.toLowerCase().includes(term) ||
        schema.schema.description.toLowerCase().includes(term) ||
        schema.uploaded_by.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (this.statusFilter) {
      filtered = filtered.filter(schema => schema.status === this.statusFilter);
    }

    this.filteredSchemas = filtered;
    this.sortSchemas();
  }

  sortSchemas(): void {
    this.filteredSchemas.sort((a, b) => {
      switch (this.sortBy) {
        case 'uploaded_at':
          return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
        case 'database':
          return a.schema.database.localeCompare(b.schema.database);
        case 'version':
          return b.version - a.version;
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.filterSchemas();
  }

  toggleDropdown(schemaId: string): void {
    this.activeDropdown = this.activeDropdown === schemaId ? null : schemaId;
  }

  viewSchema(schema: StoredSchema): void {
    // TODO: Navigate to schema detail page or show modal
    console.log('View schema:', schema);
    this.activeDropdown = null;
  }

  activateSchema(schema: StoredSchema): void {
    if (!schema.id) return;
    
    this.loading.set(true);
    this.schemaService.activateSchema(schema.id)
      .pipe(
        takeUntil(this.destroy$),
        timeout(10000),
        finalize(() => {
          this.loading.set(false);
        })
      )
      .subscribe({
        next: (response) => {
          console.log('Schema activated:', response.message);
          this.loadSchemas(); // Reload to get updated status
        },
        error: (error) => {
          console.error('Failed to activate schema:', error);
        }
      });
    
    this.activeDropdown = null;
  }

  validateSchema(schema: StoredSchema): void {
    if (!schema.id) return;
    
    this.loading.set(true);
    this.schemaService.validateSchemaLive(schema.id)
      .pipe(
        takeUntil(this.destroy$),
        timeout(30000),
        finalize(() => {
          this.loading.set(false);
        })
      )
      .subscribe({
        next: (result) => {
          console.log('Validation result:', result);
        },
        error: (error) => {
          console.error('Failed to validate schema:', error);
        }
      });
    
    this.activeDropdown = null;
  }

  async deleteSchema(schema: StoredSchema): Promise<void> {
    if (!schema.id) return;
    this.activeDropdown = null;

    const ok = await this.confirm.ask({
      title: 'Delete schema',
      message: `Are you sure you want to delete the schema for ${schema.schema.database}?`,
      confirmText: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;

    this.loading.set(true);
    this.schemaService.deleteSchema(schema.id)
      .pipe(
        takeUntil(this.destroy$),
        timeout(10000),
        finalize(() => {
          this.loading.set(false);
        })
      )
      .subscribe({
        next: (response) => {
          console.log('Schema deleted:', response.message);
          this.loadSchemas(); // Reload list
        },
        error: (error) => {
          console.error('Failed to delete schema:', error);
        }
      });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}