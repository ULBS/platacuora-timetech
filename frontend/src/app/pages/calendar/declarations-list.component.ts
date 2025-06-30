export interface Declaration {
  id: string | number;
  userId: string | number;
  perioada: {
    start: string;
    end: string;
  };
  activitati?: any[]; 
  status: 'draft' | 'trimis' | 'aprobat' | 'respins' | 'generata';
  dataCreare: string;
  pdfBase64?: string;
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EnhancedPdfService, PDFOptions } from '../../core/services/enhanced-pdf.service';
import { DialogService } from '../../core/services/dialog.service';


@Component({
  selector: 'app-declarations-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './declarations-list.component.html',
  styleUrls: ['./declarations-list.component.scss']
})
export class DeclarationsListComponent implements OnInit {
  declarations: Declaration[] = [];
  selectedDeclaration: Declaration | null = null;
  selectedDeclarations: Declaration[] = [];
  isGeneratingPDF = false;
  showBatchActions = false;

  constructor(
    private enhancedPdfService: EnhancedPdfService,
    private dialogService: DialogService
  ) {}

  ngOnInit() {
    this.loadDeclarations();
    this.debugDeclarations(); 
  }

  loadDeclarations() {
    const userObj = JSON.parse(localStorage.getItem('user') || '{}'); 
    const userId = userObj.id || userObj._id;
    
    if (!userId) {
      console.warn('Nu există utilizator autentificat');
      this.declarations = [];
      return;
    }
    
    this.declarations = this.getDeclarationsForUser(userId);
    console.log('Declarații încărcate:', this.declarations);
  }

  getDeclarationsForUser(userId: string | number): Declaration[] {
    const allDeclarations = JSON.parse(localStorage.getItem('declarations') || '[]');
    console.log('Toate declarațiile din localStorage:', allDeclarations);
    
    const userDeclarations = allDeclarations.filter((d: Declaration) => {
      return d.userId == userId || d.userId === userId.toString() || d.userId === Number(userId);
    });
    
    console.log('Declarații pentru utilizatorul', userId, ':', userDeclarations);
    return userDeclarations;
  }

  onEdit(decl: Declaration) {
    this.selectedDeclaration = {
      ...decl,
      pdfBase64: decl.pdfBase64,
      activitati: decl.activitati ? [...decl.activitati] : undefined
    };
    
    console.log('Declarație selectată pentru editare:', this.selectedDeclaration);
  }

  saveEdit() {
    if (!this.selectedDeclaration) return;
    let allDeclarations = JSON.parse(localStorage.getItem('declarations') || '[]');
    const originalIndex = allDeclarations.findIndex((d: Declaration) => d.id === this.selectedDeclaration!.id);
    if (originalIndex === -1) {
      console.error('Nu s-a găsit declarația originală');
      return;
    }
    allDeclarations[originalIndex] = {
      ...allDeclarations[originalIndex],
      perioada: this.selectedDeclaration.perioada,
      status: this.selectedDeclaration.status,
      activitati: this.selectedDeclaration.activitati,
      pdfBase64: this.selectedDeclaration.pdfBase64
    };
    localStorage.setItem('declarations', JSON.stringify(allDeclarations));
    this.loadDeclarations();
    this.selectedDeclaration = null;
  }

  cancelEdit() {
    this.selectedDeclaration = null;
  }

  openPdf(decl: Declaration) {
    if (!decl.pdfBase64) {
      alert('Nu există PDF salvat pentru această declarație.');
      return;
    }
    
    try {
      const pdfData = 'data:application/pdf;base64,' + decl.pdfBase64;
      const win = window.open();
      
      if (win) {
        win.document.write(
          `<iframe src="${pdfData}" width="100%" height="100%" style="border:none;"></iframe>`
        );
      } else {
        const link = document.createElement('a');
        link.href = pdfData;
        link.download = `declaratie-${decl.id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Eroare la deschiderea PDF-ului:', error);
      alert('Eroare la deschiderea PDF-ului. Fișierul poate fi corupt.');
    }
  }

  deleteDeclaration(decl: Declaration) {
    if (!confirm('Sigur doriți să ștergeți această declarație?')) return;
    let allDeclarations = JSON.parse(localStorage.getItem('declarations') || '[]');
    allDeclarations = allDeclarations.filter((d: Declaration) => d.id !== decl.id);
    localStorage.setItem('declarations', JSON.stringify(allDeclarations));
    this.loadDeclarations();
  }

  debugDeclarations() {
    const allDeclarations = JSON.parse(localStorage.getItem('declarations') || '[]');
    console.log('=== DEBUG DECLARAȚII ===');
    console.log('Total declarații în localStorage:', allDeclarations.length);
    
    allDeclarations.forEach((decl: Declaration, index: number) => {
      console.log(`Declarația ${index + 1}:`, {
        id: decl.id,
        userId: decl.userId,
        perioada: decl.perioada,
        status: decl.status,
        hasPDF: !!decl.pdfBase64,
        pdfSize: decl.pdfBase64 ? decl.pdfBase64.length : 0,
        hasActivitati: !!decl.activitati,
        activitatiCount: decl.activitati ? decl.activitati.length : 0
      });
    });
    
    const userObj = JSON.parse(localStorage.getItem('user') || '{}');
    console.log('Utilizator curent:', userObj);
    console.log('========================');
  }

  cleanupDeclarations() {
    const allDeclarations = JSON.parse(localStorage.getItem('declarations') || '[]');
    const cleanDeclarations = allDeclarations.filter((decl: Declaration) => 
      decl.id && decl.userId && decl.perioada && decl.status
    );
    
    if (cleanDeclarations.length !== allDeclarations.length) {
      localStorage.setItem('declarations', JSON.stringify(cleanDeclarations));
      console.log(`Curățat ${allDeclarations.length - cleanDeclarations.length} declarații corupte`);
      this.loadDeclarations();
    }
  }

  // ===== ENHANCED PDF METHODS =====

  /**
   * Generate enhanced PDF for a single declaration
   */
  async generateEnhancedPDF(decl: Declaration) {
    try {
      const result = await this.dialogService.openPdfOptionsDialog({
        declarationId: decl.id.toString(),
        mode: 'single'
      });

      if (result?.action === 'generate') {
        this.isGeneratingPDF = true;
        
        try {
          const pdfBlob = await this.enhancedPdfService.generateEnhancedPDF(
            decl.id.toString(), 
            result.options
          ).toPromise();

          if (pdfBlob) {
            // Save PDF to declaration
            const base64 = await this.enhancedPdfService.blobToBase64(pdfBlob);
            this.updateDeclarationPDF(decl, base64);

            // Open PDF in new window
            this.enhancedPdfService.openBlobInNewWindow(pdfBlob);

            this.showSuccessMessage('PDF generat cu succes!');
          }
        } catch (error) {
          console.error('Error generating enhanced PDF:', error);
          this.showErrorMessage('Eroare la generarea PDF-ului: ' + error);
        } finally {
          this.isGeneratingPDF = false;
        }
      }
    } catch (error) {
      console.error('Error opening PDF options dialog:', error);
    }
  }

  /**
   * Generate batch PDFs for selected declarations
   */
  async generateBatchPDFs() {
    if (this.selectedDeclarations.length === 0) {
      this.showErrorMessage('Selectați cel puțin o declarație pentru generarea batch.');
      return;
    }

    try {
      const result = await this.dialogService.openPdfOptionsDialog({
        declarationIds: this.selectedDeclarations.map(d => d.id.toString()),
        mode: 'batch'
      });

      if (result?.action === 'generate') {
        this.isGeneratingPDF = true;
        
        try {
          const batchResult = await this.enhancedPdfService.generateBatchPDFs({
            declarationIds: this.selectedDeclarations.map(d => d.id.toString()),
            options: result.options
          }).toPromise();

          if (batchResult) {
            this.showSuccessMessage(
              `Batch completat: ${batchResult.summary.successful}/${batchResult.summary.total} PDF-uri generate cu succes`
            );

            // Reset selection
            this.selectedDeclarations = [];
            this.showBatchActions = false;
          }
        } catch (error) {
          console.error('Error generating batch PDFs:', error);
          this.showErrorMessage('Eroare la generarea batch PDF: ' + error);
        } finally {
          this.isGeneratingPDF = false;
        }
      }
    } catch (error) {
      console.error('Error opening batch PDF options dialog:', error);
    }
  }

  /**
   * Download enhanced PDF for a declaration
   */
  async downloadEnhancedPDF(decl: Declaration, options: PDFOptions = {}) {
    this.isGeneratingPDF = true;
    
    try {
      const pdfBlob = await this.enhancedPdfService.generateEnhancedPDF(
        decl.id.toString(), 
        { ...options, enhanced: true }
      ).toPromise();

      if (pdfBlob) {
        const filename = `PO-Enhanced-${decl.perioada.start}-${decl.perioada.end}-${decl.id}.pdf`;
        this.enhancedPdfService.downloadBlob(pdfBlob, filename);
        this.showSuccessMessage('PDF descărcat cu succes!');
      }
    } catch (error) {
      console.error('Error downloading enhanced PDF:', error);
      this.showErrorMessage('Eroare la descărcarea PDF-ului: ' + error);
    } finally {
      this.isGeneratingPDF = false;
    }
  }

  /**
   * Preview data integration for a declaration
   */
  async previewDataIntegration(decl: Declaration) {
    try {
      const preview = await this.enhancedPdfService.getDataPreview(decl.id.toString()).toPromise();
      
      if (preview) {
        this.showPreviewDialog(preview);
      }
    } catch (error) {
      console.error('Error getting data preview:', error);
      this.showErrorMessage('Eroare la obținerea preview-ului: ' + error);
    }
  }

  /**
   * Toggle declaration selection for batch operations
   */
  toggleDeclarationSelection(decl: Declaration) {
    const index = this.selectedDeclarations.findIndex(d => d.id === decl.id);
    
    if (index > -1) {
      this.selectedDeclarations.splice(index, 1);
    } else {
      this.selectedDeclarations.push(decl);
    }
    
    this.showBatchActions = this.selectedDeclarations.length > 0;
  }

  /**
   * Select all declarations
   */
  selectAllDeclarations() {
    this.selectedDeclarations = [...this.declarations];
    this.showBatchActions = true;
  }

  /**
   * Clear all selections
   */
  clearAllSelections() {
    this.selectedDeclarations = [];
    this.showBatchActions = false;
  }

  /**
   * Check if declaration is selected
   */
  isDeclarationSelected(decl: Declaration): boolean {
    return this.selectedDeclarations.some(d => d.id === decl.id);
  }

  /**
   * Update declaration with new PDF
   */
  private updateDeclarationPDF(decl: Declaration, pdfBase64: string) {
    let allDeclarations = JSON.parse(localStorage.getItem('declarations') || '[]');
    const index = allDeclarations.findIndex((d: Declaration) => d.id === decl.id);
    
    if (index > -1) {
      allDeclarations[index].pdfBase64 = pdfBase64;
      allDeclarations[index].status = 'generata';
      localStorage.setItem('declarations', JSON.stringify(allDeclarations));
      this.loadDeclarations();
    }
  }

  /**
   * Show preview dialog (simplified implementation)
   */
  private showPreviewDialog(preview: any) {
    const message = `
      Preview Date Integrate:
      - Total ore: ${preview.preview.totalHours}
      - Activități: ${preview.preview.activitiesCount}
      - Discipline: ${preview.preview.disciplinesCount}
      - Înregistrări: ${preview.preview.totalItems}
      
      ${!preview.validation.isValid ? 'ATENȚIE: Date invalide detectate!' : 'Date valide pentru generare'}
    `;
    
    alert(message);
  }

  /**
   * Show success message
   */
  private showSuccessMessage(message: string) {
    // In a real app, you'd use a proper notification service
    alert('✅ ' + message);
  }

  /**
   * Get status label for display
   */
  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'draft': 'Draft',
      'trimis': 'Trimis',
      'aprobat': 'Aprobat', 
      'respins': 'Respins',
      'generata': 'Generată'
    };
    return labels[status] || status;
  }

  /**
   * Show error message
   */
  private showErrorMessage(message: string) {
    // In a real app, you'd use a proper notification service
    alert('❌ ' + message);
  }
}