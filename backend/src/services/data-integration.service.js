const TeachingHours = require('../models/teaching-hours.model');
const Calendar = require('../models/calendar.model');
const moment = require('moment');

class DataIntegrationService {
  /**
   * Integrate teaching hours with calendar data for PDF generation
   */
  async integrateDeclarationData(declarationId, userId, startDate, endDate) {
    try {
      // Fetch teaching hours for the period
      const teachingHours = await this.getTeachingHoursForPeriod(
        userId, 
        startDate, 
        endDate
      );

      // Fetch calendar data for the period
      const calendarData = await this.getCalendarDataForPeriod(
        userId,
        startDate,
        endDate
      );

      // Integrate and process the data
      const integratedData = await this.processIntegratedData(
        teachingHours,
        calendarData,
        startDate,
        endDate
      );

      return integratedData;
    } catch (error) {
      console.error('Error integrating declaration data:', error);
      throw error;
    }
  }

  /**
   * Get teaching hours for a specific period
   */
  async getTeachingHoursForPeriod(userId, startDate, endDate) {
    const start = moment(startDate).startOf('day');
    const end = moment(endDate).endOf('day');

    const teachingHours = await TeachingHours.find({
      user: userId,
      createdAt: {
        $gte: start.toDate(),
        $lte: end.toDate()
      }
    })
    .populate('user', 'firstName lastName email position faculty department')
    .sort({ createdAt: 1 });

    return teachingHours;
  }

  /**
   * Get calendar data for a specific period
   */
  async getCalendarDataForPeriod(userId, startDate, endDate) {
    const start = moment(startDate).startOf('day');
    const end = moment(endDate).endOf('day');

    const calendar = await Calendar.findOne({
      user: userId,
      'days.date': {
        $gte: start.toDate(),
        $lte: end.toDate()
      }
    });

    if (!calendar) {
      return { days: [] };
    }

    // Filter days within the specified period
    const filteredDays = calendar.days.filter(day => {
      const dayMoment = moment(day.date);
      return dayMoment.isBetween(start, end, null, '[]');
    });

    return {
      ...calendar.toObject(),
      days: filteredDays
    };
  }

  /**
   * Process and integrate teaching hours with calendar data
   */
  async processIntegratedData(teachingHours, calendarData, startDate, endDate) {
    const processedItems = [];
    const calendarDays = new Map();
    
    // Create a map of calendar days for quick lookup
    calendarData.days?.forEach(day => {
      const dateKey = moment(day.date).format('YYYY-MM-DD');
      calendarDays.set(dateKey, day);
    });

    // Process each teaching hour record
    for (const teachingHour of teachingHours) {
      const items = await this.generateDeclarationItems(teachingHour, calendarDays, startDate, endDate);
      processedItems.push(...items);
    }

    // Group and summarize the data
    const groupedItems = this.groupDeclarationItems(processedItems);
    
    return {
      items: groupedItems,
      summary: this.calculateSummary(groupedItems),
      metadata: {
        totalTeachingHourRecords: teachingHours.length,
        totalCalendarDays: calendarData.days?.length || 0,
        processedItems: groupedItems.length,
        period: {
          startDate,
          endDate,
          totalDays: moment(endDate).diff(moment(startDate), 'days') + 1
        }
      }
    };
  }

  /**
   * Generate declaration items from teaching hour record
   */
  async generateDeclarationItems(teachingHour, calendarDays, startDate, endDate) {
    const items = [];
    const start = moment(startDate);
    const end = moment(endDate);
    
    // Determine the coefficient based on activity type and level
    const coefficient = this.calculateCoefficient(teachingHour);
    
    // Get total hours for this teaching hour type
    const hourlyData = this.getHourlyData(teachingHour);

    // Generate items for each working day in the period
    let currentDate = start.clone();
    while (currentDate.isSameOrBefore(end)) {
      const dateKey = currentDate.format('YYYY-MM-DD');
      const calendarDay = calendarDays.get(dateKey);
      
      // Check if this is a valid teaching day
      if (this.isValidTeachingDay(teachingHour, currentDate, calendarDay)) {
        const item = {
          postNumber: teachingHour.postNumber,
          postGrade: teachingHour.postGrade,
          date: currentDate.toDate(),
          disciplineName: teachingHour.disciplineName,
          courseHours: hourlyData.courseHours,
          seminarHours: hourlyData.seminarHours,
          labHours: hourlyData.labHours,
          projectHours: hourlyData.projectHours,
          activityType: teachingHour.activityType,
          coefficient: coefficient,
          totalHours: hourlyData.totalHours,
          groups: teachingHour.group,
          calendarInfo: calendarDay ? {
            isWorkingDay: calendarDay.isWorkingDay,
            oddEven: calendarDay.oddEven,
            semesterWeek: calendarDay.semesterWeek,
            isHoliday: calendarDay.isHoliday
          } : null
        };
        
        items.push(item);
      }
      
      currentDate.add(1, 'day');
    }

    return items;
  }

  /**
   * Check if a day is valid for teaching based on teaching hour configuration
   */
  isValidTeachingDay(teachingHour, date, calendarDay) {
    // Check if it's a working day
    if (calendarDay && !calendarDay.isWorkingDay) {
      return false;
    }

    // Check if it's a holiday
    if (calendarDay && calendarDay.isHoliday) {
      return false;
    }

    // Check day of week
    const dayNames = ['Duminica', 'Luni', 'Marti', 'Miercuri', 'Joi', 'Vineri', 'Sambata'];
    const dayOfWeek = dayNames[date.day()];
    
    if (teachingHour.dayOfWeek !== dayOfWeek) {
      return false;
    }

    // Check odd/even weeks if specified
    if (teachingHour.oddEven && calendarDay) {
      if (teachingHour.oddEven !== calendarDay.oddEven) {
        return false;
      }
    }

    // Check special weeks for medicine faculty
    if (teachingHour.isSpecial && teachingHour.specialWeek) {
      if (!calendarDay || calendarDay.semesterWeek !== teachingHour.specialWeek) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get hourly data from teaching hour record
   */
  getHourlyData(teachingHour) {
    const courseHours = teachingHour.courseHours || 0;
    const seminarHours = teachingHour.seminarHours || 0;
    const labHours = teachingHour.labHours || 0;
    const projectHours = teachingHour.projectHours || 0;
    
    return {
      courseHours,
      seminarHours,
      labHours,
      projectHours,
      totalHours: courseHours + seminarHours + labHours + projectHours
    };
  }

  /**
   * Calculate coefficient based on activity type and level
   */
  calculateCoefficient(teachingHour) {
    const coefficients = {
      'LR': { // Licență română
        'curs': 1.0,
        'seminar': 1.0,
        'laborator': 1.0,
        'proiect': 1.0
      },
      'LE': { // Licență engleză
        'curs': 1.2,
        'seminar': 1.2,
        'laborator': 1.2,
        'proiect': 1.2
      },
      'MR': { // Master română
        'curs': 1.1,
        'seminar': 1.1,
        'laborator': 1.1,
        'proiect': 1.1
      },
      'ME': { // Master engleză
        'curs': 1.3,
        'seminar': 1.3,
        'laborator': 1.3,
        'proiect': 1.3
      }
    };

    const activityCoeffs = coefficients[teachingHour.activityType] || coefficients['LR'];
    
    // Determine the type of activity
    if (teachingHour.courseHours > 0) return activityCoeffs.curs;
    if (teachingHour.seminarHours > 0) return activityCoeffs.seminar;
    if (teachingHour.labHours > 0) return activityCoeffs.laborator;
    if (teachingHour.projectHours > 0) return activityCoeffs.proiect;
    
    return 1.0; // Default coefficient
  }

  /**
   * Group similar declaration items to reduce redundancy
   */
  groupDeclarationItems(items) {
    const groupedMap = new Map();
    
    items.forEach(item => {
      // Create a key for grouping similar items
      const key = `${item.postNumber}-${item.disciplineName}-${item.activityType}-${item.groups}-${moment(item.date).format('YYYY-MM-DD')}`;
      
      if (groupedMap.has(key)) {
        const existing = groupedMap.get(key);
        existing.courseHours += item.courseHours;
        existing.seminarHours += item.seminarHours;
        existing.labHours += item.labHours;
        existing.projectHours += item.projectHours;
        existing.totalHours += item.totalHours;
      } else {
        groupedMap.set(key, { ...item });
      }
    });
    
    return Array.from(groupedMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  /**
   * Calculate summary statistics
   */
  calculateSummary(items) {
    const summary = {
      totalCourseHours: 0,
      totalSeminarHours: 0,
      totalLabHours: 0,
      totalProjectHours: 0,
      totalHours: 0,
      totalDays: 0,
      activitiesByType: {},
      activitiesByDiscipline: {}
    };

    items.forEach(item => {
      summary.totalCourseHours += item.courseHours;
      summary.totalSeminarHours += item.seminarHours;
      summary.totalLabHours += item.labHours;
      summary.totalProjectHours += item.projectHours;
      summary.totalHours += item.totalHours;
      summary.totalDays++;

      // Group by activity type
      if (!summary.activitiesByType[item.activityType]) {
        summary.activitiesByType[item.activityType] = {
          count: 0,
          hours: 0
        };
      }
      summary.activitiesByType[item.activityType].count++;
      summary.activitiesByType[item.activityType].hours += item.totalHours;

      // Group by discipline
      if (!summary.activitiesByDiscipline[item.disciplineName]) {
        summary.activitiesByDiscipline[item.disciplineName] = {
          count: 0,
          hours: 0
        };
      }
      summary.activitiesByDiscipline[item.disciplineName].count++;
      summary.activitiesByDiscipline[item.disciplineName].hours += item.totalHours;
    });

    return summary;
  }

  /**
   * Validate integrated data before PDF generation
   */
  validateIntegratedData(integratedData) {
    const errors = [];
    
    if (!integratedData.items || integratedData.items.length === 0) {
      errors.push('Nu există înregistrări de ore pentru perioada specificată');
    }

    integratedData.items.forEach((item, index) => {
      if (!item.date) {
        errors.push(`Înregistrarea ${index + 1}: Data lipsește`);
      }
      
      if (!item.disciplineName) {
        errors.push(`Înregistrarea ${index + 1}: Numele disciplinei lipsește`);
      }
      
      if (item.totalHours <= 0) {
        errors.push(`Înregistrarea ${index + 1}: Numărul total de ore trebuie să fie pozitiv`);
      }
      
      if (!item.activityType) {
        errors.push(`Înregistrarea ${index + 1}: Tipul activității lipsește`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate summary report for multiple declarations
   */
  async generateSummaryReport(userId, academicYear, semester) {
    try {
      const allTeachingHours = await TeachingHours.find({
        user: userId,
        academicYear,
        semester
      });

      const summary = {
        academicYear,
        semester,
        totalRecords: allTeachingHours.length,
        totalHours: 0,
        byActivityType: {},
        byDiscipline: {},
        byMonth: {}
      };

      allTeachingHours.forEach(record => {
        const totalHours = (record.courseHours || 0) + 
                          (record.seminarHours || 0) + 
                          (record.labHours || 0) + 
                          (record.projectHours || 0);
        
        summary.totalHours += totalHours;

        // By activity type
        if (!summary.byActivityType[record.activityType]) {
          summary.byActivityType[record.activityType] = { count: 0, hours: 0 };
        }
        summary.byActivityType[record.activityType].count++;
        summary.byActivityType[record.activityType].hours += totalHours;

        // By discipline
        if (!summary.byDiscipline[record.disciplineName]) {
          summary.byDiscipline[record.disciplineName] = { count: 0, hours: 0 };
        }
        summary.byDiscipline[record.disciplineName].count++;
        summary.byDiscipline[record.disciplineName].hours += totalHours;

        // By month
        const month = moment(record.createdAt).format('YYYY-MM');
        if (!summary.byMonth[month]) {
          summary.byMonth[month] = { count: 0, hours: 0 };
        }
        summary.byMonth[month].count++;
        summary.byMonth[month].hours += totalHours;
      });

      return summary;
    } catch (error) {
      console.error('Error generating summary report:', error);
      throw error;
    }
  }
}

module.exports = new DataIntegrationService();
