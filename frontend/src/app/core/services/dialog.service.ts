import { Injectable, ComponentRef, ViewContainerRef, ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { PdfOptionsDialogComponent, PDFDialogData } from '../../components/pdf-options-dialog/pdf-options-dialog.component';

export interface DialogRef {
  close(result?: any): void;
}

@Injectable({
  providedIn: 'root'
})
export class DialogService {
  private openDialogs: ComponentRef<any>[] = [];

  constructor(
    private appRef: ApplicationRef,
    private injector: EnvironmentInjector
  ) {}

  openPdfOptionsDialog(data: PDFDialogData): Promise<any> {
    return new Promise((resolve, reject) => {
      // Create the dialog component
      const componentRef = createComponent(PdfOptionsDialogComponent, {
        environmentInjector: this.injector,
        hostElement: document.body
      });

      // Create a dialog ref
      const dialogRef: DialogRef = {
        close: (result?: any) => {
          this.closeDialog(componentRef);
          resolve(result);
        }
      };

      // Provide the data and dialog ref to the component
      componentRef.setInput('data', data);
      componentRef.setInput('dialogRef', dialogRef);

      // Attach to the application
      this.appRef.attachView(componentRef.hostView);
      
      // Track the dialog
      this.openDialogs.push(componentRef);
    });
  }

  private closeDialog(componentRef: ComponentRef<any>): void {
    const index = this.openDialogs.indexOf(componentRef);
    if (index > -1) {
      this.openDialogs.splice(index, 1);
    }

    this.appRef.detachView(componentRef.hostView);
    componentRef.destroy();
  }

  closeAllDialogs(): void {
    this.openDialogs.forEach(dialog => this.closeDialog(dialog));
  }
}
