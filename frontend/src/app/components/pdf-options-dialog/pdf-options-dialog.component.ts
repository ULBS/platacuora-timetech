import { Component, Inject, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PDFOptions, TemplateInfo, CertificateInfo, EnhancedPdfService } from '../../core/services/enhanced-pdf.service';

export interface PDFDialogData {
  declarationId?: string;
  declarationIds?: string[];
  mode: 'single' | 'batch' | 'summary';
  academicYear?: string;
  semester?: number;
}

@Component({
  selector: 'app-pdf-options-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="pdf-dialog-overlay" (click)="onCancel()">
      <div class="pdf-dialog" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h3>{{ getDialogTitle() }}</h3>
          <button class="close-btn" (click)="onCancel()">×</button>
        </div>

        <div class="dialog-content">
          <!-- Template Selection -->
          <div class="option-group">
            <label class="group-label">Template PDF:</label>
            <div class="radio-group">
              <div *ngFor="let template of templateInfo?.templates" class="radio-option">
                <input 
                  type="radio" 
                  [id]="'template-' + template.id"
                  name="template"
                  [value]="template.id"
                  [(ngModel)]="options.template">
                <label [for]="'template-' + template.id">
                  <strong>{{ template.name }}</strong>
                  <span class="template-description">{{ template.description }}</span>
                  <div class="template-features">
                    <span *ngFor="let feature of template.features" class="feature-tag">
                      {{ feature }}
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <!-- Enhanced Features -->
          <div class="option-group">
            <label class="group-label">Funcții avansate:</label>
            <div class="checkbox-group">
              <div class="checkbox-option">
                <input type="checkbox" id="enhanced" [(ngModel)]="options.enhanced">
                <label for="enhanced">
                  <strong>Generare enhanced</strong>
                  <span>Folosește template-ul oficial ULBS cu integrare de date</span>
                </label>
              </div>

              <div class="checkbox-option">
                <input type="checkbox" id="includeQR" [(ngModel)]="options.includeQR">
                <label for="includeQR">
                  <strong>Cod QR pentru verificare</strong>
                  <span>Adaugă cod QR pentru verificarea autenticității documentului</span>
                </label>
              </div>

              <div class="checkbox-option">
                <input type="checkbox" id="includeWatermark" [(ngModel)]="options.includeWatermark">
                <label for="includeWatermark">
                  <strong>Watermark pentru draft</strong>
                  <span>Adaugă watermark "DRAFT" pentru documentele în lucru</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Digital Signature -->
          <div class="option-group">
            <label class="group-label">Semnătură digitală:</label>
            <div class="checkbox-group">
              <div class="checkbox-option">
                <input 
                  type="checkbox" 
                  id="digitalSignature" 
                  [(ngModel)]="options.digitalSignature"
                  [disabled]="!certificateInfo?.isAvailable">
                <label for="digitalSignature">
                  <strong>Aplică semnătură digitală</strong>
                  <span *ngIf="certificateInfo?.isAvailable; else noCertificate">
                    Certificat disponibil și valid
                  </span>
                  <ng-template #noCertificate>
                    <span class="error">Certificat indisponibil</span>
                  </ng-template>
                </label>
              </div>
            </div>

            <!-- Certificate Info -->
            <div *ngIf="certificateInfo?.isAvailable" class="certificate-info">
              <div class="cert-detail">
                <strong>Certificat:</strong> {{ getCertificateSubject() }}
              </div>
              <div class="cert-detail">
                <strong>Valid până la:</strong> {{ certificateInfo?.certificate?.validTo | date:'dd.MM.yyyy' }}
              </div>
              <div class="cert-status" [ngClass]="getCertificateStatusClass()">
                {{ getCertificateStatus() }}
              </div>
            </div>
          </div>

          <!-- Batch Options -->
          <div *ngIf="data.mode === 'batch'" class="option-group">
            <label class="group-label">Opțiuni batch:</label>
            <div class="input-group">
              <label for="batchSize">Dimensiune batch (1-20):</label>
              <input 
                type="number" 
                id="batchSize" 
                [(ngModel)]="options.batchSize"
                min="1" 
                max="20" 
                class="number-input">
            </div>
            <div class="batch-info">
              <p>{{ data.declarationIds?.length || 0 }} declarații selectate</p>
              <p>Timpul estimat: {{ getEstimatedTime() }}</p>
            </div>
          </div>

          <!-- Data Preview -->
          <div *ngIf="dataPreview && data.mode === 'single'" class="option-group">
            <label class="group-label">Preview date integrate:</label>
            <div class="preview-info">
              <div class="preview-stat">
                <span class="stat-label">Total ore:</span>
                <span class="stat-value">{{ dataPreview.preview.totalHours }}</span>
              </div>
              <div class="preview-stat">
                <span class="stat-label">Activități:</span>
                <span class="stat-value">{{ dataPreview.preview.activitiesCount }}</span>
              </div>
              <div class="preview-stat">
                <span class="stat-label">Discipline:</span>
                <span class="stat-value">{{ dataPreview.preview.disciplinesCount }}</span>
              </div>
              <div class="preview-stat">
                <span class="stat-label">Înregistrări:</span>
                <span class="stat-value">{{ dataPreview.preview.totalItems }}</span>
              </div>
            </div>
            
            <!-- Validation Errors -->
            <div *ngIf="!dataPreview.validation.isValid" class="validation-errors">
              <h4>Erori de validare:</h4>
              <ul>
                <li *ngFor="let error of dataPreview.validation.errors" class="error">
                  {{ error }}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div class="dialog-footer">
          <button class="btn btn-secondary" (click)="onCancel()">
            Anulează
          </button>
          <button 
            class="btn btn-primary" 
            (click)="onGenerate()"
            [disabled]="isGenerating || (!dataPreview?.validation.isValid && data.mode === 'single')">
            <span *ngIf="isGenerating" class="spinner"></span>
            {{ getGenerateButtonText() }}
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./pdf-options-dialog.component.scss']
})
export class PdfOptionsDialogComponent implements OnInit {
  @Input() data!: PDFDialogData;
  @Input() dialogRef!: any;

  options: PDFOptions = {
    enhanced: true,
    includeQR: true,
    includeWatermark: false,
    digitalSignature: false,
    template: 'ulbs-official',
    batchSize: 5
  };

  templateInfo: TemplateInfo | null = null;
  certificateInfo: CertificateInfo | null = null;
  dataPreview: any = null;
  isGenerating = false;

  constructor(
    private enhancedPdfService: EnhancedPdfService
  ) {}

  ngOnInit() {
    this.loadTemplateInfo();
    this.loadCertificateInfo();
    
    if (this.data.mode === 'single' && this.data.declarationId) {
      this.loadDataPreview();
    }
  }

  loadTemplateInfo() {
    this.enhancedPdfService.getTemplateInfo().subscribe({
      next: (info) => {
        this.templateInfo = info;
        this.options.template = info.currentDefault as any;
      },
      error: (error) => {
        console.error('Error loading template info:', error);
      }
    });
  }

  loadCertificateInfo() {
    this.enhancedPdfService.getCertificateInfo().subscribe({
      next: (info) => {
        this.certificateInfo = info;
        if (!info.isAvailable) {
          this.options.digitalSignature = false;
        }
      },
      error: (error) => {
        console.error('Error loading certificate info:', error);
        this.options.digitalSignature = false;
      }
    });
  }

  loadDataPreview() {
    if (!this.data.declarationId) return;
    
    this.enhancedPdfService.getDataPreview(this.data.declarationId).subscribe({
      next: (preview) => {
        this.dataPreview = preview;
      },
      error: (error) => {
        console.error('Error loading data preview:', error);
      }
    });
  }

  getDialogTitle(): string {
    switch (this.data.mode) {
      case 'single':
        return 'Generare PDF Enhanced';
      case 'batch':
        return 'Generare Batch PDF';
      case 'summary':
        return 'Generare Raport Sumar';
      default:
        return 'Generare PDF';
    }
  }

  getGenerateButtonText(): string {
    if (this.isGenerating) {
      return this.data.mode === 'batch' ? 'Generez...' : 'Generez...';
    }
    switch (this.data.mode) {
      case 'single':
        return 'Generează PDF';
      case 'batch':
        return `Generează ${this.data.declarationIds?.length || 0} PDF-uri`;
      case 'summary':
        return 'Generează Raport';
      default:
        return 'Generează';
    }
  }

  getCertificateSubject(): string {
    if (!this.certificateInfo?.certificate.subject) return 'N/A';
    return this.certificateInfo.certificate.subject.commonName || 
           this.certificateInfo.certificate.subject.organizationName || 'N/A';
  }

  getCertificateStatus(): string {
    if (!this.certificateInfo?.certificate) return 'Indisponibil';
    
    if (this.certificateInfo.certificate.isExpired) return 'Expirat';
    if (!this.certificateInfo.certificate.isValid) return 'Invalid';
    if (this.certificateInfo.certificate.isSelfSigned) return 'Auto-semnat (Test)';
    return 'Valid';
  }

  getCertificateStatusClass(): string {
    if (!this.certificateInfo?.certificate) return 'cert-unavailable';
    
    if (this.certificateInfo.certificate.isExpired || !this.certificateInfo.certificate.isValid) {
      return 'cert-invalid';
    }
    if (this.certificateInfo.certificate.isSelfSigned) {
      return 'cert-self-signed';
    }
    return 'cert-valid';
  }

  getEstimatedTime(): string {
    const count = this.data.declarationIds?.length || 0;
    const batchSize = this.options.batchSize || 5;
    const batches = Math.ceil(count / batchSize);
    const estimatedSeconds = batches * 3; // Estimate 3 seconds per batch
    
    if (estimatedSeconds < 60) {
      return `~${estimatedSeconds} secunde`;
    }
    return `~${Math.ceil(estimatedSeconds / 60)} minute`;
  }

  onGenerate() {
    this.isGenerating = true;
    this.dialogRef.close({ action: 'generate', options: this.options });
  }

  onCancel() {
    this.dialogRef.close({ action: 'cancel' });
  }
}
