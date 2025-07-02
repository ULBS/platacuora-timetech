import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SemesterService, SemesterConfig, SemesterDates } from '../core/services/semester.service';

describe('SemesterService', () => {
  let service: SemesterService;
  let httpMock: HttpTestingController;

  const mockConfig: SemesterConfig = {
    academicYear: '2024/2025',
    semester: 1,
    faculty: 'FMI',
    startDate: '2025-02-15',
    endDate: '2025-06-30',
  };

  const mockDates: SemesterDates = {
    start: '2025-02-15',
    end: '2025-06-30',
  };

  beforeEach(() => {
    localStorage.setItem('currentUser', JSON.stringify({ token: 'test-token' }));

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SemesterService]
    });

    service = TestBed.inject(SemesterService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    localStorage.removeItem('currentUser');
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get all configs', () => {
    service.getAllConfigs().subscribe(configs => {
      expect(configs.length).toBe(1);
      expect(configs[0].academicYear).toBe('2024/2025');
    });

    const req = httpMock.expectOne('http://localhost:5000/api/semester');
    expect(req.request.method).toBe('GET');
    req.flush([mockConfig]);
  });

  it('should get config by id', () => {
    const id = 'abc123';
    service.getConfigById(id).subscribe(config => {
      expect(config.semester).toBe(1);
    });

    const req = httpMock.expectOne(`http://localhost:5000/api/semester/${id}`);
    req.flush(mockConfig);
  });

  it('should get current config', () => {
    service.getCurrentConfig('FMI').subscribe(config => {
      expect(config.faculty).toBe('FMI');
    });

    const req = httpMock.expectOne('http://localhost:5000/api/semester/current?faculty=FMI');
    expect(req.request.method).toBe('GET');
    req.flush(mockConfig);
  });

  it('should create a new config', () => {
    service.createConfig(mockConfig).subscribe(result => {
      expect(result.academicYear).toBe('2024/2025');
    });

    const req = httpMock.expectOne('http://localhost:5000/api/semester');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
    req.flush(mockConfig);
  });

  it('should update a config', () => {
    service.updateConfig('abc123', { semester: 2 }).subscribe(result => {
      expect(result.semester).toBe(2);
    });

    const req = httpMock.expectOne('http://localhost:5000/api/semester/abc123');
    expect(req.request.method).toBe('PUT');
    req.flush({ ...mockConfig, semester: 2 });
  });

  it('should delete a config', () => {
    service.deleteConfig('abc123').subscribe(result => {
      expect(result).toBeNull();
    });

    const req = httpMock.expectOne('http://localhost:5000/api/semester/abc123');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('should generate weeks', () => {
    service.generateWeeks('abc123', true).subscribe(response => {
      expect(response.success).toBeTrue();
    });

    const req = httpMock.expectOne('http://localhost:5000/api/semester/abc123/generate-weeks');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ oddWeekStart: true });
    req.flush({ success: true });
  });

  it('should validate calendar', () => {
    service.validateCalendar('abc123').subscribe(response => {
      expect(response.valid).toBeTrue();
    });

    const req = httpMock.expectOne('http://localhost:5000/api/semester/abc123/validate-calendar');
    expect(req.request.method).toBe('POST');
    req.flush({ valid: true });
  });

  it('should activate config', () => {
    service.activateConfig('abc123').subscribe(response => {
      expect(response.activated).toBeTrue();
    });

    const req = httpMock.expectOne('http://localhost:5000/api/semester/abc123/activate');
    expect(req.request.method).toBe('PUT');
    req.flush({ activated: true });
  });

  it('should add a vacation period', () => {
    const period = { name: 'Vacanță Paște', startDate: '2025-04-10', endDate: '2025-04-17' };

    service.addVacationPeriod('abc123', period).subscribe(response => {
      expect(response.success).toBeTrue();
    });

    const req = httpMock.expectOne('http://localhost:5000/api/semester/abc123/vacation-periods');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(period);
    req.flush({ success: true });
  });

  it('should get week info', () => {
    service.getWeekInfo('abc123', '2025-03-01').subscribe(data => {
      expect(data.weekNumber).toBe(3);
    });

    const req = httpMock.expectOne('http://localhost:5000/api/semester/abc123/week-info?date=2025-03-01');
    expect(req.request.method).toBe('GET');
    req.flush({ weekNumber: 3 });
  });

  it('should get configs by faculty', () => {
    service.getConfigsByFaculty('FMI', '2024/2025', 1, 'active').subscribe(data => {
      expect(data.length).toBe(1);
    });

    const req = httpMock.expectOne('http://localhost:5000/api/semester/faculty/FMI?year=2024/2025&semester=1&status=active');
    expect(req.request.method).toBe('GET');
    req.flush([mockConfig]);
  });

  it('should get semester dates', () => {
    service.getSemesterDates().subscribe(dates => {
      expect(dates.start).toBe('2025-02-15');
    });

    const req = httpMock.expectOne('/api/calendar/semester-dates');
    expect(req.request.method).toBe('GET');
    req.flush(mockDates);
  });

  it('should save semester dates', () => {
    service.saveSemesterDates(mockDates).subscribe(response => {
      expect(response.success).toBeTrue();
    });

    const req = httpMock.expectOne('/api/calendar/semester-dates');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockDates);
    req.flush({ success: true });
  });

  it('should update semester config directly', () => {
    const update = { status: 'final' };
    service.updateSemesterConfig('abc123', update).subscribe(response => {
      expect((response as any).status).toBe('final');
    });

    const req = httpMock.expectOne('/api/semester/abc123');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(update);
    req.flush({ status: 'final' });
  });
});
