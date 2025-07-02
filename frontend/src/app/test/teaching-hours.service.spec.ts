import { TestBed } from '@angular/core/testing';
import { TeachingHoursService, TeachingHour } from '../core/services/teaching-hours.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

describe('TeachingHoursService', () => {
  let service: TeachingHoursService;
  let httpMock: HttpTestingController;

  const mockHour: TeachingHour = {
    faculty: 'FMI',
    department: 'Informatica',
    academicYear: '2024/2025',
    semester: 1,
    postNumber: 1,
    postGrade: 'Asist',
    disciplineName: 'PWEB',
    courseHours: 2,
    activityType: 'LR',
    group: 'A1',
    dayOfWeek: 'Luni'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TeachingHoursService]
    });

    service = TestBed.inject(TeachingHoursService);
    httpMock = TestBed.inject(HttpTestingController);
  });

 afterEach(() => {
  
  const requests = httpMock.match(() => true);
  for (const req of requests) {
    try {
      req.flush({}, { status: 200, statusText: 'OK' });
    } catch (e) {}
  }
  httpMock.verify();
});


  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load teaching hours and update BehaviorSubject', () => {
    const mockData = { records: [mockHour] };
    service.loadHours();

    const req = httpMock.expectOne(req => req.method === 'GET');
    expect(req.request.withCredentials).toBeTrue();
    req.flush(mockData);

    service.hours$.subscribe(data => {
      expect(data.length).toBe(1);
      expect(data[0].disciplineName).toBe('PWEB');
    });
  });

  it('should add a teaching hour', () => {
    service.addHour(mockHour).subscribe(hour => {
      expect(hour.disciplineName).toBe('PWEB');
    });

    const postReq = httpMock.expectOne(req => req.method === 'POST');
    expect(postReq.request.body).toEqual(mockHour);
    postReq.flush(mockHour);

    const getReq = httpMock.expectOne(req => req.method === 'GET');
    getReq.flush({ records: [mockHour] });
  });

  it('should update a teaching hour', () => {
    const updated = { ...mockHour, disciplineName: 'PCLP' };
    const id = '123';

    service.updateHour(id, updated).subscribe(hour => {
      expect(hour.disciplineName).toBe('PCLP');
    });

    const putReq = httpMock.expectOne(`${(service as any).apiUrl}/${id}`);
    expect(putReq.request.method).toBe('PUT');
    putReq.flush(updated);

    const getReq = httpMock.expectOne(req => req.method === 'GET');
    getReq.flush({ records: [updated] });
  });

  it('should delete a teaching hour', () => {
    const id = '123';

    service.deleteHour(id).subscribe(result => {
      expect(result).toBeNull();
    });

    const deleteReq = httpMock.expectOne(`${(service as any).apiUrl}/${id}`);
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null);

    const getReq = httpMock.expectOne(req => req.method === 'GET');
    getReq.flush({ records: [] });
  });

  it('should handle error on loadHours', () => {
    spyOn(console, 'error');

    service.loadHours();

    const req = httpMock.expectOne(req => req.method === 'GET');
    req.flush('Eroare server', { status: 500, statusText: 'Internal Server Error' });

    service.hours$.subscribe(data => {
      expect(data).toEqual([]);
    });
  });

  it('should handle error on addHour', () => {
    spyOn(console, 'error');

    service.addHour(mockHour).subscribe({
      next: () => fail('should have errored'),
      error: (err) => {
        expect(err.status).toBe(500);
      }
    });

    const postReq = httpMock.expectOne(req => req.method === 'POST');
    postReq.flush({ message: 'Eroare' }, { status: 500, statusText: 'Server Error' });
  });

  it('should handle error on updateHour', () => {
    spyOn(console, 'error');

    const id = 'testId';
    const updatedHour = { ...mockHour, disciplineName: 'PCLP' };

    service.updateHour(id, updatedHour).subscribe({
      next: () => fail('should have errored'),
      error: (err) => {
        expect(err.status).toBe(404);
      }
    });

    const req = httpMock.expectOne(`${(service as any).apiUrl}/${id}`);
    req.flush({ message: 'Not found' }, { status: 404, statusText: 'Not Found' });
  });

  it('should handle error on deleteHour', () => {
    spyOn(console, 'error');

    const id = 'testId';

    service.deleteHour(id).subscribe({
      next: () => fail('should have errored'),
      error: (err) => {
        expect(err.status).toBe(403);
      }
    });

    const req = httpMock.expectOne(`${(service as any).apiUrl}/${id}`);
    req.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
  });
});
