import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CalendarService, Holiday, HolidayResponse } from '../../core/services/calendar.service';

describe('CalendarService', () => {
  let service: CalendarService;
  let httpMock: HttpTestingController;

  const mockApiHolidays: Holiday[] = [
    {
      name: 'Ziua Națională',
      date: [{ date: '12/01/2025', weekday: 'Monday' }]
    },
    {
      name: 'Crăciunul',
      date: [
        { date: '12/25/2025', weekday: 'Thursday' },
        { date: '12/26/2025', weekday: 'Friday' }
      ]
    }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CalendarService]
    });
    service = TestBed.inject(CalendarService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get public holidays and transform them correctly', () => {
    service.getPublicHolidays(2025, 'RO').subscribe((holidays: HolidayResponse[]) => {
      expect(holidays.length).toBe(3);
      expect(holidays[0].localName).toBe('Ziua Națională');
      expect(holidays[1].date).toBe('12-25-2025');
      expect(holidays[2].date).toBe('12-26-2025');
    });

    const req = httpMock.expectOne('/api/2025');
    expect(req.request.method).toBe('GET');
    req.flush(mockApiHolidays);
  });

  it('should return empty list on error', () => {
    service.getPublicHolidays(2025).subscribe((holidays: HolidayResponse[]) => {
      expect(holidays).toEqual([]);
    });

    const req = httpMock.expectOne('/api/2025');
    req.flush('Error', { status: 500, statusText: 'Internal Server Error' });
  });

  it('should detect non-working weekend days', () => {
    const dummyHolidays: HolidayResponse[] = [];
    const saturday = new Date('2025-04-12'); // Saturday
    const sunday = new Date('2025-04-13');   // Sunday

    expect(service.isWorkingDay(saturday, dummyHolidays)).toBeFalse();
    expect(service.isWorkingDay(sunday, dummyHolidays)).toBeFalse();
  });

  it('should detect working weekday if not holiday', () => {
    const dummyHolidays: HolidayResponse[] = [
      { date: '2025-04-10', localName: 'Paște', name: 'Paște', countryCode: 'RO', fixed: true, global: true, counties: null, launchYear: null, types: ['Public'] }
    ];
    const date = new Date('2025-04-09'); // Wednesday

    expect(service.isWorkingDay(date, dummyHolidays)).toBeTrue();
  });

  it('should detect non-working weekday if it is a public holiday', () => {
    const dummyHolidays: HolidayResponse[] = [
      { date: '2025-04-10', localName: 'Paște', name: 'Paște', countryCode: 'RO', fixed: true, global: true, counties: null, launchYear: null, types: ['Public'] }
    ];
    const date = new Date('2025-04-10'); // Thursday

    expect(service.isWorkingDay(date, dummyHolidays)).toBeFalse();
  });

  it('should format date correctly for API', () => {
    const result = (service as any).formatDateForApi(new Date('2025-02-03'));
    expect(result).toBe('2025-02-03');
  });

  it('should correctly transform holidays to HolidayResponse', () => {
    const response = (service as any).transformHolidaysToHolidayResponse(mockApiHolidays, 'RO', 2025);

    expect(response.length).toBe(3);
    expect(response[0].date).toBe('12-01-2025');
    expect(response[1].date).toBe('12-25-2025');
    expect(response[2].date).toBe('12-26-2025');
    expect(response[0].types).toEqual(['Public']);
    expect(response[0].countryCode).toBe('RO');
  });
});
