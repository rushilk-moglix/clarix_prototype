import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { GenbiSchemaService } from '../../services/genbi-schema.service';
import { StoredSchema } from '../../models/schema.model';
import { Subject, timeout } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

@Component({
  selector: 'app-schema-validation',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
  templateUrl: './schema-validation.component.html',
  styleUrl: './schema-validation.component.scss'
})
export class SchemaValidationComponent implements OnInit, OnDestroy {
  private readonly schemaService = inject(GenbiSchemaService);
  private readonly destroy$ = new Subject<void>();

  protected readonly loading = signal(false);
  schemas: StoredSchema[] = [];
  filteredSchemas: StoredSchema[] = [];
  statusFilter = '';
  validatingSchemas = new Set<string>();

  // Stats
  totalSchemas = 0;
  validatedSchemas = 0;
  pendingValidation = 0;
  failedValidation = 0;

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
          this.calculateStats();
          this.filterSchemas();
        },
        error: (error) => {
          console.error('Failed to load schemas:', error);
          this.schemas = [];
          this.filteredSchemas = [];
          this.calculateStats();
        }
      });
  }

  private calculateStats(): void {
    this.totalSchemas = this.schemas.length;
    this.validatedSchemas = this.schemas.filter(s => 
      s.live_validation_result && s.live_validation_result.valid
    ).length;
    this.pendingValidation = this.schemas.filter(s => 
      !s.live_validation_result
    ).length;
    this.failedValidation = this.schemas.filter(s => 
      s.live_validation_result && !s.live_validation_result.valid
    ).length;
  }

  filterSchemas(): void {
    let filtered = [...this.schemas];

    if (this.statusFilter) {
      filtered = filtered.filter(schema => schema.status === this.statusFilter);
    }

    filtered.sort((a, b) => {
      const aValidated = !!a.live_validation_result;
      const bValidated = !!b.live_validation_result;
      
      if (aValidated !== bValidated) {
        return aValidated ? 1 : -1;
      }
      
      return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
    });

    this.filteredSchemas = filtered;
  }

  clearFilter(): void {
    this.statusFilter = '';
    this.filterSchemas();
  }

  validateSchema(schema: StoredSchema): void {
    if (!schema.id || this.validatingSchemas.has(schema.id)) return;
    
    this.validatingSchemas.add(schema.id);
    
    this.schemaService.validateSchemaLive(schema.id)
      .pipe(
        takeUntil(this.destroy$),
        timeout(30000),
        finalize(() => {
          this.validatingSchemas.delete(schema.id!);
        })
      )
      .subscribe({
        next: (result) => {
          const schemaIndex = this.schemas.findIndex(s => s.id === schema.id);
          if (schemaIndex !== -1) {
            this.schemas[schemaIndex].live_validation_result = result;
            this.calculateStats();
            this.filterSchemas();
          }
        },
        error: (error) => {
          console.error('Failed to validate schema:', error);
        }
      });
  }

  activateSchema(schema: StoredSchema): void {
    if (!schema.id) return;
    
    this.schemaService.activateSchema(schema.id)
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => {
          this.loadSchemas();
        },
        error: (error) => {
          console.error('Failed to activate schema:', error);
        }
      });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
}
