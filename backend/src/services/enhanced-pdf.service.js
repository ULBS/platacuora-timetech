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
      
      // Draw user information section
      this.drawUserInformation(doc, declaration);
      
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
    const headerHeight = 120;
    
    // Background gradient for header
    doc.rect(0, 0, this.pageWidth, headerHeight)
       .fillColor('#1e3a8a')
       .fill();

    // Add ULBS logo if available
    try {
      const logoPath = path.join(__dirname, '../../assets/ulbs-logo.png');
      await fs.access(logoPath);
      doc.image(logoPath, 50, 20, { width: 80, height: 80 });
    } catch (error) {
      // Logo not found, draw a placeholder
      doc.rect(50, 20, 80, 80)
         .strokeColor('#ffffff')
         .stroke();
      
      doc.fillColor('#ffffff')
         .fontSize(12)
         .text('ULBS', 75, 55);
    }

    // University name and details
    doc.fillColor('#ffffff')
       .fontSize(18)
       .font('Helvetica-Bold')
       .text('UNIVERSITATEA "LUCIAN BLAGA" DIN SIBIU', 150, 25, {
         width: 350,
         align: 'left'
       });

    doc.fontSize(12)
       .font('Helvetica')
       .text(`Facultatea: ${declaration.faculty || 'N/A'}`, 150, 50)
       .text(`Departamentul: ${declaration.department || 'N/A'}`, 150, 70)
       .text(`Anul academic: ${declaration.academicYear} - Semestrul ${declaration.semester}`, 150, 90);

    // Document date and number
    doc.fontSize(10)
       .text(`Nr. ________ / ${moment().format('DD.MM.YYYY')}`, 400, 30, { align: 'right' });

    return headerHeight;
  }

  /**
   * Draw document title and basic metadata
   */
  drawDocumentTitle(doc, declaration) {
    const startY = 140;
    
    // Main title
    doc.fillColor(this.colors.primary)
       .fontSize(16)
       .font('Helvetica-Bold')
       .text('DECLARAȚIE PE PROPRIA RĂSPUNDERE', 0, startY, {
         width: this.pageWidth,
         align: 'center'
       });

    doc.fontSize(14)
       .text('pentru plata orelor suplimentare prestate', 0, startY + 25, {
         width: this.pageWidth,
         align: 'center'
       });

    // Period information
    const periodY = startY + 60;
    doc.fillColor(this.colors.text)
       .fontSize(12)
       .font('Helvetica')
       .text(`Perioada: ${moment(declaration.startDate).format('DD.MM.YYYY')} - ${moment(declaration.endDate).format('DD.MM.YYYY')}`, 
             50, periodY);

    doc.text(declaration.title || 'Declarație de plată', 50, periodY + 20);

    return periodY + 50;
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
    const startY = 380;
    const tableWidth = this.pageWidth - 100;
    const startX = 50;

    // Table header
    doc.fillColor(this.colors.primary)
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('ACTIVITATEA DESFĂȘURATĂ', startX, startY);

    // Column definitions
    const columns = [
      { header: 'Nr.\nCrt.', key: 'index', width: 40, align: 'center' },
      { header: 'Data', key: 'date', width: 70, align: 'center' },
      { header: 'Disciplina', key: 'discipline', width: 120, align: 'left' },
      { header: 'Tipul\nactivității', key: 'activityType', width: 60, align: 'center' },
      { header: 'Grupa/\nFormația', key: 'groups', width: 80, align: 'center' },
      { header: 'Ore\nCurs', key: 'courseHours', width: 40, align: 'center' },
      { header: 'Ore\nSeminar', key: 'seminarHours', width: 40, align: 'center' },
      { header: 'Ore\nLab/App', key: 'labHours', width: 40, align: 'center' },
      { header: 'Ore\nProiect', key: 'projectHours', width: 40, align: 'center' },
      { header: 'Total\nOre', key: 'totalHours', width: 40, align: 'center' }
    ];

    // Calculate table position
    const tableY = startY + 30;
    const headerHeight = 35;
    const rowHeight = 25;

    // Draw table header
    this.drawTableHeader(doc, columns, startX, tableY, headerHeight);

    // Draw table rows
    let currentY = tableY + headerHeight;
    const items = declaration.items || [];
    
    for (let i = 0; i < items.length; i++) {
      // Check if we need a new page
      if (currentY + rowHeight > this.pageHeight - 100) {
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
   * Draw table header
   */
  drawTableHeader(doc, columns, startX, y, height) {
    let currentX = startX;

    // Header background
    doc.rect(startX, y, columns.reduce((sum, col) => sum + col.width, 0), height)
       .fillColor(this.colors.lightGray)
       .fill();

    // Header text
    doc.fillColor(this.colors.text)
       .fontSize(9)
       .font('Helvetica-Bold');

    columns.forEach(column => {
      doc.text(column.header, currentX + 2, y + 8, {
        width: column.width - 4,
        align: column.align,
        height: height - 4
      });

      // Column borders
      doc.rect(currentX, y, column.width, height)
         .strokeColor(this.colors.secondary)
         .stroke();

      currentX += column.width;
    });
  }

  /**
   * Draw table row
   */
  drawTableRow(doc, columns, startX, y, height, item, index) {
    let currentX = startX;

    // Alternate row colors
    if (index % 2 === 0) {
      doc.rect(startX, y, columns.reduce((sum, col) => sum + col.width, 0), height)
         .fillColor('#fafafa')
         .fill();
    }

    doc.fillColor(this.colors.text)
       .fontSize(8)
       .font('Helvetica');

    columns.forEach(column => {
      let text = '';
      
      switch (column.key) {
        case 'index':
          text = index.toString();
          break;
        case 'date':
          text = item.date ? moment(item.date).format('DD.MM.YYYY') : '';
          break;
        case 'discipline':
          text = item.disciplineName || '';
          break;
        case 'activityType':
          text = this.getActivityTypeDisplay(item.activityType);
          break;
        case 'groups':
          text = item.groups || item.group || '';
          break;
        case 'courseHours':
        case 'seminarHours':
        case 'labHours':
        case 'projectHours':
        case 'totalHours':
          text = (item[column.key] || 0).toString();
          break;
        default:
          text = item[column.key] || '';
      }

      doc.text(text, currentX + 2, y + 8, {
        width: column.width - 4,
        align: column.align,
        height: height - 4
      });

      // Cell borders
      doc.rect(currentX, y, column.width, height)
         .strokeColor(this.colors.secondary)
         .stroke();

      currentX += column.width;
    });
  }

  /**
   * Draw summary section with totals
   */
  drawSummarySection(doc, declaration) {
    const items = declaration.items || [];
    
    // Calculate totals
    const totals = {
      courseHours: items.reduce((sum, item) => sum + (item.courseHours || 0), 0),
      seminarHours: items.reduce((sum, item) => sum + (item.seminarHours || 0), 0),
      labHours: items.reduce((sum, item) => sum + (item.labHours || 0), 0),
      projectHours: items.reduce((sum, item) => sum + (item.projectHours || 0), 0),
      totalHours: items.reduce((sum, item) => sum + (item.totalHours || 0), 0)
    };

    const currentY = doc.y + 20;
    
    // Summary box
    doc.rect(50, currentY, this.pageWidth - 100, 60)
       .fillColor(this.colors.lightGray)
       .fill()
       .strokeColor(this.colors.secondary)
       .stroke();

    doc.fillColor(this.colors.text)
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('TOTAL ORE PRESTATE:', 70, currentY + 15);

    doc.fontSize(10)
       .font('Helvetica')
       .text(`Curs: ${totals.courseHours}h`, 70, currentY + 35)
       .text(`Seminar: ${totals.seminarHours}h`, 170, currentY + 35)
       .text(`Laborator/Aplicații: ${totals.labHours}h`, 270, currentY + 35)
       .text(`Proiect: ${totals.projectHours}h`, 400, currentY + 35);

    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor(this.colors.primary)
       .text(`TOTAL GENERAL: ${totals.totalHours} ore`, 0, currentY + 35, {
         width: this.pageWidth - 100,
         align: 'right'
       });

    return currentY + 80;
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
       .text('Declar pe propria răspundere că datele prezentate sunt reale și corecte.', 
             50, footerY, { width: 400 });

    // Signature sections
    const signaturesY = footerY + 40;
    
    // Left signature (Employee)
    doc.text('Nume și semnătura titularului:', 50, signaturesY);
    doc.text('_________________________', 50, signaturesY + 20);
    doc.text(`${declaration.user.firstName} ${declaration.user.lastName}`, 50, signaturesY + 35);

    // Right signature (Admin/Manager)
    doc.text('Nume și semnătura responsabilului:', 350, signaturesY);
    doc.text('_________________________', 350, signaturesY + 20);

    // QR Code for verification
    if (options.includeQR !== false) {
      await this.addQRCode(doc, declaration, 450, signaturesY - 10);
    }

    // Document metadata footer
    doc.fontSize(8)
       .fillColor(this.colors.secondary)
       .text(`Generat automat în data: ${moment().format('DD.MM.YYYY HH:mm')}`, 
             50, this.pageHeight - 30)
       .text(`ID Document: ${declaration._id}`, 50, this.pageHeight - 18);
  }

  /**
   * Add QR code for document verification
   */
  async addQRCode(doc, declaration, x, y) {
    try {
      const verificationUrl = `${process.env.FRONTEND_URL}/verify/${declaration._id}`;
      const qrCodeBuffer = await QRCode.toBuffer(verificationUrl, {
        width: 80,
        height: 80,
        margin: 1
      });

      doc.image(qrCodeBuffer, x, y, { width: 60, height: 60 });
      
      doc.fontSize(7)
         .fillColor(this.colors.secondary)
         .text('Scanează pentru\nverificare', x, y + 65, {
           width: 60,
           align: 'center'
         });
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
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
      'LR': 'Licență RO',
      'LE': 'Licență EN',
      'MR': 'Master RO',
      'ME': 'Master EN'
    };
    return types[activityType] || activityType;
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
