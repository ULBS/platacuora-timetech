module.exports = {
  pdf: {
    // Page settings
    pageSize: 'A4',
    margins: {
      top: 50,
      bottom: 50,
      left: 50,
      right: 50
    },
    
    // ULBS Branding
    branding: {
      primaryColor: '#1e3a8a',
      secondaryColor: '#64748b',
      accentColor: '#dc2626',
      textColor: '#1f2937',
      lightGray: '#f3f4f6',
      darkGray: '#374151'
    },
    
    // University information
    university: {
      name: 'UNIVERSITATEA "LUCIAN BLAGA" DIN SIBIU',
      nameEn: 'Lucian Blaga University of Sibiu',
      address: 'Bd. Victoriei nr. 10, Sibiu 550024, Romania',
      website: 'https://www.ulbsibiu.ro',
      logoPath: './assets/ulbs-logo.png'
    },
    
    // Template settings
    templates: {
      default: 'ulbs-official',
      available: {
        'ulbs-official': {
          name: 'Template Oficial ULBS',
          description: 'Template oficial conform cerințelor ULBS',
          features: [
            'Header cu branding ULBS',
            'Tabel optimizat pentru date TeachingHours',
            'Integrare Calendar pentru validarea datelor',
            'Suport pentru semnătură digitală',
            'QR code pentru verificare',
            'Watermark pentru draft-uri',
            'Optimizat pentru imprimare'
          ]
        },
        'legacy': {
          name: 'Template Legacy',
          description: 'Template simplu pentru compatibilitate',
          features: [
            'Format simplu',
            'Compatibilitate cu versiuni anterioare'
          ]
        }
      }
    },
    
    // Digital signature settings
    digitalSignature: {
      enabled: process.env.DIGITAL_SIGNATURE_ENABLED === 'true',
      certificatePath: process.env.DEFAULT_CERTIFICATE_PATH || './certificates/default.p12',
      certificatePassword: process.env.DEFAULT_CERTIFICATE_PASSWORD || 'default_password',
      algorithm: 'SHA256withRSA',
      timestampServer: process.env.TIMESTAMP_SERVER_URL,
      
      // Test certificate settings (for development)
      testCertificate: {
        organization: {
          country: 'RO',
          state: 'Sibiu',
          city: 'Sibiu',
          organization: 'Universitatea Lucian Blaga din Sibiu',
          department: 'Departamentul IT',
          commonName: 'ULBS PDF Signer'
        }
      }
    },
    
    // Performance settings
    performance: {
      batchSize: {
        default: 5,
        maximum: 20,
        minimum: 1
      },
      
      // Memory management
      maxMemoryUsage: '512MB',
      
      // Concurrency settings
      maxConcurrentGenerations: 10,
      
      // Cache settings
      enableCaching: true,
      cacheSize: 100, // Number of cached documents
      cacheTTL: 3600000 // 1 hour in milliseconds
    },
    
    // QR Code settings
    qrCode: {
      enabled: true,
      size: 80,
      errorCorrectionLevel: 'M',
      margin: 1,
      baseUrl: process.env.FRONTEND_URL || 'http://localhost:4200'
    },
    
    // Watermark settings
    watermark: {
      text: 'DRAFT',
      fontSize: 72,
      opacity: 0.1,
      color: '#ff0000',
      rotation: 45
    },
    
    // Table settings
    table: {
      headerHeight: 35,
      rowHeight: 25,
      fontSize: {
        header: 9,
        content: 8
      },
      alternateRowColor: '#fafafa'
    },
    
    // Font settings
    fonts: {
      default: 'Helvetica',
      bold: 'Helvetica-Bold',
      sizes: {
        title: 16,
        subtitle: 14,
        header: 12,
        content: 10,
        small: 8,
        tiny: 7
      }
    }
  },
  
  // Data integration settings
  dataIntegration: {
    // Teaching hours integration
    teachingHours: {
      enabled: true,
      coefficients: {
        'LR': { // Licență română
          curs: 1.0,
          seminar: 1.0,
          laborator: 1.0,
          proiect: 1.0
        },
        'LE': { // Licență engleză
          curs: 1.2,
          seminar: 1.2,
          laborator: 1.2,
          proiect: 1.2
        },
        'MR': { // Master română
          curs: 1.1,
          seminar: 1.1,
          laborator: 1.1,
          proiect: 1.1
        },
        'ME': { // Master engleză
          curs: 1.3,
          seminar: 1.3,
          laborator: 1.3,
          proiect: 1.3
        }
      }
    },
    
    // Calendar integration
    calendar: {
      enabled: true,
      validateWorkingDays: true,
      excludeHolidays: true,
      respectOddEvenWeeks: true
    },
    
    // Validation rules
    validation: {
      strictMode: false,
      allowEmptyDisciplines: false,
      allowZeroHours: false,
      maxHoursPerDay: 12
    }
  },
  
  // Report settings
  reports: {
    summary: {
      includeCharts: false,
      includeStatistics: true,
      groupByDiscipline: true,
      groupByActivityType: true,
      includeMonthlyBreakdown: true
    }
  },
  
  // Error handling
  errorHandling: {
    retryAttempts: 3,
    retryDelay: 1000, // milliseconds
    logErrors: true,
    includeStackTrace: process.env.NODE_ENV === 'development'
  },
  
  // Logging
  logging: {
    enabled: true,
    level: process.env.LOG_LEVEL || 'info',
    logPdfGeneration: true,
    logBatchOperations: true,
    logSignatureOperations: true
  }
};
