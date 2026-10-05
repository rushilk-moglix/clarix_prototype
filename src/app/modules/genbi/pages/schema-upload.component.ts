import { Component, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { GenbiSchemaService } from '../services/genbi-schema.service';
import { Subject, timeout } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

@Component({
  selector: 'app-schema-upload',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
  templateUrl: './schema-upload.component.html',
  styleUrl: './schema-upload.component.scss'
})
export class SchemaUploadComponent implements OnDestroy {
  private readonly schemaService = inject(GenbiSchemaService);
  private readonly destroy$ = new Subject<void>();

  selectedFile: File | null = null;
  isDragging = false;
  protected readonly uploading = signal(false);
  protected readonly uploadProgress = signal(0);
  uploadSuccess = false;
  uploadError: string | null = null;
  uploadedSchema: any = null;

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  readonly sampleSchema = `{
  "version": "1.0",
  "database": "ecommerce",
  "description": "E-commerce database schema",
  "collections": [
    {
      "name": "products",
      "description": "Product catalog",
      "fields": [
        {
          "name": "_id",
          "type": "objectId",
          "description": "Product ID"
        },
        {
          "name": "name",
          "type": "string",
          "description": "Product name"
        },
        {
          "name": "price",
          "type": "decimal",
          "description": "Product price"
        }
      ]
    }
  ],
  "relationships": []
}`;

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  private handleFile(file: File): void {
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.json')) {
      this.uploadError = 'Please select a JSON file (.json)';
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      this.uploadError = 'File size must be less than 10MB';
      return;
    }

    this.selectedFile = file;
    this.uploadError = null;
  }

  removeFile(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.selectedFile = null;
    this.uploadError = null;
  }

  uploadFile(): void {
    if (!this.selectedFile) return;
 
    this.uploading.set(true);
    this.uploadProgress.set(0);
    this.uploadError = null;
 
    // Simulate progress (since HttpClient doesn't provide upload progress by default)
    const progressInterval = setInterval(() => {
      const current = this.uploadProgress();
      this.uploadProgress.set(Math.min(current + Math.random() * 15, 90));
      if (current >= 90) {
        clearInterval(progressInterval);
      }
    }, 200);

    this.schemaService.uploadSchema(this.selectedFile)
      .pipe(
        takeUntil(this.destroy$),
        timeout(60000), // Larger timeout for file upload
        finalize(() => {
          // Clear the progress interval on completion or error
          clearInterval(progressInterval);
          // If we're not successful after finalize, we should stop the loader
          if (!this.uploadSuccess) {
            this.uploading.set(false);
          }
        })
      )
      .subscribe({
        next: (schema) => {
          this.uploadProgress.set(100);
          
          setTimeout(() => {
            this.uploading.set(false);
            this.uploadSuccess = true;
            this.uploadedSchema = schema;
          }, 500);
        },
        error: (error) => {
          this.uploading.set(false);
          this.uploadError = error;
          this.uploadProgress.set(0);
        }
      });
  }

  resetUpload(): void {
    this.selectedFile = null;
    this.uploading.set(false);
    this.uploadSuccess = false;
    this.uploadError = null;
    this.uploadedSchema = null;
    this.uploadProgress.set(0);
    this.isDragging = false;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}