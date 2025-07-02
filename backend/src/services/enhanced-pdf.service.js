const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const moment = require('moment');
const fs = require('fs').promises;
const path = require('path');
const forge = require('node-forge');
const signpdf = require('node-signpdf').default;

// Configure moment to Romanian locale
moment.locale('ro');

class EnhancedPDFService {
  constructor() {
    this.pageWidth = 595.28; // A4 width in points
    this.pageHeight = 841.89; // A4 height in points
    this.margins = {
      top: 50,
      bottom: 50,
      left: 50,
      right: 50
    };
    this.colors = {
      primary: '#1e3a8a', // ULBS Blue
      secondary: '#64748b',
      accent: '#dc2626',
      text: '#1f2937',
      lightGray: '#f3f4f6',
      darkGray: '#374151'
    };
  }

  /**
   * Generate enhanced PDF for payment declaration
   */
  async generatePaymentDeclarationPDF(declaration, options = {}) {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      bufferPages: true,
      autoFirstPage: false
    });

    const buffers = [];
    doc.on('data', chunk => buffers.push(chunk));

    try {
      // Add first page
      doc.addPage();
      
      // Draw header with ULBS branding
      await this.drawHeader(doc, declaration);
      
      // Draw document title and metadata
      this.drawDocumentTitle(doc, declaration);
      
      // Draw declaration details table
      await this.drawDeclarationTable(doc, declaration);
      
      // Draw summary and totals
      this.drawSummarySection(doc, declaration);
      
      // Draw footer with signatures and QR code
      await this.drawFooter(doc, declaration, options);
      
      // Add watermark if draft
      if (declaration.status === 'draft') {
        this.addWatermark(doc, 'DRAFT');
      }

      doc.end();

      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });
        doc.on('error', reject);
      });

    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }

  /**
   * Draw ULBS header with logo and university information
   */
  async drawHeader(doc, declaration) {
    const headerY = 50;
    const tableWidth = this.pageWidth - 100;
    
    // Main header table
    doc.rect(50, headerY, tableWidth, 120)
       .strokeColor('#000000')
       .lineWidth(1)
       .stroke();

    // Left section (university info) - 70% of width
    const leftWidth = tableWidth * 0.7;
    doc.rect(50, headerY, leftWidth, 120)
       .strokeColor('#000000')
       .lineWidth(1)
       .stroke();

    // Right section split into two parts
    const rightWidth = tableWidth * 0.3;
    const rightX = 50 + leftWidth;
    
    // Top right section
    doc.rect(rightX, headerY, rightWidth, 60)
       .strokeColor('#000000')
       .lineWidth(1)
       .stroke();

    // Bottom right section  
    doc.rect(rightX, headerY + 60, rightWidth, 60)
       .strokeColor('#000000')
       .lineWidth(1)
       .stroke();

    // University information - properly spaced
    doc.fillColor('#000000')
       .fontSize(11)
       .font('Helvetica-Bold')
       .text('UNIVERSITATEA "LUCIAN BLAGA" DIN SIBIU', 60, headerY + 10, {
         width: leftWidth - 20
       });

    // Clean faculty and department names - use data from declaration/user
    const faculty = (declaration.faculty || declaration.user.faculty || 'INGINERIE').toUpperCase();
    const department = this.cleanRomanianText((declaration.department || declaration.user.department || 'CALCULATOARE SI INGINERIE ELECTRICA').toUpperCase());

    doc.fontSize(10)
       .font('Helvetica')
       .text(`FACULTATEA DE ${faculty}`, 60, headerY + 30, {
         width: leftWidth - 20
       })
       .text(`DEPARTAMENTUL DE ${department}`, 60, headerY + 50, {
         width: leftWidth - 20
       });

    // Right side - Approval section with dynamic dean name
    const deanName = declaration.deanName || declaration.user.deanName || declaration.user.faculty?.dean || '';
    
    doc.fontSize(9)
       .font('Helvetica-Bold')
       .text('APROBAT,', rightX + 10, headerY + 15, { 
         width: rightWidth - 20, 
         align: 'center' 
       })
       .text('Decan', rightX + 10, headerY + 30, { 
         width: rightWidth - 20, 
         align: 'center' 
       });

    // Only show dean name if we have one
    if (deanName) {
      doc.fontSize(8)
         .font('Helvetica')
         .text(this.cleanRomanianText(deanName), rightX + 10, headerY + 80, { 
           width: rightWidth - 20, 
           align: 'center' 
         });
    }

    return headerY + 140;
  }

  /**
   * Draw document title and basic metadata in proper Romanian
   */
  drawDocumentTitle(doc, declaration) {
    const startY = 220;
    
    // Main title
    doc.fillColor('#000000')
       .fontSize(14)
       .font('Helvetica-Bold')
       .text(this.cleanRomanianText('DECLARAȚIE'), 0, startY, {
         width: this.pageWidth,
         align: 'center'
       });

    // Subtitle 
    doc.fontSize(12)
       .font('Helvetica')
       .text(this.cleanRomanianText('privind activitățile didactice desfășurate'), 0, startY + 25, {
         width: this.pageWidth,
         align: 'center'
       });

    // Format dates properly
    const startDate = declaration.periode?.start ? 
      moment(declaration.periode.start).format('DD.MM.YYYY') : '01.04.2025';
    const endDate = declaration.periode?.end ? 
      moment(declaration.periode.end).format('DD.MM.YYYY') : '30.04.2025';

    // Clean department name
    const department = this.cleanRomanianText((declaration.department || 'CALCULATOARE SI INGINERIE ELECTRICA').toUpperCase());

    // Declaration text in proper Romanian
    const declarationText = this.cleanRomanianText(`Subsemnatul(a), ${declaration.user.firstName} ${declaration.user.lastName}, declar ca am desfasurat in perioada ${startDate} - ${endDate}, in DEPARTAMENTUL ${department}, urmatoarele activitati didactice:`);
    
    doc.fontSize(11)
       .font('Helvetica')
       .text(declarationText, 50, startY + 55, {
         width: this.pageWidth - 100,
         align: 'justify',
         lineGap: 5
       });

    return startY + 120;
  }

  /**
   * Draw user information section
   */
  drawUserInformation(doc, declaration) {
    const startY = 260;
    const user = declaration.user;

    // Section header
    doc.fillColor(this.colors.primary)
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('DATELE SOLICITANTULUI', 50, startY);

    // Draw a box around user info
    const boxY = startY + 25;
    const boxHeight = 80;
    
    doc.rect(50, boxY, this.pageWidth - 100, boxHeight)
       .strokeColor(this.colors.secondary)
       .stroke();

    // User details in two columns
    const leftCol = 70;
    const rightCol = 320;
    const lineHeight = 18;

    doc.fillColor(this.colors.text)
       .fontSize(11)
       .font('Helvetica');

    // Left column
    doc.text(`Nume: ${user.lastName || 'N/A'}`, leftCol, boxY + 15);
    doc.text(`Prenume: ${user.firstName || 'N/A'}`, leftCol, boxY + 15 + lineHeight);
    doc.text(`Email: ${user.email || 'N/A'}`, leftCol, boxY + 15 + 2 * lineHeight);

    // Right column
    doc.text(`Poziția: ${user.position || 'N/A'}`, rightCol, boxY + 15);
    doc.text(`Facultatea: ${user.faculty || declaration.faculty || 'N/A'}`, rightCol, boxY + 15 + lineHeight);
    doc.text(`Departamentul: ${user.department || declaration.department || 'N/A'}`, rightCol, boxY + 15 + 2 * lineHeight);

    return boxY + boxHeight + 20;
  }

  /**
   * Draw the main declaration table with teaching hours
   */
  async drawDeclarationTable(doc, declaration) {
    const startY = 360;
    const startX = 50;
    const tableWidth = this.pageWidth - 100;

    // Column definitions - properly sized for A4 page
    const columns = [
      { header: 'Nr.\nCrt.', key: 'position', width: 35, align: 'center' },
      { header: 'Data', key: 'date', width: 55, align: 'center' },
      { header: 'Numarul de ore fizice', key: 'physicalHours', width: 120, align: 'center', subHeaders: ['C', 'S', 'L/A', 'P'] },
      { header: 'Tipul\nactivitatii', key: 'activityType', width: 50, align: 'center' },
      { header: 'Coef.', key: 'coefficient', width: 35, align: 'center' },
      { header: 'Nr.\nore', key: 'totalHours', width: 40, align: 'center' },
      { header: 'Anul, grupa,\nsemigrupa', key: 'groups', width: 160, align: 'center' }
    ];

    // Calculate table position and dimensions
    const headerHeight = 50;
    const rowHeight = 20;
    const footerSpace = 150;
    const items = declaration.items || [];
    
    console.log('PDF Table Generation - Items to render:', {
      declarationId: declaration._id,
      itemsCount: items.length,
      firstThreeItems: items.slice(0, 3).map(item => ({
        date: item.date,
        courseHours: item.courseHours,
        seminarHours: item.seminarHours,
        labHours: item.labHours,
        projectHours: item.projectHours,
        totalHours: item.totalHours
      }))
    });
    
    // If no items, add a notice
    if (items.length === 0) {
      doc.fontSize(11)
         .font('Helvetica-Oblique')
         .text('Nu au fost găsite activități pentru perioada specificată.', startX, startY + 20, {
           width: tableWidth,
           align: 'center'
         });
      return startY + 100;
    }
    
    // Calculate total table height
    const totalTableHeight = headerHeight + (items.length * rowHeight);
    const availableSpace = this.pageHeight - startY - footerSpace;
    
    let tableStartY = startY;
    
    // If table doesn't fit, move to new page
    if (totalTableHeight > availableSpace) {
      doc.addPage();
      tableStartY = 80;
    }

    // Draw table header
    this.drawTableHeader(doc, columns, startX, tableStartY, headerHeight);

    // Draw table rows
    let currentY = tableStartY + headerHeight;
    
    for (let i = 0; i < items.length; i++) {
      // Check if we need another page
      if (currentY + rowHeight > this.pageHeight - footerSpace) {
        doc.addPage();
        currentY = 80;
        this.drawTableHeader(doc, columns, startX, currentY, headerHeight);
        currentY += headerHeight;
      }

      this.drawTableRow(doc, columns, startX, currentY, rowHeight, items[i], i + 1);
      currentY += rowHeight;
    }

    return currentY + 20;
  }

  /**
   * Draw clean table header
   */
  drawTableHeader(doc, columns, startX, y, height) {
    let currentX = startX;
    const topRowHeight = height * 0.6;
    const bottomRowHeight = height * 0.4;

    // Draw outer border and background
    const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);
    doc.rect(startX, y, totalWidth, height)
       .fillColor('#f8f9fa')
       .fill()
       .strokeColor('#000000')
       .lineWidth(1)
       .stroke();

    doc.fillColor('#000000')
       .fontSize(8)
       .font('Helvetica-Bold');

    columns.forEach(column => {
      if (column.key === 'physicalHours') {
        // Main header
        doc.text(column.header, currentX + 2, y + 5, {
          width: column.width - 4,
          align: 'center'
        });

        // Sub-headers for C, S, L/A, P
        const subWidth = column.width / 4;
        column.subHeaders.forEach((subHeader, index) => {
          const subX = currentX + (index * subWidth);
          
          // Draw sub-cell border
          doc.rect(subX, y + topRowHeight, subWidth, bottomRowHeight)
             .strokeColor('#000000')
             .lineWidth(0.5)
             .stroke();
          
          // Draw sub-header text
          doc.text(subHeader, subX + 1, y + topRowHeight + 8, {
            width: subWidth - 2,
            align: 'center'
          });
        });
      } else {
        // Regular header spanning full height
        doc.text(column.header, currentX + 2, y + height/2 - 8, {
          width: column.width - 4,
          align: column.align
        });
      }

      // Draw column border
      doc.rect(currentX, y, column.width, height)
         .strokeColor('#000000')
         .lineWidth(1)
         .stroke();

      currentX += column.width;
    });
  }

  /**
   * Draw clean table row
   */
  drawTableRow(doc, columns, startX, y, height, item, index) {
    let currentX = startX;

    // Alternate row colors
    if (index % 2 === 0) {
      const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);
      doc.rect(startX, y, totalWidth, height)
         .fillColor('#fdfdfd')
         .fill();
    }

    doc.fillColor('#000000')
       .fontSize(8)
       .font('Helvetica');

    columns.forEach(column => {
      if (column.key === 'physicalHours') {
        // Handle physical hours sub-columns
        const subWidth = column.width / 4;
        const hours = [
          item.courseHours || 0,
          item.seminarHours || 0,
          item.labHours || 0,
          item.projectHours || 0
        ];
        
        hours.forEach((hour, idx) => {
          const subX = currentX + (idx * subWidth);
          
          // Only display if hour > 0
          const displayHour = hour > 0 ? hour.toString() : '';
          doc.text(displayHour, subX + 1, y + 6, {
            width: subWidth - 2,
            align: 'center'
          });
          
          // Draw sub-cell border
          doc.rect(subX, y, subWidth, height)
             .strokeColor('#000000')
             .lineWidth(0.5)
             .stroke();
        });
      } else {
        // Handle regular columns
        let text = '';
        
        switch (column.key) {
          case 'position':
            text = index.toString();
            break;
          case 'date':
            // Handle different date formats - if already in DD.MM.YYYY format, use as is
            if (item.date) {
              if (item.date.includes('.') && item.date.length === 10) {
                // Already in DD.MM.YYYY format
                text = item.date;
              } else {
                // Parse as ISO date and format
                text = moment(item.date, 'YYYY-MM-DD').format('DD.MM.YYYY');
              }
            } else {
              text = '';
            }
            break;
          case 'activityType':
            text = this.getActivityTypeDisplay(item.activityType);
            break;
          case 'coefficient':
            text = (item.coefficient || 1).toString();
            break;
          case 'totalHours':
            text = (item.totalHours || 0).toString();
            break;
          case 'groups':
            text = item.groups || item.group || '';
            break;
          default:
            text = item[column.key] || '';
        }

        doc.text(text, currentX + 2, y + 6, {
          width: column.width - 4,
          align: column.align
        });

        // Draw cell border
        doc.rect(currentX, y, column.width, height)
           .strokeColor('#000000')
           .lineWidth(0.5)
           .stroke();
      }

      currentX += column.width;
    });
  }

  /**
   * Draw summary section with totals in Romanian
   */
  drawSummarySection(doc, declaration) {
    const items = declaration.items || [];
    
    // Calculate totals
    const totals = {
      courseHours: items.reduce((sum, item) => sum + (parseInt(item.courseHours) || 0), 0),
      seminarHours: items.reduce((sum, item) => sum + (parseInt(item.seminarHours) || 0), 0),
      labHours: items.reduce((sum, item) => sum + (parseInt(item.labHours) || 0), 0),
      projectHours: items.reduce((sum, item) => sum + (parseInt(item.projectHours) || 0), 0),
      totalHours: items.reduce((sum, item) => sum + (parseInt(item.totalHours) || 0), 0)
    };

    const currentY = doc.y + 30;
    
    // Summary box
    doc.rect(50, currentY, this.pageWidth - 100, 80)
       .fillColor('#f8f9fa')
       .fill()
       .strokeColor('#dee2e6')
       .lineWidth(1)
       .stroke();

    doc.fillColor('#212529')
       .fontSize(11)
       .font('Helvetica-Bold')
       .text(this.cleanRomanianText('TOTAL ORE PRESTATE IN PERIOADA:'), 70, currentY + 15);

    // Create a summary table layout
    const summaryY = currentY + 35;
    doc.fontSize(9)
       .font('Helvetica')
       .text(`Curs: ${totals.courseHours} ore`, 70, summaryY)
       .text(`Seminar: ${totals.seminarHours} ore`, 170, summaryY)
       .text(this.cleanRomanianText(`Laborator/Aplicații: ${totals.labHours} ore`), 280, summaryY)
       .text(`Proiect: ${totals.projectHours} ore`, 420, summaryY);

    // Total general
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#dc3545')
       .text(`TOTAL GENERAL: ${totals.totalHours} ore`, 70, summaryY + 25);

    return currentY + 100;
  }

  /**
   * Draw footer with signatures and verification elements
   */
  async drawFooter(doc, declaration, options) {
    const footerY = this.pageHeight - 150;
    
    // Declaration text
    doc.fillColor(this.colors.text)
       .fontSize(10)
       .font('Helvetica')
       .text(this.cleanRomanianText('Declar pe propria raspundere ca datele prezentate sunt reale si corecte.'), 
             50, footerY, { width: 400 });

    // Signature sections
    const signaturesY = footerY + 40;
    
    // Left signature (Employee)
    doc.text(this.cleanRomanianText('Nume si semnatura titularului:'), 50, signaturesY);
    doc.text('_________________________', 50, signaturesY + 20);
    doc.text(`${declaration.user.firstName} ${declaration.user.lastName}`, 50, signaturesY + 35);

    // Right signature (Admin/Manager)
    doc.text(this.cleanRomanianText('Nume si semnatura responsabilului:'), 350, signaturesY);
    doc.text('_________________________', 350, signaturesY + 20);

    // Document metadata footer
    doc.fontSize(8)
       .fillColor(this.colors.secondary)
       .text(`Generat automat în data: ${moment().format('DD.MM.YYYY HH:mm')}`, 
             50, this.pageHeight - 30)
       .text(`ID Document: ${declaration._id}`, 50, this.pageHeight - 18);
  }

  /**
   * Add watermark to document
   */
  addWatermark(doc, text) {
    const pages = doc.bufferedPageRange();
    for (let i = pages.start; i < pages.start + pages.count; i++) {
      doc.switchToPage(i);
      
      doc.save()
         .rotate(45, { origin: [this.pageWidth / 2, this.pageHeight / 2] })
         .fontSize(72)
         .fillColor('#ff0000', 0.1)
         .font('Helvetica-Bold')
         .text(text, 0, this.pageHeight / 2 - 50, {
           width: this.pageWidth,
           align: 'center'
         })
         .restore();
    }
  }

  /**
   * Get display text for activity type
   */
  getActivityTypeDisplay(activityType) {
    const types = {
      'LR': 'LR',
      'LE': 'LE',
      'MR': 'MR',
      'ME': 'ME'
    };
    return types[activityType] || activityType;
  }

  /**
   * Clean Romanian characters for PDF compatibility
   */
  cleanRomanianText(text) {
    if (!text) return text;
    return text
      .replace(/ș/g, 's')
      .replace(/Ș/g, 'S')
      .replace(/ț/g, 't')
      .replace(/Ț/g, 'T')
      .replace(/ă/g, 'a')
      .replace(/Ă/g, 'A')
      .replace(/î/g, 'i')
      .replace(/Î/g, 'I')
      .replace(/â/g, 'a')
      .replace(/Â/g, 'A');
  }

  /**
   * Generate batch PDFs for multiple declarations
   */
  async generateBatchPDFs(declarations, options = {}) {
    const results = [];
    const batchSize = options.batchSize || 5;
    
    for (let i = 0; i < declarations.length; i += batchSize) {
      const batch = declarations.slice(i, i + batchSize);
      const batchPromises = batch.map(async (declaration) => {
        try {
          const pdfBuffer = await this.generatePaymentDeclarationPDF(declaration, options);
          return {
            id: declaration._id,
            success: true,
            buffer: pdfBuffer,
            size: pdfBuffer.length
          };
        } catch (error) {
          return {
            id: declaration._id,
            success: false,
            error: error.message
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches to prevent memory issues
      if (i + batchSize < declarations.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  /**
   * Apply digital signature to PDF
   */
  async applyDigitalSignature(pdfBuffer, certificatePath, password) {
    try {
      // Load certificate and private key
      const p12Buffer = await fs.readFile(certificatePath);
      const p12Asn1 = forge.asn1.fromDer(p12Buffer.toString('binary'));
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
      
      // Sign the PDF
      const signedPdf = signpdf.sign(pdfBuffer, p12Buffer, { passphrase: password });
      
      return signedPdf;
    } catch (error) {
      console.error('Error applying digital signature:', error);
      throw new Error('Failed to apply digital signature');
    }
  }

}

module.exports = new EnhancedPDFService();
