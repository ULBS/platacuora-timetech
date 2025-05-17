const { SemesterConfiguration } = require('../models');

exports.createSemesterConfig = async (req, res) => {
  try {
    const config = new SemesterConfiguration(req.body);
    await config.save();
    res.status(201).json(config);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getSemesterConfigs = async (req, res) => {
  try {
    const configs = await SemesterConfiguration.find();
    res.json(configs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSemesterConfigById = async (req, res) => {
  try {
    const config = await SemesterConfiguration.findById(req.params.id);
    if (!config) return res.status(404).json({ error: 'Config not found' });
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateSemesterConfig = async (req, res) => {
  try {
    const config = await SemesterConfiguration.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!config) return res.status(404).json({ error: 'Config not found' });
    res.json(config);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteSemesterConfig = async (req, res) => {
  try {
    const config = await SemesterConfiguration.findByIdAndDelete(req.params.id);
    if (!config) return res.status(404).json({ error: 'Config not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
