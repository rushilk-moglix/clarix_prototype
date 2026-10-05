# GenBI Schema Management Module

This module provides a comprehensive interface for managing MongoDB schemas in the GenBI (Natural Language to MongoDB Query Engine) system.

## Overview

GenBI is an intelligent service that enables natural language queries against MongoDB databases. This Angular module provides the frontend interface for managing schema definitions that power the natural language processing capabilities.

## Features

### 📊 Dashboard & Analytics
- **Overview Dashboard**: Real-time statistics and quick actions
- **Analytics Page**: Comprehensive metrics and system health monitoring
- **Performance Metrics**: Track schema usage and system performance

### 📄 Schema Management
- **Schema List**: Browse and manage all uploaded schemas
- **Schema Upload**: Drag-and-drop interface for uploading JSON schema files
- **Schema Validation**: Live validation against target databases
- **Schema Activation**: Activate schemas for production use

### 🔍 Advanced Features
- **Search & Filtering**: Find schemas quickly with advanced filters
- **Status Tracking**: Monitor schema states (Draft, Active, Validating, Failed)
- **Warnings System**: Display validation warnings and recommendations
- **Chunk Analytics**: Monitor vector embedding statistics

## API Integration

The module integrates with the GenBI API endpoints:

- `POST /api/v1/schema/upload` - Upload schema files
- `GET /api/v1/schema/` - List all schemas
- `GET /api/v1/schema/{id}` - Get specific schema
- `DELETE /api/v1/schema/{id}` - Delete schema
- `POST /api/v1/schema/{id}/activate` - Activate schema
- `POST /api/v1/schema/{id}/validate-live` - Validate schema
- `GET /api/v1/schema/active/{database}` - Get active schema
- `GET /api/v1/schema/chunks/stats` - Get chunk statistics

## Components

### Layout Component
- `GenbiLayoutComponent` - Main layout with navigation tabs

### Page Components
- `GenbiOverviewComponent` - Dashboard with key metrics and quick actions
- `SchemaListComponent` - Comprehensive schema management interface
- `SchemaUploadComponent` - File upload with validation and progress tracking
- `SchemaValidationComponent` - Live schema validation interface
- `GenbiAnalyticsComponent` - Analytics and system health monitoring

### Services
- `GenbiSchemaService` - HTTP service for API communication

### Models
- Complete TypeScript interfaces matching the Python Pydantic models
- Type-safe API communication
- Enum definitions for status and field types

## Navigation

The module is accessible through the main navigation:
```
GenBI
├── Overview      - Dashboard and quick actions
├── Schemas       - Manage existing schemas  
├── Upload        - Upload new schema files
├── Validation    - Live schema validation
└── Analytics     - System metrics and health
```

## Schema Format

Schemas must be uploaded as JSON files following this structure:

```json
{
  "version": "1.0",
  "database": "database_name",
  "description": "Database description",
  "collections": [
    {
      "name": "collection_name",
      "description": "Collection description", 
      "fields": [
        {
          "name": "field_name",
          "type": "string|int|long|double|decimal|boolean|date|objectId|array|object|mixed|null",
          "description": "Field description",
          "usage_tier": "CORE|RELEVANT|PERIPHERAL",
          "nullable": true|false,
          "enum_values": ["value1", "value2"],
          "example": "example_value"
        }
      ],
      "sample_documents": [],
      "common_queries": []
    }
  ],
  "relationships": []
}
```

## Usage

1. **Upload Schema**: Navigate to Upload tab and drag/drop JSON schema files
2. **Validate**: Use the Validation tab to test schemas against live databases  
3. **Activate**: Activate validated schemas for production use
4. **Monitor**: Use Analytics to track performance and system health

## Development

The module follows Angular best practices:
- Standalone components for better tree-shaking
- Reactive forms for file uploads
- HTTP interceptors for error handling
- TypeScript interfaces for type safety
- Responsive design with Tailwind CSS

All components are fully typed and include comprehensive error handling and loading states.