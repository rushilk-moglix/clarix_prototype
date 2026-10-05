import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { ConfirmDialogService } from '../../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { GenbiSchemaService } from '../../services/genbi-schema.service';
import { StoredSchema } from '../../models/schema.model';
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
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly schemaService = inject(GenbiSchemaService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly destroy$ = new Subject<void>();

  protected readonly loading = signal(false);
  protected readonly schemas = signal<StoredSchema[]>([]);
  protected readonly filteredSchemas = signal<StoredSchema[]>([]);
  
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
          this.schemas.set(schemas);
          this.filterSchemas();
        },
        error: (error) => {
          console.error('Failed to load schemas:', error);
          this.schemas.set([]);
          this.filteredSchemas.set([]);
        }
      });
  }

  filterSchemas(): void {
    let filtered = [...this.schemas()];

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(schema =>
        schema.schema.database.toLowerCase().includes(term) ||
        schema.schema.description.toLowerCase().includes(term) ||
        schema.uploaded_by.toLowerCase().includes(term)
      );
    }

    if (this.statusFilter) {
      filtered = filtered.filter(schema => schema.status === this.statusFilter);
    }

    this.filteredSchemas.set(filtered);
    this.sortSchemas();
  }

  sortSchemas(): void {
    this.filteredSchemas.update(list => {
      const sorted = [...list];
      sorted.sort((a, b) => {
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
      return sorted;
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
    if (!schema.id) return;
    this.router.navigate(['../schemas', schema.id, 'edit'], { 
      relativeTo: this.route,
      queryParams: { mode: 'view' } 
    });
    this.activeDropdown = null;
  }

  activateSchema(schema: StoredSchema): void {
    if (!schema.id) return;
    
    this.loading.set(true);
    this.schemaService.activateSchema(schema.id)
      .pipe(
        takeUntil(this.destroy$),
        timeout(10000)
        // finalize handled by loadSchemas
      )
      .subscribe({
        next: () => {
          this.loadSchemas();
        },
        error: (error) => {
          this.loading.set(false);
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

    if (schema.status === 'ACTIVE') {
      alert('Active schemas cannot be deleted. Please archive or version it first.');
      return;
    }

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
        timeout(10000)
        // finalize handled by loadSchemas or error
      )
      .subscribe({
        next: () => {
          // Optimistic update
          this.schemas.update(list => list.filter(s => s.id !== schema.id));
          this.filterSchemas();
          // Background reload
          this.loadSchemas();
        },
        error: (error) => {
          this.loading.set(false);
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
