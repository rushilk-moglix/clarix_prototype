import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { GenbiSchemaService } from '../../services/genbi-schema.service';
import { StoredSchema, ChunkStats } from '../../models/schema.model';
import { Subject, forkJoin, timeout } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

@Component({
  selector: 'app-genbi-analytics',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './genbi-analytics.component.html',
  styleUrl: './genbi-analytics.component.scss'
})
export class GenbiAnalyticsComponent implements OnInit, OnDestroy {
  private readonly schemaService = inject(GenbiSchemaService);
  private readonly destroy$ = new Subject<void>();

  protected readonly loading = signal(false);
  protected readonly totalSchemas = signal(0);
  protected readonly activeSchemas = signal(0);
  protected readonly chunkStats = signal<ChunkStats | null>(null);
  protected readonly statusDistribution = signal<Array<{status: string, count: number, percentage: number}>>([]);
  protected readonly recentActivity = signal<Array<{type: string, title: string, timestamp: string}>>([]);
  protected readonly totalCollections = signal(0);
  protected readonly averageCollectionsPerSchema = signal(0);
  protected readonly mostComplexSchema = signal<{name: string, collections: number} | null>(null);
  protected readonly latestUpload = signal('');

  ngOnInit(): void {
    this.loadAnalytics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadAnalytics(): void {
    this.loading.set(true);

    forkJoin({
      schemas: this.schemaService.getSchemas(),
      chunkStats: this.schemaService.getChunkStats()
    })
    .pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.loading.set(false);
      })
    )
    .subscribe({
      next: ({ schemas, chunkStats }: { schemas: StoredSchema[], chunkStats: ChunkStats }) => {
        this.analyzeSchemas(schemas);
        this.chunkStats.set(chunkStats);
      },
      error: (error: any) => {
        console.error('Failed to load analytics data:', error);
      }
    });
  }

  private analyzeSchemas(schemas: StoredSchema[]): void {
    const totalCount = schemas.length;
    this.totalSchemas.set(totalCount);
    this.activeSchemas.set(schemas.filter(s => s.status === 'ACTIVE').length);

    const statusCounts = schemas.reduce((acc, schema) => {
      acc[schema.status] = (acc[schema.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    this.statusDistribution.set(Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      percentage: totalCount > 0 ? (count / totalCount) * 100 : 0
    })));

    const allCollections = schemas.flatMap(s => s.schema.collections);
    this.totalCollections.set(allCollections.length);
    this.averageCollectionsPerSchema.set(totalCount > 0 
      ? Math.round(allCollections.length / totalCount * 10) / 10 
      : 0);

    if (schemas.length > 0) {
      const complex = schemas.reduce((max, schema) => 
        schema.schema.collections.length > max.collections 
          ? { name: schema.schema.database, collections: schema.schema.collections.length }
          : max
      , { name: '', collections: 0 });
      
      this.mostComplexSchema.set(complex.collections > 0 ? complex : null);

      const latest = schemas.reduce((latest, schema) => 
        new Date(schema.uploaded_at) > new Date(latest.uploaded_at) ? schema : latest
      );
      this.latestUpload.set(latest.uploaded_at);
    }

    this.recentActivity.set(schemas
      .slice(0, 5)
      .map((schema, index) => ({
        type: index % 3 === 0 ? 'upload' : index % 3 === 1 ? 'validate' : 'activate',
        title: `${schema.schema.database} schema ${index % 3 === 0 ? 'uploaded' : index % 3 === 1 ? 'validated' : 'activated'}`,
        timestamp: schema.uploaded_at
      })));
  }

  getStatusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }

  getActivityIconClass(type: string): string {
    return type;
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'upload': return 'upload';
      case 'validate': return 'check-circle-2';
      case 'activate': return 'play-circle';
      default: return 'circle';
    }
  }

  formatRelativeTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }
}
