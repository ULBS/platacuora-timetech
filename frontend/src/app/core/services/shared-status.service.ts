import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SharedStatusService {
  private hoursEditingStatusSubject = new BehaviorSubject<boolean>(false);
  public hoursEditingStatus$: Observable<boolean> = this.hoursEditingStatusSubject.asObservable();

  setHoursEditingStatus(isEditing: boolean): void {
    this.hoursEditingStatusSubject.next(isEditing);
  }
}