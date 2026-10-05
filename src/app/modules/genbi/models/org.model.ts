export interface OrgDatabase {
  name: string;
  uri: string;
  description?: string;
  is_primary: boolean;
  connection_timeout?: number;
  socket_timeout?: number;
  server_selection_timeout?: number;
  max_pool_size?: number;
  min_pool_size?: number;
}

export interface Organization {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  databases: Record<string, OrgDatabase>;
  settings: Record<string, unknown>;
  admin_email?: string;
  contact_info?: Record<string, string>;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  quota_limits: Record<string, number>;
  usage_stats: Record<string, number>;
}

export interface OrganizationCreate {
  name: string;
  slug: string;
  description?: string;
  admin_email?: string;
  contact_info?: Record<string, string>;
}

export interface OrganizationUpdate {
  name?: string;
  description?: string;
  admin_email?: string;
  contact_info?: Record<string, string>;
  is_active?: boolean;
  quota_limits?: Record<string, number>;
}

export interface OrgStats {
  total_organizations: number;
  active_organizations: number;
  inactive_organizations: number;
  total_databases: number;
  [key: string]: unknown;
}

export interface QuotaResult {
  allowed: boolean;
  current_usage: number;
  limit: number;
  resource: string;
}
