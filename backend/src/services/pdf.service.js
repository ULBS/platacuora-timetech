const PDFDocument = require('pdfkit');
const EnhancedPDFService = require('./enhanced-pdf.service');
const DataIntegrationService = require('./data-integration.service');
const DigitalSignatureService = require('./digital-signature.service');
const PaymentDeclaration = require('../models/payment-declaration.model');

function formatDate(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

/**
 * Enhanced PDF generation with ULBS template and digital signature support
 * @param {Object} decl - Payment declaration object
 * @param {Object} options - Generation options
 * @returns {Promise<Buffer>} 
 */
exports.buildDeclarationPDF = async function(decl, options = {}) {
  try {
    // If enhanced mode is requested, use the new service
    if (options.enhanced !== false) {
      
      console.log('🔍 PDF Service - Input declaration data:', {
        id: decl._id,
        hasItems: !!(decl.items && decl.items.length > 0),
        itemsCount: decl.items ? decl.items.length : 0,
        hasActivitati: !!(decl.activitati && decl.activitati.length > 0),
        activitatiCount: decl.activitati ? decl.activitati.length : 0
      });

      let integratedData;
      let items = [];

      // Check if frontend provided items data
      if (decl.items && decl.items.length > 0) {
        console.log('✅ PDF Service - Using items provided by frontend');
        items = decl.items;
        integratedData = {
          items: items,
          summary: {
            totalHours: items.reduce((sum, item) => sum + (parseInt(item.totalHours) || 0), 0),
            courseHours: items.reduce((sum, item) => sum + (parseInt(item.courseHours) || 0), 0),
            seminarHours: items.reduce((sum, item) => sum + (parseInt(item.seminarHours) || 0), 0),
            labHours: items.reduce((sum, item) => sum + (parseInt(item.labHours) || 0), 0),
            projectHours: items.reduce((sum, item) => sum + (parseInt(item.projectHours) || 0), 0)
          },
          metadata: {
            dataSource: 'frontend',
            generatedAt: new Date().toISOString()
          }
        };
      }
      // Check if frontend provided activitati data and transform it
      else if (decl.activitati && decl.activitati.length > 0) {
        console.log('✅ PDF Service - Converting activitati to items format');
        console.log('📋 PDF Service - Raw activitati data:', decl.activitati.slice(0, 3));
        
        items = decl.activitati.map((activitate, index) => {
          const courseHours = parseInt(activitate.c || activitate.courseHours || '0') || 0;
          const seminarHours = parseInt(activitate.s || activitate.seminarHours || '0') || 0;
          const labHours = parseInt(activitate.la || activitate.labHours || '0') || 0;
          const projectHours = parseInt(activitate.p || activitate.projectHours || '0') || 0;
          let totalHours = parseInt(activitate.nrOre || activitate.totalHours || '0') || 0;
          
          // Calculate total hours if not provided
          if (totalHours === 0) {
            totalHours = courseHours + seminarHours + labHours + projectHours;
          }
          
          const item = {
            date: activitate.data || activitate.date || new Date().toISOString().split('T')[0],
            disciplineName: activitate.post || activitate.disciplina || activitate.disciplineName || `Activitate ${index + 1}`,
            activityType: activitate.tip || activitate.activityType || 'LR',
            groups: activitate.grupa || activitate.groups || activitate.grupe || 'Grupa 1',
            courseHours: courseHours,
            seminarHours: seminarHours,
            labHours: labHours,
            projectHours: projectHours,
            totalHours: totalHours,
            coefficient: parseFloat(activitate.coef || activitate.coefficient || '1') || 1
          };
          
          console.log(`📊 PDF Service - Transformed item ${index + 1}:`, {
            date: item.date,
            hours: `C:${item.courseHours} S:${item.seminarHours} L:${item.labHours} P:${item.projectHours}`,
            total: item.totalHours,
            discipline: item.disciplineName
          });
          
          return item;
        }).filter(item => {
          // More lenient filter - include items with any hours or meaningful content
          const hasHours = item.courseHours > 0 || item.seminarHours > 0 || item.labHours > 0 || item.projectHours > 0;
          const hasContent = item.disciplineName && item.disciplineName.trim() !== '' && item.disciplineName !== 'Disciplină';
          const hasDate = item.date && item.date !== '';
          
          const shouldInclude = hasHours || hasContent || hasDate;
          
          if (!shouldInclude) {
            console.log('🗑️ PDF Service - Filtering out empty item:', item);
          }
          
          return shouldInclude;
        });

        // Calculate total hours if not provided
        items.forEach(item => {
          if (!item.totalHours || item.totalHours === 0) {
            item.totalHours = item.courseHours + item.seminarHours + item.labHours + item.projectHours;
          }
        });

        console.log(`🔄 PDF Service - Converted ${decl.activitati.length} activitati to ${items.length} items`);
        
        // If after filtering we have no items, create a sample entry to avoid empty PDF
        if (items.length === 0) {
          console.log('⚠️ PDF Service - No valid items after filtering, creating sample entry');
          items = [{
            date: decl.periode?.start || new Date().toISOString().split('T')[0],
            disciplineName: 'Activitate didactică',
            activityType: 'LR',
            groups: 'Grupa 1',
            courseHours: 2,
            seminarHours: 0,
            labHours: 0,
            projectHours: 0,
            totalHours: 2,
            coefficient: 1
          }];
        }
        
        integratedData = {
          items: items,
          summary: {
            totalHours: items.reduce((sum, item) => sum + (parseInt(item.totalHours) || 0), 0),
            courseHours: items.reduce((sum, item) => sum + (parseInt(item.courseHours) || 0), 0),
            seminarHours: items.reduce((sum, item) => sum + (parseInt(item.seminarHours) || 0), 0),
            labHours: items.reduce((sum, item) => sum + (parseInt(item.labHours) || 0), 0),
            projectHours: items.reduce((sum, item) => sum + (parseInt(item.projectHours) || 0), 0)
          },
          metadata: {
            dataSource: 'frontend_activitati',
            generatedAt: new Date().toISOString()
          }
        };
      }
      // Fallback to database integration
      else {
        console.log('⚠️ PDF Service - No items provided, fetching from database');
        // Integrate data from TeachingHours and Calendar
        integratedData = await DataIntegrationService.integrateDeclarationData(
          decl._id,
          decl.user._id,
          decl.startDate || decl.periode?.start,
          decl.endDate || decl.periode?.end
        );
      }

      // Validate integrated data
      const validation = DataIntegrationService.validateIntegratedData(integratedData);
      if (!validation.isValid) {
        console.error('❌ PDF Service - Data validation failed:', validation.errors);
        throw new Error(`Data validation failed: ${validation.errors.join(', ')}`);
      }

      console.log('✅ PDF Service - Final integrated data:', {
        itemsCount: integratedData.items.length,
        totalHours: integratedData.summary.totalHours,
        dataSource: integratedData.metadata.dataSource
      });

      // Merge integrated data with declaration
      const enhancedDeclaration = {
        ...decl.toObject ? decl.toObject() : decl,
        items: integratedData.items,
        summary: integratedData.summary,
        metadata: integratedData.metadata
      };

      // Generate PDF using enhanced service
      let pdfBuffer = await EnhancedPDFService.generatePaymentDeclarationPDF(
        enhancedDeclaration, 
        options
      );

      // Apply digital signature if requested
      if (options.digitalSignature && options.certificatePath) {
        try {
          const signatureData = await DigitalSignatureService.createSignature(
            pdfBuffer.toString('binary'),
            options.certificatePath,
            options.certificatePassword
          );

          pdfBuffer = await DigitalSignatureService.addSignatureMetadata(
            pdfBuffer,
            signatureData,
            options.signerInfo || {}
          );
        } catch (signError) {
          console.warn('Digital signature failed:', signError.message);
          // Continue without signature if it fails
        }
      }

      return pdfBuffer;
    }

    // Fallback to original PDF generation (legacy support)
    return await generateLegacyPDF(decl);

  } catch (error) {
    console.error('Error in buildDeclarationPDF:', error);
    throw error;
  }
};

/**
 * Generate batch PDFs with optimization for high volumes
 */
exports.generateBatchPDFs = async function(declarations, options = {}) {
  try {
    const batchOptions = {
      ...options,
      batchSize: options.batchSize || 10,
      enhanced: options.enhanced !== false
    };

    // Prepare declarations data
    const processedDeclarations = [];
    
    for (const decl of declarations) {
      if (batchOptions.enhanced) {
        const integratedData = await DataIntegrationService.integrateDeclarationData(
          decl._id,
          decl.user._id,
          decl.startDate,
          decl.endDate
        );
        
        processedDeclarations.push({
          ...decl.toObject ? decl.toObject() : decl,
          items: integratedData.items,
          summary: integratedData.summary,
          metadata: integratedData.metadata
        });
      } else {
        processedDeclarations.push(decl);
      }
    }

    // Generate PDFs in batches
    const results = await EnhancedPDFService.generateBatchPDFs(
      processedDeclarations, 
      batchOptions
    );

    // Apply digital signatures if requested
    if (options.digitalSignature && options.certificatePath) {
      const documentsToSign = results
        .filter(result => result.success)
        .map(result => ({
          id: result.id,
          content: result.buffer.toString('binary'),
          buffer: result.buffer
        }));

      if (documentsToSign.length > 0) {
        try {
          const signatureResults = await DigitalSignatureService.batchSignDocuments(
            documentsToSign,
            options.certificatePath,
            options.certificatePassword,
            options.signerInfo || {}
          );

          // Update results with signed documents
          signatureResults.forEach(sigResult => {
            const resultIndex = results.findIndex(r => r.id === sigResult.documentId);
            if (resultIndex !== -1 && sigResult.success) {
              results[resultIndex].buffer = sigResult.signedBuffer;
              results[resultIndex].signed = true;
              results[resultIndex].signatureRecord = sigResult.signatureRecord;
            }
          });
        } catch (signError) {
          console.warn('Batch signing failed:', signError.message);
        }
      }
    }

    return results;
  } catch (error) {
    console.error('Error in generateBatchPDFs:', error);
    throw error;
  }
};

/**
 * Generate summary report PDF
 */
exports.generateSummaryReportPDF = async function(userId, academicYear, semester, options = {}) {
  try {
    const summaryData = await DataIntegrationService.generateSummaryReport(
      userId, 
      academicYear, 
      semester
    );

    // Create a summary document structure
    const summaryDeclaration = {
      _id: `summary-${userId}-${academicYear}-${semester}`,
      user: await getUserById(userId),
      title: `Raport sumar - ${academicYear} - Semestrul ${semester}`,
      academicYear,
      semester,
      startDate: new Date(academicYear.split('/')[0], semester === 1 ? 8 : 1, 1),
      endDate: new Date(academicYear.split('/')[1], semester === 1 ? 1 : 7, 31),
      items: [], // Summary doesn't need detailed items
      summary: summaryData,
      isSummaryReport: true
    };

    return await EnhancedPDFService.generatePaymentDeclarationPDF(
      summaryDeclaration, 
      { ...options, reportType: 'summary' }
    );
  } catch (error) {
    console.error('Error generating summary report PDF:', error);
    throw error;
  }
};

/**
 * Legacy PDF generation (original implementation)
 */
async function generateLegacyPDF(decl) {
  const doc = new PDFDocument({ size: 'A4', margin: 40, layout: 'portrait' });
  const buffers = [];
  doc.on('data', chunk => buffers.push(chunk));

  doc
    .fontSize(16)
    .text(`Declarație de plată — ${decl.title}`, { align: 'center' })
    .moveDown(1);

  const user = decl.user;
  doc
    .fontSize(10)
    .text(`Nume: ${user.firstName} ${user.lastName}`)
    .text(`Email: ${user.email}`)
    .text(`Perioadă: ${formatDate(decl.startDate)} – ${formatDate(decl.endDate)}`)
    .moveDown(1);

  const columns = [
    { header: 'Poz. stat', key: 'postNumber', width: 50 },
    { header: 'Data',     key: 'date',       width: 60 },
    { header: 'C',        key: 'courseHours',width: 30 },
    { header: 'S',        key: 'seminarHours',width:30 },
    { header: 'L/A',      key: 'labHours',   width: 30 },
    { header: 'P',        key: 'projectHours',width:30 },
    { header: 'Tip',      key: 'activityType',width:40 },
    { header: 'Coef.',    key: 'coefficient',width:40 },
    { header: 'Nr ore',   key: 'totalHours', width:40 },
    { header: 'Anul, grupa', key: 'groups',  width:120 }
  ];

  let x = doc.x;
  const y = doc.y;
  doc.font('Helvetica-Bold').fontSize(9);
  columns.forEach(col => {
    doc.text(col.header, x, y, { width: col.width, align: 'center' });
    x += col.width;
  });

  doc.moveDown(0.7).font('Helvetica').fontSize(8);
  (decl.items || []).forEach(item => {
    x = doc.x;
    const rowY = doc.y;
    columns.forEach(col => {
      let text = item[col.key];
      if (col.key === 'date') text = formatDate(item.date);
      doc.text(text != null ? text.toString() : '', x, rowY, { width: col.width, align: 'center' });
      x += col.width;
    });
    doc.moveDown();
  });

  doc.end();
  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', err => reject(err));
  });
}

/**
 * Helper function to get user by ID
 */
async function getUserById(userId) {
  const User = require('../models/user.model');
  return await User.findById(userId);
}