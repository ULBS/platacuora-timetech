const PDFDocument = require('pdfkit');

function formatDate(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

/**
 * @param {Object} decl 
 * @returns {Promise<Buffer>} 
 */
exports.buildDeclarationPDF = async function(decl) {
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
};

const PaymentDeclaration = require('../models/payment-declaration.model');
const PDFService = require('../services/pdf.service');

exports.generatePDF = async (req, res) => {
  try {
    const decl = await PaymentDeclaration.findById(req.params.id)
      .populate('user', 'firstName lastName email')
      .populate('semester', 'name academicYear');

    if (!decl) {
      return res.status(404).json({ message: 'Declarație de plată negăsită' });
    }

    const authorId = decl.user._id.toString();
    const isOwner = authorId === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Acces interzis' });
    }

    const pdfBuffer = await PDFService.buildDeclarationPDF(decl);

    res
      .status(200)
      .set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="po-${decl._id}.pdf"`
      })
      .send(pdfBuffer);

  } catch (err) {
    console.error('Generate PDF error:', err);
    res.status(500).json({ message: err.message });
  }
};


///Trebuie modificat ca sa arata smecher