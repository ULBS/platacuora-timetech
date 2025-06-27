
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
}