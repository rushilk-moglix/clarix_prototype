import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { GenbiSchemaService } from '../../services/genbi-schema.service';
import {
    StoredSchema,
    MSchema,
    MSchemaCollection,
    MSchemaField,
    FieldType,
    UsageTier,
    SchemaStatus,
    MSchemaRelationship
} from '../../models/schema.model';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Subject, timeout } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

@Component({
    selector: 'app-schema-editor',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        ReactiveFormsModule,
        LucideAngularModule,
        DragDropModule
    ],
    templateUrl: './schema-editor.component.html',
    styleUrl: './schema-editor.component.scss'
})
export class SchemaEditorComponent implements OnInit, OnDestroy {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly schemaService = inject(GenbiSchemaService);
    private readonly destroy$ = new Subject<void>();

    protected readonly loading = signal(false);
    protected readonly saving = signal(false);
    protected readonly error = signal<string | null>(null);
    protected readonly success = signal(false);

    // The full stored schema object from the API
    protected readonly storedSchema = signal<StoredSchema | null>(null);

    // Local editable copy of the MSchema
    protected readonly editableSchema = signal<MSchema | null>(null);

    // UI state
    protected readonly viewMode = signal<'visual' | 'json'>('visual');
    protected readonly activeTab = signal<'fields' | 'queries' | 'samples' | 'settings'>('fields');
    protected readonly activeCollectionIndex = signal<number | null>(null);
    protected readonly activeRelationshipIndex = signal<number | null>(null);
    protected readonly expandedCollections = signal<Set<number>>(new Set());

    // Enum options for dropdowns
    protected readonly fieldTypes = Object.values(FieldType);
    protected readonly usageTiers = Object.values(UsageTier);
    protected readonly UsageTier = UsageTier;
    protected readonly queryTypes = ['FILTER', 'AGGREGATION', 'JOIN', 'SORT', 'COUNT'];
    protected readonly relationshipTypes = ['ONE_TO_ONE', 'ONE_TO_MANY', 'MANY_TO_ONE', 'MANY_TO_MANY'];

    // Search and Filter state
    protected readonly fieldSearch = signal('');
    protected readonly tierFilter = signal<UsageTier | 'ALL'>('ALL');
    protected readonly selectedFieldNames = signal<Set<string>>(new Set());

    // Test Run results
    protected readonly queryResults = signal<Record<number, any>>({});
    protected readonly testingQuery = signal<number | null>(null);

    // Completeness signals
    protected readonly collectionCompleteness = computed(() => {
        const idx = this.activeCollectionIndex();
        const schema = this.editableSchema();
        if (idx === null || idx === -1 || !schema) return 0;

        const collection = schema.collections[idx];
        if (!collection.fields.length) return 0;

        const describedFields = collection.fields.filter(f => f.description && f.description.trim().length > 5);
        return Math.round((describedFields.length / collection.fields.length) * 100);
    });

    protected readonly missingDescriptionCount = computed(() => {
        const idx = this.activeCollectionIndex();
        const schema = this.editableSchema();
        if (idx === null || idx === -1 || !schema) return 0;
        return schema.collections[idx].fields.filter(f => !f.description || f.description.trim().length <= 5).length;
    });

    protected readonly tierCounts = computed(() => {
        const idx = this.activeCollectionIndex();
        const schema = this.editableSchema();
        if (idx === null || idx === -1 || !schema) return { CORE: 0, RELEVANT: 0, PERIPHERAL: 0 };

        return schema.collections[idx].fields.reduce((acc, f) => {
            const tier = f.usageTier || UsageTier.RELEVANT;
            acc[tier]++;
            return acc;
        }, { CORE: 0, RELEVANT: 0, PERIPHERAL: 0 } as Record<UsageTier, number>);
    });

    protected readonly isEditable = computed(() => {
        return this.mode() === 'edit';
    });

    protected readonly isEditingActiveSchema = computed(() => {
        return this.mode() === 'edit' && this.storedSchema()?.status === SchemaStatus.ACTIVE;
    });

    protected readonly mode = signal<'view' | 'edit'>('edit');

    ngOnInit(): void {
        this.route.paramMap
            .pipe(takeUntil(this.destroy$))
            .subscribe(params => {
                const schemaId = params.get('id');
                if (schemaId) {
                    this.loadSchema(schemaId);
                } else {
                    this.error.set('No schema ID provided');
                }
            });

        this.route.queryParamMap
            .pipe(takeUntil(this.destroy$))
            .subscribe(params => {
                const modeParam = params.get('mode') as 'view' | 'edit';
                if (modeParam) {
                    this.mode.set(modeParam);
                }
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private loadSchema(id: string): void {
        this.loading.set(true);
        this.schemaService.getSchema(id)
            .pipe(
                takeUntil(this.destroy$),
                timeout(10000),
                finalize(() => this.loading.set(false))
            )
            .subscribe({
                next: (schema) => {
                    this.storedSchema.set(schema);
                    // Create a deep copy for editing
                    this.editableSchema.set(JSON.parse(JSON.stringify(schema.schema)));
                    if (schema.schema.collections.length > 0) {
                        this.expandedCollections.set(new Set([0]));
                    }
                },
                error: (err) => {
                    this.error.set(typeof err === 'string' ? err : 'Failed to load schema');
                }
            });
    }

    protected toggleCollection(index: number): void {
        const expanded = new Set(this.expandedCollections());
        if (expanded.has(index)) {
            expanded.delete(index);
        } else {
            expanded.add(index);
        }
        this.expandedCollections.set(expanded);
    }

    protected addCollection(): void {
        this.editableSchema.update(schema => {
            if (!schema) return schema;

            const newCollection: MSchemaCollection = {
                name: 'new_collection',
                description: 'Description of the new collection',
                fields: [
                    {
                        name: '_id',
                        type: FieldType.OBJECT_ID,
                        description: 'Primary Key',
                        usageTier: UsageTier.CORE
                    }
                ]
            };

            const updatedSchema = {
                ...schema,
                collections: [...(schema.collections || []), newCollection]
            };

            // Auto-select the new collection
            setTimeout(() => {
                this.activeCollectionIndex.set(updatedSchema.collections.length - 1);
                this.expandedCollections.update(set => {
                    const newSet = new Set(set);
                    newSet.add(updatedSchema.collections.length - 1);
                    return newSet;
                });
            }, 0);

            return updatedSchema;
        });
    }

    protected removeCollection(index: number): void {
        this.editableSchema.update(schema => {
            if (!schema) return schema;

            const collections = [...schema.collections];
            collections.splice(index, 1);

            if (this.activeCollectionIndex() === index) {
                this.activeCollectionIndex.set(null);
            } else if (this.activeCollectionIndex() !== null && this.activeCollectionIndex()! > index) {
                this.activeCollectionIndex.set(this.activeCollectionIndex()! - 1);
            }

            return { ...schema, collections };
        });
    }

    protected addField(collectionIndex: number): void {
        this.editableSchema.update(schema => {
            if (!schema || !schema.collections || !schema.collections[collectionIndex]) {
                console.warn('Cannot add field: schema or collection not found', { schema, collectionIndex });
                return schema;
            }

            const collections = [...schema.collections];
            const collection = { ...collections[collectionIndex] };
            const fields = [...(collection.fields || [])];

            fields.push({
                name: 'new_field_' + (fields.length + 1),
                type: FieldType.STRING,
                description: 'New Field Description',
                usageTier: UsageTier.RELEVANT
            });

            collection.fields = fields;
            collections[collectionIndex] = collection;

            return { ...schema, collections };
        });
    }

    protected removeField(collectionIndex: number, fieldIndex: number): void {
        this.editableSchema.update(schema => {
            if (!schema || !schema.collections || !schema.collections[collectionIndex]) return schema;

            const collections = [...schema.collections];
            const collection = { ...collections[collectionIndex] };
            const fields = [...(collection.fields || [])];

            fields.splice(fieldIndex, 1);

            collection.fields = fields;
            collections[collectionIndex] = collection;

            return { ...schema, collections };
        });
    }

    protected onJsonChange(event: Event): void {
        const value = (event.target as HTMLTextAreaElement).value;
        try {
            const parsed = JSON.parse(value);
            this.editableSchema.set(parsed);
            this.error.set(null);
        } catch (e) {
            this.error.set('Invalid JSON structure');
        }
    }

    protected createDraft(): void {
        const schema = this.editableSchema();
        if (!schema) return;

        this.saving.set(true);
        this.error.set(null);

        // Create a virtual file from the current schema JSON
        const schemaBlob = new Blob([JSON.stringify(schema, null, 2)], { type: 'application/json' });
        const fileName = `${schema.database}_v${(this.storedSchema()?.version || 1) + 1}_draft.json`;
        const schemaFile = new File([schemaBlob], fileName, { type: 'application/json' });

        this.schemaService.uploadSchema(schemaFile)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => this.saving.set(false))
            )
            .subscribe({
                next: (newSchema) => {
                    this.success.set(true);
                    setTimeout(() => {
                        this.success.set(false);
                        // Navigate to the new draft in edit mode
                        this.router.navigate(['/genbi/schemas', newSchema.id, 'edit'], {
                            queryParams: { mode: 'edit' }
                        });
                    }, 1500);
                },
                error: (err) => {
                    this.error.set(typeof err === 'string' ? err : 'Failed to create draft');
                }
            });
    }

    protected saveSchema(): void {
        const stored = this.storedSchema();
        const schema = this.editableSchema();

        if (!stored || !schema || !stored.id) return;

        this.saving.set(true);
        this.error.set(null);

        this.schemaService.updateSchema(stored.id, schema)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => this.saving.set(false))
            )
            .subscribe({
                next: (updated) => {
                    this.storedSchema.set(updated);
                    this.editableSchema.set(JSON.parse(JSON.stringify(updated.schema)));
                    this.success.set(true);
                    setTimeout(() => this.success.set(false), 3000);
                },
                error: (err) => {
                    this.error.set(typeof err === 'string' ? err : 'Failed to save schema');
                }
            });
    }

    protected validateLive(): void {
        const stored = this.storedSchema();
        if (!stored || !stored.id) return;

        this.loading.set(true);
        this.schemaService.validateSchemaLive(stored.id)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => this.loading.set(false))
            )
            .subscribe({
                next: (result) => {
                    this.loadSchema(stored.id!);
                    if (result.valid) {
                        this.success.set(true);
                        setTimeout(() => this.success.set(false), 3000);
                    } else {
                        this.error.set('Live validation failed. Please check field mappings.');
                    }
                },
                error: (err) => this.error.set(err)
            });
    }

    protected activateSchema(): void {
        const stored = this.storedSchema();
        if (!stored || !stored.id) return;

        this.saving.set(true);
        this.schemaService.activateSchema(stored.id)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => this.saving.set(false))
            )
            .subscribe({
                next: () => {
                    this.loadSchema(stored.id!);
                    this.success.set(true);
                    setTimeout(() => this.success.set(false), 3000);
                },
                error: (err) => this.error.set(err)
            });
    }

    protected archiveSchema(): void {
        const stored = this.storedSchema();
        if (!stored || !stored.id) return;

        this.saving.set(true);
        this.schemaService.archiveSchema(stored.id)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => this.saving.set(false))
            )
            .subscribe({
                next: (updated) => {
                    this.storedSchema.set(updated);
                    this.success.set(true);
                    setTimeout(() => this.success.set(false), 3000);
                },
                error: (err) => this.error.set(err)
            });
    }

    // Helper for field filtering
    protected readonly filteredFields = computed(() => {
        const idx = this.activeCollectionIndex();
        const schema = this.editableSchema();
        if (idx === null || idx === -1 || !schema) return [];

        const search = this.fieldSearch().toLowerCase();
        const tier = this.tierFilter();

        return schema.collections[idx].fields.filter(f => {
            const matchesSearch = !search || f.name.toLowerCase().includes(search) || f.description?.toLowerCase().includes(search);
            const matchesTier = tier === 'ALL' || f.usageTier === tier;
            return matchesSearch && matchesTier;
        });
    });

    protected dropField(event: CdkDragDrop<MSchemaField[]>): void {
        const idx = this.activeCollectionIndex();
        if (idx === null || idx === -1) return;

        this.editableSchema.update(schema => {
            if (!schema) return schema;
            const collections = [...schema.collections];
            const collection = { ...collections[idx] };
            const fields = [...collection.fields];

            moveItemInArray(fields, event.previousIndex, event.currentIndex);

            collection.fields = fields;
            collections[idx] = collection;
            return { ...schema, collections };
        });
    }

    protected toggleFieldSelection(name: string): void {
        this.selectedFieldNames.update(set => {
            const newSet = new Set(set);
            if (newSet.has(name)) newSet.delete(name);
            else newSet.add(name);
            return newSet;
        });
    }

    protected bulkSetTier(tier: UsageTier): void {
        const idx = this.activeCollectionIndex();
        if (idx === null || idx === -1) return;

        this.editableSchema.update(schema => {
            if (!schema) return schema;
            const collections = [...schema.collections];
            const collection = { ...collections[idx] };
            const selected = this.selectedFieldNames();

            collection.fields = collection.fields.map(f => {
                if (selected.has(f.name)) return { ...f, usageTier: tier };
                return f;
            });

            collections[idx] = collection;
            return { ...schema, collections };
        });
        this.selectedFieldNames.set(new Set());
    }

    protected addQuery(): void {
        const idx = this.activeCollectionIndex();
        if (idx === null || idx === -1) return;

        this.editableSchema.update(schema => {
            if (!schema) return schema;
            const collections = [...schema.collections];
            const coll = { ...collections[idx] };
            const queries = [...(coll.commonQueries || [])];

            queries.push({
                query: '',
                type: 'FILTER',
                QL: ''
            });

            coll.commonQueries = queries;
            collections[idx] = coll;
            return { ...schema, collections };
        });
    }

    protected removeQuery(queryIdx: number): void {
        const idx = this.activeCollectionIndex();
        if (idx === null || idx === -1) return;

        this.editableSchema.update(schema => {
            if (!schema) return schema;
            const collections = [...schema.collections];
            const coll = { ...collections[idx] };
            coll.commonQueries = coll.commonQueries?.filter((_, i) => i !== queryIdx);
            collections[idx] = coll;
            return { ...schema, collections };
        });
    }

    protected onSampleDocsChange(event: Event): void {
        const value = (event.target as HTMLTextAreaElement).value;
        const idx = this.activeCollectionIndex();
        if (idx === null || idx === -1) return;

        try {
            const docs = JSON.parse(value);
            if (Array.isArray(docs)) {
                this.editableSchema.update(schema => {
                    if (!schema) return schema;
                    const collections = [...schema.collections];
                    collections[idx] = { ...collections[idx], sampleDocuments: docs };
                    return { ...schema, collections };
                });
                this.error.set(null);
            } else {
                this.error.set('Sample documents must be an array of objects');
            }
        } catch (e) {
            // Don't set error while typing, but maybe log it?
        }
    }

    protected updateIndexes(event: Event): void {
        const value = (event.target as HTMLTextAreaElement).value;
        const idx = this.activeCollectionIndex();
        if (idx === null || idx === -1) return;

        const indexes = value.split('\n').map(s => s.trim()).filter(s => s.length > 0);
        this.editableSchema.update(schema => {
            if (!schema) return schema;
            const collections = [...schema.collections];
            collections[idx] = { ...collections[idx], indexes: indexes };
            return { ...schema, collections };
        });
    }

    protected getSampleDocsString(): string {
        const idx = this.activeCollectionIndex();
        const schema = this.editableSchema();
        if (idx === null || idx === -1 || !schema) return '[]';
        return JSON.stringify(schema.collections[idx].sampleDocuments || [], null, 2);
    }

    protected getIndexesString(): string {
        const idx = this.activeCollectionIndex();
        const schema = this.editableSchema();
        if (idx === null || idx === -1 || !schema) return '';
        return (schema.collections[idx].indexes || []).join('\n');
    }

    protected testQuery(queryIdx: number): void {
        const idx = this.activeCollectionIndex();
        const schema = this.editableSchema();
        if (idx === null || idx === -1 || !schema) return;

        const coll = schema.collections[idx];
        const q = coll.commonQueries?.[queryIdx];
        if (!q || !q.QL) return;

        this.testingQuery.set(queryIdx);
        this.schemaService.testExampleQuery(schema.database, coll.name, q.QL)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => this.testingQuery.set(null))
            )
            .subscribe({
                next: (res) => {
                    this.queryResults.update(results => ({ ...(results || {}), [queryIdx]: res }));
                },
                error: (err) => {
                    this.queryResults.update(results => ({ ...(results || {}), [queryIdx]: { success: false, error: err } }));
                }
            });
    }

    protected clearQueryResult(event: Event, qi: number): void {
        event.stopPropagation();
        this.queryResults.update(r => {
            const updated: Record<number, any> = { ...(r || {}) };
            delete updated[qi];
            return updated;
        });
    }

    protected addRelationship(): void {
        this.editableSchema.update(schema => {
            if (!schema) return schema;
            const relationships = [...(schema.relationships || [])];
            relationships.push({
                name: 'new_relationship',
                from: '',
                fromField: '',
                to: '',
                toField: '',
                type: 'ONE_TO_MANY',
                joinHint: 'Joining on matching keys'
            });
            return { ...schema, relationships };
        });
        this.activeCollectionIndex.set(-1);
        this.activeRelationshipIndex.set((this.editableSchema()?.relationships?.length || 1) - 1);
    }

    protected removeRelationship(index: number): void {
        this.editableSchema.update(schema => {
            if (!schema) return schema;
            const relationships = schema.relationships?.filter((_, i) => i !== index);
            return { ...schema, relationships };
        });
        if (this.activeRelationshipIndex() === index) {
            this.activeRelationshipIndex.set(null);
        }
    }

    protected getCollectionFields(collectionName: string): string[] {
        const coll = this.editableSchema()?.collections.find(c => c.name === collectionName);
        return coll ? coll.fields.map(f => f.name) : [];
    }

    protected getCollectionNames(): string[] {
        return this.editableSchema()?.collections.map(c => c.name) || [];
    }

    protected get jsonString(): string {
        return JSON.stringify(this.editableSchema(), null, 2);
    }
}
