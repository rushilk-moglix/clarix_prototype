import { ChangeDetectionStrategy, Component, computed, inject, resource } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { DashboardService } from '../../services/dashboard.service';
import { DashboardData, HourlyBar } from '../../models/dashboard.model';

@Component({
  selector: 'app-dashboard-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
  templateUrl: './dashboard-overview.component.html',
  styleUrl: './dashboard-overview.component.scss'
})
export class DashboardOverviewComponent {
  private readonly dashboardService = inject(DashboardService);

  protected readonly dashboardResource = resource({
    loader: () => firstValueFrom(this.dashboardService.getDashboard())
  });

  protected readonly data = computed((): DashboardData | null => {
    return this.dashboardResource.value() ?? null;
  });

  protected readonly chartBars = computed((): HourlyBar[] => {
    const d = this.data();
    if (!d) return [];
    const map = new Map<number, HourlyBar>();
    for (const item of d.volumeChart) {
      if (!map.has(item.hour)) {
        map.set(item.hour, { hour: item.hour, today: 0, yesterday: 0 });
      }
      const bar = map.get(item.hour)!;
      if (item.day === 'today') bar.today = item.count;
      else bar.yesterday = item.count;
    }
    return [...map.values()].sort((a, b) => a.hour - b.hour);
  });

  protected readonly maxBarCount = computed(() => {
    const bars = this.chartBars();
    if (!bars.length) return 1;
    return Math.max(...bars.flatMap(b => [b.today, b.yesterday]), 1);
  });

  protected readonly totalDistribution = computed(() =>
    this.data()?.callDistribution.reduce((s, i) => s + i.count, 0) ?? 0
  );

  protected readonly totalDirection = computed(() =>
    this.data()?.direction.reduce((s, i) => s + i.count, 0) ?? 0
  );

  protected formatTime(seconds: number | null | undefined): string {
    if (seconds == null) return '0s';
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  protected formatHour(hour: number): string {
    if (hour === 0) return '12am';
    if (hour < 12) return `${hour}am`;
    if (hour === 12) return '12pm';
    return `${hour - 12}pm`;
  }

  protected formatCount(n: number): string {
    return n.toLocaleString();
  }

  protected capitalize(s: string): string {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  }

  protected statusColor(status: string): string {
    const colors: Record<string, string> = {
      COMPLETED:   '#10b981',
      FAILED:      '#ef4444',
      IN_PROGRESS: '#3b82f6',
      INITIATED:   '#8b5cf6',
      NO_ANSWER:   '#f59e0b',
      BUSY:        '#f97316',
      VOICEMAIL:   '#6b645b',
    };
    return colors[status] ?? '#6b645b';
  }

  protected pct(count: number, total: number): number {
    return total > 0 ? Math.round((count / total) * 100) : 0;
  }

  protected barHeight(count: number): number {
    return (count / this.maxBarCount()) * 120;
  }

  protected refresh(): void {
    this.dashboardResource.reload();
  }
}
