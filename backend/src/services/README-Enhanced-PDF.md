# Enhanced PDF Service for PO Declarations

## Overview

The Enhanced PDF Service provides advanced PDF generation capabilities for payment order (PO) declarations with the official ULBS template, data integration from TeachingHours and Calendar, digital signature support, and optimization for high document volumes.

## Features

### 🎨 Official ULBS Template
- Professional header with ULBS branding and logo
- Structured layout conforming to university standards
- Dynamic faculty and department information
- QR code for document verification
- Watermark support for draft documents

### 🔗 Data Integration
- **TeachingHours Integration**: Automatic calculation of hours based on teaching records
- **Calendar Integration**: Validation against working days and semester calendar
- **Coefficient Calculation**: Automatic application of multipliers based on activity type
- **Smart Grouping**: Intelligent grouping of similar activities

### 🔐 Digital Signature Support
- X.509 certificate-based signatures
- SHA256withRSA encryption
- Batch signing capabilities
- Signature verification endpoints
- Test certificate generation for development

### ⚡ Performance Optimization
- Intelligent caching system
- Batch processing for multiple documents
- Memory usage optimization
- Configurable batch sizes
- Performance monitoring and reporting

## Installation

### Prerequisites
```bash
npm install pdfkit pdfkit-table node-signpdf node-forge qrcode moment sharp
```

### Environment Variables
```env
# Digital Signature Configuration
DIGITAL_SIGNATURE_ENABLED=true
DEFAULT_CERTIFICATE_PATH=./certificates/default.p12
DEFAULT_CERTIFICATE_PASSWORD=your_certificate_password

# PDF Service Configuration
FRONTEND_URL=http://localhost:4200
NODE_ENV=development

# Performance Settings
MAX_BATCH_SIZE=20
CACHE_SIZE=100
CACHE_TTL=3600000
```

## API Endpoints

### Enhanced PDF Generation

#### Generate Enhanced PDF
```http
POST /api/pdf/enhanced/{id}
Content-Type: application/json
Authorization: Bearer {token}

{
  "enhanced": true,
  "includeQR": true,
  "includeWatermark": false,
  "digitalSignature": true,
  "template": "ulbs-official"
}
```

#### Batch PDF Generation
```http
POST /api/pdf/batch
Content-Type: application/json
Authorization: Bearer {token}

{
  "declarationIds": ["id1", "id2", "id3"],
  "options": {
    "enhanced": true,
    "digitalSignature": true,
    "batchSize": 5
  }
}
```

#### Generate Summary Report
```http
POST /api/pdf/summary/{academicYear}/{semester}
Authorization: Bearer {token}

{
  "includeDetails": true,
  "includeCharts": false
}
```

### Digital Signature Operations

#### Get Certificate Information
```http
GET /api/pdf/certificate/info
Authorization: Bearer {token}
```

#### Verify Document Signature
```http
GET /api/pdf/verify/{documentId}
```

#### Initialize Test Certificate (Development Only)
```http
POST /api/pdf/certificate/init-test
Authorization: Bearer {token}
```

### Templates and Configuration

#### Get Available Templates
```http
GET /api/pdf/templates
Authorization: Bearer {token}
```

#### Get Batch Status
```http
GET /api/pdf/batch/{batchId}/status
Authorization: Bearer {token}
```

## Usage Examples

### Basic Enhanced PDF Generation

```javascript
const response = await fetch('/api/pdf/enhanced/64f5a9b8c1234567890abcde', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    enhanced: true,
    includeQR: true,
    digitalSignature: false,
    template: 'ulbs-official'
  })
});

const pdfBlob = await response.blob();
```

### Batch Processing

```javascript
const batchResponse = await fetch('/api/pdf/batch', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    declarationIds: ['id1', 'id2', 'id3'],
    options: {
      enhanced: true,
      digitalSignature: true,
      batchSize: 3
    }
  })
});

const result = await batchResponse.json();
console.log(`Generated ${result.summary.successful} PDFs successfully`);
```

### Data Preview Before Generation

```javascript
const previewResponse = await fetch('/api/payment/64f5a9b8c1234567890abcde/data-preview', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
});

const preview = await previewResponse.json();
console.log(`Total hours: ${preview.preview.totalHours}`);
console.log(`Activities: ${preview.preview.activitiesCount}`);
```

## Configuration

### PDF Settings
```javascript
// src/config/enhanced-pdf.config.js
module.exports = {
  pdf: {
    pageSize: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    branding: {
      primaryColor: '#1e3a8a',
      secondaryColor: '#64748b'
    }
  }
};
```

### Performance Tuning
```javascript
performance: {
  batchSize: {
    default: 5,
    maximum: 20,
    minimum: 1
  },
  maxConcurrentGenerations: 10,
  enableCaching: true,
  cacheSize: 100,
  cacheTTL: 3600000
}
```

## Digital Signature Setup

### Production Certificate
1. Obtain a valid X.509 certificate from a trusted CA
2. Convert to PKCS#12 format (.p12)
3. Set environment variables:
   ```env
   DEFAULT_CERTIFICATE_PATH=./certificates/production.p12
   DEFAULT_CERTIFICATE_PASSWORD=secure_password
   ```

### Development Certificate
```javascript
// Generate test certificate
const response = await fetch('/api/pdf/certificate/init-test', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + token }
});
```

## Data Integration

### TeachingHours Integration
- Automatic coefficient application based on activity type (LR, LE, MR, ME)
- Hour type validation (course, seminar, lab, project)
- Group and discipline information integration

### Calendar Integration
- Working day validation
- Holiday exclusion
- Odd/even week handling
- Special week support for medicine faculty

### Coefficient Table
| Activity Type | Description | Coefficient |
|---------------|-------------|-------------|
| LR | Licență Română | 1.0 |
| LE | Licență Engleză | 1.2 |
| MR | Master Română | 1.1 |
| ME | Master Engleză | 1.3 |

## Performance Monitoring

### Cache Statistics
```javascript
// Get cache performance
const stats = await fetch('/api/pdf/cache/stats');
const cacheData = await stats.json();
console.log(`Cache hit rate: ${cacheData.hitRate}%`);
```

### Memory Monitoring
```javascript
// Monitor memory usage
const health = await fetch('/api/pdf/health');
const healthData = await health.json();
console.log(`Memory usage: ${healthData.memory.heapUsed}`);
```

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "message": "Lista de ID-uri este obligatorie",
  "details": "declarationIds array is required"
}
```

#### 403 Forbidden
```json
{
  "message": "Nu aveți acces la declarațiile solicitate"
}
```

#### 500 Internal Server Error
```json
{
  "message": "Eroare la generarea PDF-ului",
  "details": "Certificate validation failed"
}
```

## Security Considerations

### Authentication
- All endpoints require valid JWT token
- User can only access their own declarations (unless admin)

### Digital Signatures
- Certificates should be stored securely
- Use environment variables for sensitive configuration
- Implement certificate rotation procedures

### Data Validation
- Input sanitization on all parameters
- File size limits for batch operations
- Rate limiting for API endpoints

## Troubleshooting

### Common Issues

#### Certificate Loading Fails
```bash
Error: Invalid certificate or password
```
**Solution**: Verify certificate path and password in environment variables

#### Memory Issues with Large Batches
```bash
Error: JavaScript heap out of memory
```
**Solution**: Reduce batch size or increase Node.js memory limit
```bash
node --max-old-space-size=4096 server.js
```

#### QR Code Generation Fails
```bash
Error: QR code generation failed
```
**Solution**: Verify FRONTEND_URL is set correctly

### Performance Optimization Tips

1. **Enable Caching**: Set `enableCaching: true` in configuration
2. **Optimize Batch Size**: Start with 5, adjust based on memory usage
3. **Monitor Memory**: Use performance endpoints to track usage
4. **Use Appropriate Templates**: Enhanced template for official documents, legacy for simple needs

## Development

### Running Tests
```bash
npm test
```

### Development Mode
```bash
npm run dev
```

### Generating Test Data
```javascript
// Create test declaration with integrated data
const testDecl = await createTestDeclaration({
  academicYear: '2023/2024',
  semester: 1,
  teachingHours: 40
});
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/enhanced-pdf`)
3. Commit changes (`git commit -am 'Add enhanced PDF feature'`)
4. Push to branch (`git push origin feature/enhanced-pdf`)
5. Create Pull Request

## License

This project is part of the ULBS PlataCuOra TimeTracker system.

## Support

For technical support and questions:
- Create an issue in the project repository
- Contact the development team
- Check the troubleshooting section above

---

**Version**: 1.0.0  
**Last Updated**: June 2025  
**Compatibility**: Node.js 18+, MongoDB 5+
