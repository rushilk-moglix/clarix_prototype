import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, forkJoin, timeout } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { ChunkStats, SchemaStatus, StoredSchema } from '../../models/schema.model';
import { GenbiSchemaService } from '../../services/genbi-schema.service';

@Component({
  selector: 'app-genbi-overview',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './genbi-overview.component.html',
  styleUrl: './genbi-overview.component.scss'
})
export class GenbiOverviewComponent implements OnInit, OnDestroy {
  private readonly schemaService = inject(GenbiSchemaService);
  private readonly destroy$ = new Subject<void>();

  protected readonly loading = signal(false);
  totalSchemas = 0;
  activeSchemas = 0;
  draftSchemas = 0;
  recentSchemas: StoredSchema[] = [];
  chunkStats: ChunkStats | null = null;

  ngOnInit(): void {
    this.loadOverviewData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadOverviewData(): void {
    this.loading.set(true);

    // Use forkJoin to wait for all API calls to complete
    forkJoin({
      schemas: this.schemaService.getSchemas(),
      chunkStats: this.schemaService.getChunkStats()
    })
      .pipe(
        takeUntil(this.destroy$),
        timeout(10000), // Prevent hanging loaders
        finalize(() => {
          this.loading.set(false);
        })
      )
      .subscribe({
        next: ({ schemas, chunkStats }) => {
          // Handle unexpected response formats
          const schemaArray = Array.isArray(schemas) ? schemas : [];

          // Process schemas data
          this.totalSchemas = schemaArray.length;
          this.activeSchemas = schemaArray.filter(s => s.status === SchemaStatus.ACTIVE).length;
          this.draftSchemas = schemaArray.filter(s => s.status === SchemaStatus.DRAFT).length;

          // Get recent schemas (last 5, sorted by upload date)
          this.recentSchemas = [...schemaArray]
            .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
            .slice(0, 5);

          // Process chunk stats
          this.chunkStats = chunkStats;
        },
        error: (error) => {
          console.error('Failed to load overview data:', error);
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
