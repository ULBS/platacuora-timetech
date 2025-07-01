import { Component, OnInit } from '@angular/core';
import {
  FormBuilder, FormGroup, Validators, FormArray,
  ReactiveFormsModule, FormsModule, AbstractControl
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TeachingHoursService, TeachingHour } from '../../core/services/teaching-hours.service';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
import { forkJoin, take } from 'rxjs';
import { SharedStatusService } from '../../core/services/shared-status.service';

@Component({
  standalone: true,
  selector: 'app-hours-list',
  templateUrl: './hours-list.component.html',
  styleUrls: ['./hours-list.component.scss'],
  imports: [CommonModule, ReactiveFormsModule, FormsModule]
})
export class HoursListComponent implements OnInit {
  hoursForm: FormGroup;
  submitted = false;
  isSaving = false;
  errorMessages: string[] = [];
  specialWeeks = Array.from({ length: 14 }, (_, i) => `S${(i + 1).toString().padStart(2, '0')}`);
  massEditField = '';
  massEditValue = '';
  filters = { discipline: '', activityType: '', academicYear: '', semester: '' };
  selected: boolean[] = [];
  filteredRows: { ctrl: AbstractControl }[] = [];
  isEditing: boolean = false;
  isVerified: boolean = false;

  constructor(
    private fb: FormBuilder, 
    private service: TeachingHoursService,
    private sharedStatusService: SharedStatusService 
  ) {
    this.hoursForm = this.fb.group({
      hours: this.fb.array([])
    });
  }

  get hours(): FormArray {
    return this.hoursForm.get('hours') as FormArray;
  }

  ngOnInit() {
    this.loadData();

    this.hoursForm.valueChanges.subscribe(() => {
      this.isEditing = true;
      this.isVerified = false;
      this.sharedStatusService.setHoursEditingStatus(true);
    });
  }

 loadData() {
    this.service.loadHours();
    this.service.hours$.subscribe(records => {
      this.hours.clear();
      this.selected = [];
      records.forEach(hour => {
        const row = this.createHourRow(hour);
        this.hours.push(row);
        this.selected.push(false);
      });
      this.updateFilteredRows();
      this.isEditing = false;
      this.isVerified = true; 
      this.sharedStatusService.setHoursEditingStatus(false);
    });
  }

  addRow() {
    const row = this.createHourRow();
    this.hours.push(row);
    this.selected.push(false);
    this.updateFilteredRows();
    this.isEditing = true;
    this.isVerified = false;
    this.sharedStatusService.setHoursEditingStatus(true);
  }

  removeRow(index: number) {
    const row = this.hours.at(index);
    const id = row?.value._id;
    if (id) {
      if (confirm('Ești sigur că vrei să ștergi această oră?')) {
        this.service.deleteHour(id).subscribe({
          next: () => {
            this.hours.removeAt(index);
            this.selected.splice(index, 1);
            this.updateFilteredRows();
            this.isEditing = true;
            this.isVerified = false;
            this.sharedStatusService.setHoursEditingStatus(true);
          },
          error: (err) => {
            console.error('Error deleting hour:', err);
            alert('Eroare la ștergere');
          }
        });
      }
    } else {
      this.hours.removeAt(index);
      this.selected.splice(index, 1);
      this.updateFilteredRows();
      this.isEditing = true;
      this.isVerified = false;
    }
  }
  updateFilteredRows(): void {
    const values = this.hours.getRawValue();
    this.filteredRows = this.hours.controls
      .map((ctrl, index) => ({ ctrl, index, value: values[index] }))
      .filter(({ value }) => {
        return (
          (!this.filters.discipline || 
           (value.disciplineName && value.disciplineName.toLowerCase().includes(this.filters.discipline.toLowerCase()))) &&
          (!this.filters.activityType || value.activityType === this.filters.activityType) &&
          (!this.filters.academicYear || value.academicYear === this.filters.academicYear) &&
          (!this.filters.semester || value.semester == this.filters.semester)
        );
      })
      .map(({ ctrl }) => ({ ctrl }));
  }

  trackByIndex = (_: number, row: { ctrl: AbstractControl }) =>
    this.hours.controls.indexOf(row.ctrl);

  toggleAll(event: any) {
    const checked = event.target.checked;
    this.selected = this.selected.map(() => checked);
  }


hasSelectedRows(): boolean {
  return this.selected.some(isSelected => isSelected);
}

updateSelectedRows() {
  if (this.isSaving) return;
  
  this.isSaving = true;
  this.errorMessages = [];

  const rows = this.hours.getRawValue();
  const selectedRows = rows.filter((_, index) => this.selected[index] && rows[index]._id);

  if (selectedRows.length === 0) {
    this.errorMessages.push('Nu ai selectat niciun rând pentru actualizare sau rândurile selectate nu au ID.');
    this.isSaving = false;
    return;
  }

  const invalidRows = selectedRows.filter(row => {
    const filled = [row.courseHours, row.seminarHours, row.labHours, row.projectHours].filter(v => v && v > 0);
    if (filled.length === 0) {
      this.errorMessages.push(`Rândul cu ID ${row._id}: Trebuie completat cel puțin un tip de oră.`);
      return true;
    }
    return false;
  });

  if (invalidRows.length > 0) {
    this.isSaving = false;
    return;
  }

  const updateRequests = selectedRows.map(row => 
    this.service.updateHour(row._id, this.cleanHour(row))
  );

  forkJoin(updateRequests).subscribe({
    next: () => {
      alert('Rândurile selectate au fost actualizate cu succes!');
      this.loadData();
    },
    error: (err) => {
      console.error('Eroare la actualizare:', err);
      this.errorMessages.push('Eroare la actualizarea unor rânduri. Verifică consola pentru detalii.');
      this.isSaving = false;
    },
    complete: () => {
      this.isSaving = false;
    }
  });
}

  createHourRow(data?: Partial<TeachingHour>): FormGroup {
    const group = this.fb.group({
      _id: [data?._id ?? undefined],
      faculty: [data?.faculty || '', Validators.required],
      department: [data?.department || '', Validators.required],
      academicYear: [data?.academicYear || '', [Validators.required, Validators.pattern(/^[0-9]{4}\/[0-9]{4}$/)]],
      semester: [data?.semester || 1, [Validators.required, Validators.min(1), Validators.max(2)]],
      postNumber: [data?.postNumber || 1, [Validators.required, Validators.min(1)]],
      postGrade: [data?.postGrade || 'Asist', Validators.required],
      disciplineName: [data?.disciplineName || '', Validators.required],
      courseHours: [data?.courseHours || 0],
      seminarHours: [data?.seminarHours || 0],
      labHours: [data?.labHours || 0],
      projectHours: [data?.projectHours || 0],
      activityType: [data?.activityType || 'LR', Validators.required],
      group: [data?.group || '', Validators.required],
      dayOfWeek: [data?.dayOfWeek || 'Luni', Validators.required],
      oddEven: [data?.oddEven || ''],
      isSpecial: [data?.isSpecial || false],
      specialWeek: [data?.specialWeek || ''],
      totalHours: [data?.totalHours || 0],
      notes: [data?.notes || '']
    });

    group.get('specialWeek')?.valueChanges.subscribe((val) => {
      const totalHoursCtrl = group.get('totalHours');
      if (val) {
        totalHoursCtrl?.enable();
        group.patchValue({ isSpecial: true });
      } else {
        totalHoursCtrl?.disable();
        group.patchValue({ isSpecial: false, totalHours: 0 });
      }
    });

    if (!data?.specialWeek) group.get('totalHours')?.disable();
    return group;
  }

  

  applyMassEdit(field: string, value: any) {
    if (!field) {
      alert('Selectați un câmp pentru editare în masă');
      return;
    }
    this.hours.controls.forEach((group, index) => {
      if (this.selected[index]) {
        group.get(field)?.setValue(value);
      }
    });
  }

  exportToExcel() {
    const data = this.hours.getRawValue();
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = { Sheets: { 'Ore': worksheet }, SheetNames: ['Ore'] };
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    FileSaver.saveAs(blob, 'ore-didactice.xlsx');
  }

   async submitForm() {
    if (this.isSaving) return;
    
    this.submitted = true;
    this.isSaving = true;
    this.errorMessages = [];

    if (this.hoursForm.invalid) {
      this.hours.controls.forEach((ctrl, i) => {
        if (ctrl.invalid) {
          this.errorMessages.push(`Rândul ${i + 1} conține erori.`);
          console.error(`Rândul ${i + 1} este invalid:`, ctrl.value);
        }
      });
      this.isSaving = false;
      return;
    }

    const rows = this.hours.getRawValue();
    console.log('Date trimise către backend:', rows);

    const invalidRows = rows.filter((row, index) => {
      const filled = [row.courseHours, row.seminarHours, row.labHours, row.projectHours].filter(v => v && v > 0);
      if (filled.length === 0) {
        const msg = `Rândul ${index + 1}: Trebuie completat cel puțin un tip de oră.`;
        this.errorMessages.push(msg);
        console.error(msg, row);
        return true;
      }
      return false;
    });

    if (invalidRows.length > 0) {
      this.isSaving = false;
      return;
    }

    try {
      for (const row of rows) {
        const cleanRow = this.cleanHour(row);
        if (row._id) {
          await this.service.updateHour(row._id, cleanRow).toPromise();
        } else {
          await this.service.addHour(cleanRow).toPromise();
        }
      }
      
      alert('Orele au fost salvate cu succes!');
      
      this.service.loadHours();
      this.service.hours$.pipe(take(1)).subscribe(() => {
        this.isEditing = false;
        this.isVerified = true;
        this.sharedStatusService.setHoursEditingStatus(false);
      });
      
    } catch (err) {
      console.error('Eroare la salvare:', err);
      this.errorMessages.push('Eroare la salvare. Verifică consola pentru detalii.');
    } finally {
      this.isSaving = false;
    }
  }

  private cleanHour(row: any): TeachingHour {
    const copy = { ...row };
    if (copy._id === null) delete copy._id;
    return copy as TeachingHour;
  }


  
}