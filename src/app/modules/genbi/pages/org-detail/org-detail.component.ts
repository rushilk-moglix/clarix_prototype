import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { ConfirmDialogService } from '../../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { GenbiOrgService } from '../../services/genbi-org.service';
import { Organization, OrgDatabase, QuotaResult } from '../../models/org.model';

type Tab = 'overview' | 'databases' | 'settings' | 'quota';

@Component({
  selector: 'app-org-detail',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './org-detail.component.html',
  styleUrl: './org-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrgDetailComponent implements OnInit, OnDestroy {
  private readonly orgService = inject(GenbiOrgService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly destroy$ = new Subject<void>();

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly org = signal<Organization | null>(null);
  protected readonly activeTab = signal<Tab>('overview');
  protected readonly error = signal<string | null>(null);
  protected readonly successMsg = signal<string | null>(null);
  protected readonly showAddDbForm = signal(false);
  protected readonly removingEnv = signal<string | null>(null);
  protected readonly quotaResult = signal<QuotaResult | null>(null);
  protected readonly checkingQuota = signal(false);

  protected readonly databaseEntries = computed(() => {
    const db = this.org()?.databases ?? {};
    return Object.entries(db) as [string, OrgDatabase][];
  });

  protected readonly settingsEntries = computed(() => {
    const s = this.org()?.settings ?? {};
    return Object.entries(s);
  });

  protected readonly overviewForm = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    admin_email: ['', Validators.email],
    is_active: [true]
  });

  protected readonly addDbForm = this.fb.group({
    env: ['', [Validators.required, Validators.pattern(/^\S+$/)]],
    name: ['', Validators.required],
    uri: ['', Validators.required],
    description: [''],
    is_primary: [false],
    max_pool_size: [10],
    min_pool_size: [1],
    connection_timeout: [5000],
    socket_timeout: [5000],
    server_selection_timeout: [5000]
  });

  protected readonly quotaForm = this.fb.group({
    resource: ['', Validators.required],
    current_usage: [0, [Validators.required, Validators.min(0)]]
  });

  protected readonly settingsForm = this.fb.group({
    raw: ['{}']
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadOrg(id);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected setTab(tab: Tab): void {
    this.activeTab.set(tab);
    this.error.set(null);
    this.successMsg.set(null);
  }

  protected saveOverview(): void {
    if (this.overviewForm.invalid) {
      this.overviewForm.markAllAsTouched();
      return;
    }
    const v = this.overviewForm.getRawValue();
    const orgId = this.org()?._id;
    if (!orgId) return;
    this.saving.set(true);
    this.error.set(null);
    this.orgService.updateOrganization(orgId, {
      name: v.name ?? undefined,
      description: v.description ?? undefined,
      admin_email: v.admin_email ?? undefined,
      is_active: v.is_active ?? undefined
    }).pipe(takeUntil(this.destroy$), finalize(() => this.saving.set(false)))
      .subscribe({
        next: updated => {
          this.org.set(updated);
          this.successMsg.set('Organisation updated.');
          setTimeout(() => this.successMsg.set(null), 3000);
        },
        error: (err: Error) => this.error.set(err.message)
      });
  }

  protected toggleAddDbForm(): void {
    this.showAddDbForm.update(v => !v);
    this.addDbForm.reset({ is_primary: false, max_pool_size: 10, min_pool_size: 1, connection_timeout: 5000, socket_timeout: 5000, server_selection_timeout: 5000 });
  }

  protected submitAddDb(): void {
    if (this.addDbForm.invalid) {
      this.addDbForm.markAllAsTouched();
      return;
    }
    const v = this.addDbForm.getRawValue();
    const orgId = this.org()?._id;
    if (!orgId || !v.env) return;
    const body: OrgDatabase = {
      name: v.name!,
      uri: v.uri!,
      description: v.description ?? undefined,
      is_primary: v.is_primary ?? false,
      max_pool_size: v.max_pool_size ?? undefined,
      min_pool_size: v.min_pool_size ?? undefined,
      connection_timeout: v.connection_timeout ?? undefined,
      socket_timeout: v.socket_timeout ?? undefined,
      server_selection_timeout: v.server_selection_timeout ?? undefined
    };
    this.saving.set(true);
    this.error.set(null);
    this.orgService.addDatabase(orgId, v.env, body)
      .pipe(takeUntil(this.destroy$), finalize(() => this.saving.set(false)))
      .subscribe({
        next: updated => {
          this.org.set(updated);
          this.showAddDbForm.set(false);
          this.successMsg.set(`Database "${v.env}" added.`);
          setTimeout(() => this.successMsg.set(null), 3000);
        },
        error: (err: Error) => this.error.set(err.message)
      });
  }

  protected async removeDatabase(env: string): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Remove database',
      message: `Remove database "${env}"?`,
      confirmText: 'Remove',
      tone: 'danger',
    });
    if (!ok) return;
    const orgId = this.org()?._id;
    if (!orgId) return;
    this.removingEnv.set(env);
    this.orgService.removeDatabase(orgId, env)
      .pipe(takeUntil(this.destroy$), finalize(() => this.removingEnv.set(null)))
      .subscribe({
        next: updated => {
          this.org.set(updated);
          this.successMsg.set(`Database "${env}" removed.`);
          setTimeout(() => this.successMsg.set(null), 3000);
        },
        error: (err: Error) => this.error.set(err.message)
      });
  }

  protected saveSettings(): void {
    const orgId = this.org()?._id;
    if (!orgId) return;
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(this.settingsForm.getRawValue().raw ?? '{}');
    } catch {
      this.error.set('Invalid JSON in settings');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.orgService.updateSettings(orgId, parsed)
      .pipe(takeUntil(this.destroy$), finalize(() => this.saving.set(false)))
      .subscribe({
        next: updated => {
          this.org.set(updated);
          this.settingsForm.patchValue({ raw: JSON.stringify(updated.settings, null, 2) });
          this.successMsg.set('Settings saved.');
          setTimeout(() => this.successMsg.set(null), 3000);
        },
        error: (err: Error) => this.error.set(err.message)
      });
  }

  protected checkQuota(): void {
    const v = this.quotaForm.getRawValue();
    const orgId = this.org()?._id;
    if (!orgId || !v.resource || this.quotaForm.invalid) {
      this.quotaForm.markAllAsTouched();
      return;
    }
    this.checkingQuota.set(true);
    this.quotaResult.set(null);
    this.orgService.checkQuota(orgId, v.resource, v.current_usage ?? 0)
      .pipe(takeUntil(this.destroy$), finalize(() => this.checkingQuota.set(false)))
      .subscribe({
        next: result => this.quotaResult.set(result),
        error: (err: Error) => this.error.set(err.message)
      });
  }

  protected usageEntries(): [string, number][] {
    return Object.entries(this.org()?.usage_stats ?? {}) as [string, number][];
  }

  protected quotaEntries(): [string, number][] {
    return Object.entries(this.org()?.quota_limits ?? {}) as [string, number][];
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  private loadOrg(id: string): void {
    this.loading.set(true);
    this.orgService.getOrganization(id)
      .pipe(takeUntil(this.destroy$), finalize(() => this.loading.set(false)))
      .subscribe({
        next: org => {
          this.org.set(org);
          this.overviewForm.patchValue({
            name: org.name,
            description: org.description ?? '',
            admin_email: org.admin_email ?? '',
            is_active: org.is_active
          });
          this.settingsForm.patchValue({ raw: JSON.stringify(org.settings, null, 2) });
        },
        error: (err: Error) => this.error.set(err.message)
      });
  }
}
