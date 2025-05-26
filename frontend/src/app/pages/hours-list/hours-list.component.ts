// src/app/pages/hours-list/hours-list.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TeachingHoursService, TeachingHour } from '../../core/services/teaching-hours.service';

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
  errorMessages: string[] = [];
  specialWeeks = Array.from({ length: 14 }, (_, i) => `S${(i + 1).toString().padStart(2, '0')}`);

  constructor(private fb: FormBuilder, private service: TeachingHoursService) {
    this.hoursForm = this.fb.group({
      hours: this.fb.array([])
    });
  }

  ngOnInit() {
    this.service.loadHours();
    this.service.hours$.subscribe(records => {
      this.hours.clear();
      records.forEach(hour => this.hours.push(this.createHourRow(hour)));
    });
  }

  get hours(): FormArray {
    return this.hoursForm.get('hours') as FormArray;
  }

  createHourRow(data?: Partial<TeachingHour>): FormGroup {
    const group = this.fb.group({
      _id: [data?._id || null],
      faculty: [data?.faculty || '', Validators.required],
      department: [data?.department || '', Validators.required],
      academicYear: [data?.academicYear || '', [Validators.required, Validators.pattern(/^\d{4}\/\d{4}$/)]],
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

  addRow() {
    this.hours.push(this.createHourRow());
  }

  removeRow(index: number) {
    const row = this.hours.at(index);
    const id = row?.value._id;
    if (id) {
      if (confirm('Ești sigur că vrei să ștergi această oră?')) {
        this.service.deleteHour(id).subscribe({
          next: () => this.hours.removeAt(index),
          error: err => alert('Eroare la ștergere.')
        });
      }
    } else {
      this.hours.removeAt(index);
    }
  }

  submitForm() {
    this.submitted = true;
    this.errorMessages = [];

    if (this.hoursForm.invalid) {
      this.hours.controls.forEach((ctrl, i) => {
        if (ctrl.invalid) this.errorMessages.push(`Rândul ${i + 1} conține erori.`);
      });
      return;
    }

    const rows = this.hours.getRawValue();
    const invalidRows = rows.filter((row, index) => {
      const filled = [row.courseHours, row.seminarHours, row.labHours, row.projectHours].filter(v => v && v > 0);
      if (filled.length !== 1) {
        this.errorMessages.push(`Rândul ${index + 1}: Trebuie exact un singur tip de oră completat.`);
        return true;
      }
      return false;
    });

    if (invalidRows.length > 0) return;

    const observables = rows.map(row => row._id ? this.service.updateHour(row._id, row) : this.service.addHour(row));

    Promise.all(observables.map(obs => obs.toPromise()))
      .then(() => {
        alert('Orele au fost salvate!');
        this.service.loadHours();
      })
      .catch(() => alert('Eroare la salvare.'));
  }
}
