import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { ConfirmDialogService } from '../../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { GenbiOrgService } from '../../services/genbi-org.service';
import { Organization, OrgStats } from '../../models/org.model';

@Component({
  selector: 'app-org-list',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './org-list.component.html',
  styleUrl: './org-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrgListComponent implements OnInit, OnDestroy {
  private readonly orgService = inject(GenbiOrgService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly destroy$ = new Subject<void>();

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly orgs = signal<Organization[]>([]);
  protected readonly stats = signal<OrgStats | null>(null);
  protected readonly showCreateForm = signal(false);
  protected readonly createError = signal<string | null>(null);
  protected readonly deletingId = signal<string | null>(null);
  protected readonly searchTerm = signal('');

  protected readonly filteredOrgs = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.orgs();
    return this.orgs().filter(o =>
      o.name.toLowerCase().includes(term) ||
      o.slug.toLowerCase().includes(term) ||
      (o.admin_email ?? '').toLowerCase().includes(term)
    );
  });

  protected readonly createForm = this.fb.group({
    name: ['', Validators.required],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
    description: [''],
    admin_email: ['', Validators.email]
  });

  ngOnInit(): void {
    this.loadAll();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected toggleCreateForm(): void {
    this.showCreateForm.update(v => !v);
    this.createError.set(null);
    this.createForm.reset();
  }

  protected onCreateSubmit(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    const value = this.createForm.getRawValue();
    this.saving.set(true);
    this.createError.set(null);
    this.orgService.createOrganization({
      name: value.name!,
      slug: value.slug!,
      description: value.description ?? undefined,
      admin_email: value.admin_email ?? undefined
    }).pipe(takeUntil(this.destroy$), finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.showCreateForm.set(false);
          this.createForm.reset();
          this.loadAll();
        },
        error: (err: Error) => this.createError.set(err.message)
      });
  }

  protected navigateToDetail(org: Organization): void {
    this.router.navigate(['/genbi/org', org._id]);
  }

  protected async deleteOrg(org: Organization): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Delete organisation',
      message: `Delete organisation "${org.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    this.deletingId.set(org._id);
    this.orgService.deleteOrganization(org._id)
      .pipe(takeUntil(this.destroy$), finalize(() => this.deletingId.set(null)))
      .subscribe({
        next: () => this.orgs.update(list => list.filter(o => o._id !== org._id)),
        error: (err: Error) => alert(`Delete failed: ${err.message}`)
      });
  }

  protected dbCount(org: Organization): number {
    return Object.keys(org.databases ?? {}).length;
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  private loadAll(): void {
    this.loading.set(true);
    this.orgService.listOrganizations()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: orgs => this.orgs.set(orgs),
        error: () => this.orgs.set([])
      });
    this.orgService.getStats()
      .pipe(takeUntil(this.destroy$), finalize(() => this.loading.set(false)))
      .subscribe({
        next: stats => this.stats.set(stats),
        error: () => this.stats.set(null)
      });
  }
}
