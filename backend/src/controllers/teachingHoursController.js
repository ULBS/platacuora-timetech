const { TeachingHours } = require('../models');

exports.createTeachingHours = async (req, res) => {
  try {
    const dup = await TeachingHours.isRecordDuplicate(req.body);
    if (dup) return res.status(409).json({ error: 'Duplicate teaching hours record' });
    const record = new TeachingHours(req.body);
    await record.save();
    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getTeachingHours = async (req, res) => {
  try {
    const hours = await TeachingHours.find();
    res.json(hours);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTeachingHoursById = async (req, res) => {
  try {
    const record = await TeachingHours.findById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateTeachingHours = async (req, res) => {
  try {
    const record = await TeachingHours.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!record) return res.status(404).json({ error: 'Record not found' });
    res.json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteTeachingHours = async (req, res) => {
  try {
    const record = await TeachingHours.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

