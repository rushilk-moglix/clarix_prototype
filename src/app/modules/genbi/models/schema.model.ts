export enum SchemaStatus {
  DRAFT = 'DRAFT',
  VALIDATING = 'VALIDATING',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  FAILED = 'FAILED'
}

export enum FieldType {
  STRING = 'string',
  INT = 'int',
  LONG = 'long',
  DOUBLE = 'double',
  DECIMAL = 'decimal',
  BOOLEAN = 'boolean',
  DATE = 'date',
  OBJECT_ID = 'objectId',
  ARRAY = 'array',
  OBJECT = 'object',
  MIXED = 'mixed',
  NULL = 'null'
}

export enum UsageTier {
  CORE = 'CORE',
  RELEVANT = 'RELEVANT',
  PERIPHERAL = 'PERIPHERAL'
}

export interface CommonQuery {
  query: string;
  type: string;
  QL: string;
}

export interface MSchemaField {
  name: string;
  type: FieldType;
  description: string;
  usageTier?: UsageTier;
  nullable?: boolean;
  enumValues?: string[];
  example?: any;
}

export interface MSchemaCollection {
  name: string;
  description: string;
  fields: MSchemaField[];
  estimatedDocCount?: number;
  indexes?: string[];
  sampleDocuments?: any[];
  commonQueries?: CommonQuery[];
}

export interface MSchemaRelationship {
  name: string;
  from: string;
  fromField: string;
  to: string;
  toField: string;
  type: string;
  joinHint: string;
}

export interface MSchema {
  version: string;
  database: string;
  description: string;
  collections: MSchemaCollection[];
  relationships: MSchemaRelationship[];
}

export interface LiveValidationResult {
  valid: boolean;           // Used by existing validation components
  passed: boolean;          // Used by new editor components
  errors?: string[];
  warnings?: string[];
  timestamp: string;
}

export type ValidationResult = LiveValidationResult; // Alias for backward compatibility

export interface ChunkStats {
  total_chunks: number;
  successful_chunks: number;
  failed_chunks: number;
  pending_chunks: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface SchemaUploadRequest {
  file: File;
  database?: string;
  description?: string;
}

export interface StoredSchema {
  id: string;
  org_id: string;
  database: string;
  version: number;
  status: SchemaStatus;
  schema: MSchema;
  uploaded_by: string;
  uploaded_at: string;
  activated_at?: string;
  archived_at?: string;
  live_validation_result?: LiveValidationResult;
  chunk_count: number;
  warnings: string[];
}

export interface TestQueryRequest {
  database: string;
  collection: string;
  QL: string;
}

export interface TestQueryResponse {
  success: boolean;
  results?: any[];
  error?: string;
  execution_time_ms?: number;
}