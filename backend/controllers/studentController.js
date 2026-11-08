const Student = require('../models/Student');
const mongoose = require('mongoose');

const fieldsAreComplete = ({ studentId, name, email, department, semester, contact }) =>
  [studentId, name, email, department, semester, contact].every((value) => value !== undefined && value !== null && String(value).trim() !== '');

const validateStudent = (data) => {
  if (!fieldsAreComplete(data)) return 'All fields are required';
  if (!/^\S+@\S+\.\S+$/.test(data.email)) return 'Please provide a valid email address';
  const semester = Number(data.semester);
  if (!Number.isInteger(semester) || semester < 1 || semester > 12) return 'Semester must be a whole number between 1 and 12';
  return null;
};

const handleError = (error, res) => {
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0];
    return res.status(409).json({ success: false, message: `${field === 'studentId' ? 'Student ID' : 'Email'} already exists` });
  }
  if (error.name === 'CastError') return res.status(400).json({ success: false, message: 'Invalid student ID' });
  if (mongoose.connection.readyState !== 1 || ['MongooseServerSelectionError', 'MongoNetworkError', 'MongoNetworkTimeoutError'].includes(error.name)) {
    return res.status(503).json({ success: false, message: 'Database temporarily unavailable' });
  }
  if (error.name === 'ValidationError') return res.status(400).json({ success: false, message: Object.values(error.errors)[0].message });
  console.error(error);
  return res.status(500).json({ success: false, message: 'Server error' });
};

exports.getStudents = async (req, res) => {
  try {
    const [count, students] = await Promise.all([
      Student.countDocuments(),
      Student.find().sort({ createdAt: -1 }),
    ]);
    res.json({ success: true, count, students });
  }
  catch (error) { handleError(error, res); }
};
exports.getStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, student });
  } catch (error) { handleError(error, res); }
};
exports.createStudent = async (req, res) => {
  const validationError = validateStudent(req.body || {});
  if (validationError) return res.status(400).json({ success: false, message: validationError });
  try { const student = await Student.create(req.body); res.status(201).json({ success: true, message: 'Student added successfully', student }); }
  catch (error) { handleError(error, res); }
};
exports.updateStudent = async (req, res) => {
  const validationError = validateStudent(req.body || {});
  if (validationError) return res.status(400).json({ success: false, message: validationError });
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, message: 'Student updated successfully', student });
  } catch (error) { handleError(error, res); }
};
exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, message: 'Student deleted successfully' });
  } catch (error) { handleError(error, res); }
};
