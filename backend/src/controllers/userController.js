const { User } = require('../models/user.model');

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-__v');
    res.json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Eroare de server' });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-__v');
    if (!user) {
      return res.status(404).json({ message: 'Utilizator negăsit' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ message: 'Eroare de server' });
  }
};
  
exports.updateUser = async (req, res) => {
  try {
    const { role } = req.body;
    if (role && !['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Rol invalid' });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    );
    if (!user) {
      return res.status(404).json({ message: 'Utilizator negăsit' });
    }
    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Eroare de server' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Utilizator negăsit' });
    }
    res.json({ message: 'Utilizator șters cu succes' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Eroare de server' });
  }
};
