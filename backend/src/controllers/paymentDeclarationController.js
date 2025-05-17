const { PaymentDeclaration } = require('../models');

exports.createPaymentDeclaration = async (req, res) => {
  try {
    const decl = new PaymentDeclaration(req.body);
    await decl.save();
    res.status(201).json(decl);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getPaymentDeclarations = async (req, res) => {
  try {
    const decls = await PaymentDeclaration.find();
    res.json(decls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPaymentDeclarationById = async (req, res) => {
  try {
    const decl = await PaymentDeclaration.findById(req.params.id);
    if (!decl) return res.status(404).json({ error: 'Declaration not found' });
    res.json(decl);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updatePaymentDeclaration = async (req, res) => {
  try {
    const decl = await PaymentDeclaration.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!decl) return res.status(404).json({ error: 'Declaration not found' });
    res.json(decl);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deletePaymentDeclaration = async (req, res) => {
  try {
    const decl = await PaymentDeclaration.findByIdAndDelete(req.params.id);
    if (!decl) return res.status(404).json({ error: 'Declaration not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.generatePDF = async (req, res) => {
  try {
    const decl = await PaymentDeclaration.findById(req.params.id);
    if (!decl) return res.status(404).json({ error: 'Declaration not found' });
    const pdf = await decl.generatePDF();
    res.json(pdf);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
